/*
 * 地圖探索：格狀地圖、四向平滑移動、碰撞、多層繪製、傳送、鏡頭、動畫圖塊、粒子、區域色調、
 * NPC／互動物件／可見遭遇對象、踩踏觸發。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, G = V.gfx, S = V.sprites, UI = V.ui, Gm = V.game;
  var TS = G.TS;
  var F = V.field = {};
  F.map = null;        // 執行期地圖 { id, def, pm, layers, ents[] }
  F.player = null;
  F.cam = { x: 0, y: 0, tx: null, ty: null, tween: null };
  F.busy = 0;          // >0 時玩家不可操作（過場／腳本進行中）
  F.time = 0;
  F.shakeT = 0; F.shakeAmp = 0;
  var particles = [], mist = [], darkCanvas = null, refreshT = 0;
  var PLAYER_SPEED = 5.6;

  var KIND_NAMES = { altar: '味診台', gauge: '水位尺', filter: '孢子濾幕', shrine: '種源龕', bed: '床', gather: '採集點', observe: '觀察點', chest: '寶匣', sign: '告示', valve: '活瓣', membrane: '痂膜', hatch: '維修口', hidden: '' };
  F.KIND_NAMES = KIND_NAMES;

  // ======================= 載入 =======================
  function makeActor(type, def, x, y) {
    return {
      type: type, def: def || {}, id: def && def.id, x: x, y: y, px: x * TS, py: y * TS,
      dir: (def && def.dir) || 'down', step: null, queue: null, animT: 0, visible: true,
      solid: true, home: { x: x, y: y }, wanderT: 1 + U.rand() * 2, cool: 0
    };
  }
  function actorSpec(def) {
    var a = def.actor ? V.data.actors[def.actor] : null;
    return def.sprite || (a && a.sprite) || {};
  }
  F.entName = function (e) {
    var a = e.def.actor ? V.data.actors[e.def.actor] : null;
    return e.def.name || (a && a.name) || '';
  };

  F.load = function (mapId, x, y, dir) {
    var def = V.data.maps[mapId];
    if (!def) throw new Error('找不到地圖：' + mapId);
    var pm = V.parseMap(mapId, F.patchedDef(def));
    if (pm.errors.length) console.warn(pm.errors.join('\n'));
    var layers = G.renderMapLayers(pm);
    var m = F.map = { id: mapId, def: def, pm: pm, layers: layers, ents: [] };
    (def.entities || []).forEach(function (ed, i) {
      var pos = V.resolvePos(pm, ed);
      if (!pos) { console.warn('地圖 ' + mapId + ' 的實體 #' + i + ' 沒有有效座標'); return; }
      var e = makeActor(ed.type, ed, pos.x, pos.y);
      e.key = mapId + '/' + (ed.id || (ed.type + i));
      e.id = ed.id || (ed.type + i);
      if (ed.type === 'npc') { e.sheet = S.character(actorSpec(ed)); e.inWater = !!ed.inWater; e.solid = ed.solid != null ? ed.solid : true; }
      else if (ed.type === 'encounter') {
        var enc = V.data.encounters[ed.encounter] || {};
        e.cspec = ed.sprite || enc.sprite || {};
        e.csize = ed.size || 20;
      } else if (ed.type === 'object') {
        e.solid = ed.solid != null ? ed.solid : (ed.kind !== 'observe');
      } else if (ed.type === 'warp' || ed.type === 'trigger') {
        e.solid = false; e.w = ed.w || 1; e.h = ed.h || 1;
      }
      m.ents.push(e);
    });
    var p = F.player = makeActor('player', { id: 'player' }, x, y);
    p.id = 'player'; p.dir = dir || 'down';
    p.sheet = S.character((V.data.start && V.data.start.sprite) || { hair: '#1e2440', cloth: '#D8CCB3', accent: '#2B7D79' });
    Gm.s.map = mapId; Gm.s.x = x; Gm.s.y = y; Gm.s.dir = p.dir;
    F.refresh();
    F.cam.tx = F.cam.ty = null; F.cam.tween = null;
    setupParticles();
    V.audio.ambience(def.ambience || ({ cave: 'cave', indoor: 'indoor', wither: 'wither' }[F.tone()] || 'village'));
    V.emit('mapload', mapId);
  };

  // 擴充：地圖 patches——[{ cond, x, y, ground: ['列', …] }]，條件成立時以 ground 覆寫該矩形（空白＝不改）。
  // 載入地圖時套用；狀態改變後要重新 warp 到同一張地圖才會更新。驗證器只檢查未套用 patches 的基本地形。
  F.patchedDef = function (def) {
    if (!def.patches || !def.patches.length) return def;
    var g = def.ground.slice();
    def.patches.forEach(function (pt) {
      if (!Gm.cond(pt.cond)) return;
      (pt.ground || []).forEach(function (row, dy) {
        var y = pt.y + dy; if (y < 0 || y >= g.length) return;
        var line = g[y].split('');
        for (var dx = 0; dx < row.length; dx++) { var ch = row.charAt(dx); if (ch !== ' ' && pt.x + dx < line.length) line[pt.x + dx] = ch; }
        g[y] = line.join('');
      });
    });
    var out = {}; Object.keys(def).forEach(function (k) { out[k] = def[k]; }); out.ground = g;
    return out;
  };

  F.tone = function () { return (Gm.s.tones && Gm.s.tones[F.map.id]) || F.map.def.tone || 'day'; };

  F.refresh = function () {
    if (!F.map) return;
    var s = Gm.s;
    F.map.ents.forEach(function (e) {
      var ov = s.actorVis[e.key];
      var vis = ov != null ? ov : Gm.cond(e.def.cond);
      if (e.type === 'encounter') {
        e.done = s.encDone[e.key];
        // 穩定／讀完：留在原地變成健康外觀；隔離／失穩：消失（hideOnDone 可強制消失）
        if (e.done && (e.done === 'isolated' || e.done === 'collapsed' || e.def.hideOnDone)) vis = false;
      }
      e.marked = e.def.mark != null && vis && Gm.cond(e.def.mark);
      if (e.type === 'object') e.used = !!s.objUsed[e.key];
      e.visible = vis;
    });
  };

  F.ent = function (id) {
    if (id === 'player') return F.player;
    var es = F.map.ents;
    for (var i = 0; i < es.length; i++) if (es[i].id === id) return es[i];
    return null;
  };
  F.entsAt = function (x, y) {
    var out = [], es = F.map.ents;
    for (var i = 0; i < es.length; i++) {
      var e = es[i]; if (!e.visible) continue;
      if (e.w) { if (x >= e.x && y >= e.y && x < e.x + e.w && y < e.y + e.h) out.push(e); }
      else if (e.x === x && e.y === y) out.push(e);
    }
    return out;
  };
  F.blocked = function (x, y, self) {
    if (!V.tileWalkable(F.map.pm, x, y)) return true;
    var es = F.map.ents;
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      if (e === self || !e.visible || !e.solid) continue;
      if (e.x === x && e.y === y) return true;
      if (e.step && e.step.tx === x && e.step.ty === y) return true;
    }
    var p = F.player;
    if (self !== p && ((p.x === x && p.y === y) || (p.step && p.step.tx === x && p.step.ty === y))) return true;
    return false;
  };

  // ======================= 移動 =======================
  function startStep(a, dir, speed) {
    var d = V.DIRS[dir];
    a.dir = dir;
    a.step = { fx: a.x, fy: a.y, tx: a.x + d.x, ty: a.y + d.y, t: 0, dur: 1 / (speed || 3) };
  }
  function updateActor(a, dt) {
    if (!a.step) {
      if (a.queue && a.queue.steps.length) { startStep(a, a.queue.steps.shift(), a.queue.speed); }
      else if (a.queue) { var q = a.queue; a.queue = null; q.resolve(); }
      else { a.animT = 0; return false; }
    }
    if (!a.step) return false;
    var st = a.step;
    st.t += dt / st.dur;
    a.animT += dt;
    if (st.t >= 1) {
      a.x = st.tx; a.y = st.ty; a.px = a.x * TS; a.py = a.y * TS; a.step = null;
      return true; // 完成一步
    }
    a.px = U.lerp(st.fx, st.tx, st.t) * TS; a.py = U.lerp(st.fy, st.ty, st.t) * TS;
    return false;
  }
  // 過場用：依路徑移動（無視碰撞）
  F.moveActor = function (id, path, speed) {
    var a = F.ent(id);
    if (!a) { console.warn('找不到實體', id); return Promise.resolve(); }
    var steps = V.rules.parsePath(path).slice();
    return new Promise(function (resolve) { a.queue = { steps: steps, speed: speed || 3.5, resolve: resolve }; });
  };

  F.control = function (dt) {
    var p = F.player, I = V.input;
    if (F.busy || p.step || p.queue) return;
    if (Gm.notices.length) { F.script(Gm.flushNotices); return; }
    if (I.pressed('menu') || I.pressed('cancel')) { V.audio.play('confirm'); V.menu.open(); return; }
    if (I.pressed('confirm')) { if (F.interact()) return; }
    var d = I.heldDir();
    if (d) {
      p.dir = d;
      var v = V.DIRS[d], nx = p.x + v.x, ny = p.y + v.y;
      if (!F.blocked(nx, ny, p)) startStep(p, d, PLAYER_SPEED);
    }
  };

  // 以非同步腳本執行一段流程；期間鎖住玩家
  F.script = async function (fn) {
    F.busy++;
    V.input.releaseAll && null;
    try { await fn(); }
    catch (e) { console.error(e); }
    finally { F.busy--; F.refresh(); Gm.checkFolios(); }
  };

  // ======================= 觸發 =======================
  var hazardToastT = 0;
  function onPlayerStep() {
    var p = F.player, s = Gm.s, pm = F.map.pm;
    s.x = p.x; s.y = p.y; s.dir = p.dir; s.stats.steps++;
    // 遭遇外，感官負荷每走 5 格自然 −1
    if (s.load > 0 && s.stats.steps % 5 === 0) s.load = Math.max(0, s.load - 1);
    var gt = V.TILES[pm.ground[p.y * pm.w + p.x]];
    if (gt.sfx && s.stats.steps % 2 === 0) V.audio.play(gt.sfx);
    if (gt.hazard) {
      var hz = (V.data.meta && V.data.meta.ventDamage) || gt.hazard;   // 擴充：meta.ventDamage 覆寫硫氣孔傷害
      s.stamina = Math.max(0, s.stamina - hz);
      V.audio.play('hiss'); F.shake(160, 2);
      if (F.time - hazardToastT > 4) { UI.toast('硫氣灼喉——體力 −' + hz, 'warn'); hazardToastT = F.time; }
      if (s.stamina <= 0) { F.script(function () { return Gm.evacuate('硫氣讓妳眼前一黑。'); }); return; }
    }
    var here = F.entsAt(p.x, p.y), i, e;
    for (i = 0; i < here.length; i++) {
      e = here[i];
      if (e.type === 'warp') { doWarp(e); return; }
    }
    for (i = 0; i < here.length; i++) {
      e = here[i];
      if (e.type === 'trigger') {
        if (e.def.once !== false && s.objUsed[e.key]) continue;
        if (e.def.once !== false) s.objUsed[e.key] = true;
        runEntityScript(e); return;
      }
    }
    checkEncounters();
  }
  // 可見遭遇：預設要走到相鄰格按互動鍵才觸發；只有 auto:true 的對象會在靠近（range 格內）時自動觸發
  function checkEncounters() {
    if (F.busy) return;
    var p = F.player, es = F.map.ents;
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      if (e.type !== 'encounter' || !e.def.auto || !e.visible || e.done || e.cool > 0) continue;
      var r = e.def.range != null ? e.def.range : 1;
      if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= r) { startEncounter(e, true); return; }
    }
  }
  function doWarp(e) {
    var d = e.def;
    F.script(async function () {
      if (d.requires && !Gm.cond(d.requires)) {
        await V.dialogue.lines(d.lockedText || '現在還不能過去。');
        var back = V.opposite[F.player.dir], bv = V.DIRS[back];
        if (!F.blocked(F.player.x + bv.x, F.player.y + bv.y, F.player)) await F.moveActor('player', back.charAt(0).toUpperCase(), PLAYER_SPEED);
        return;
      }
      var tm = V.data.maps[d.to], tpm = V.parseMap(d.to, tm);
      var pos = V.resolvePos(tpm, d, 'tx', 'ty', 'toAt');
      V.audio.play(d.sfx || 'warp');
      await F.warp(d.to, pos.x, pos.y, d.dir || F.player.dir);
    });
  }
  async function runEntityScript(e) {
    var d = e.def;
    await F.script(async function () {
      if (d.cutscene) await V.cutscene.play(d.cutscene);
      if (d.dialogue) await V.dialogue.play(d.dialogue);
      if (d.lines) await V.dialogue.lines(d.lines);
      if (d.actions) await Gm.run(d.actions);
    });
  }
  function startEncounter(e, auto) { F.script(function () { return runEncounter(e, false); }); }
  // 擴充：['engage', 實體id]
  F.engage = function (id) {
    var e = F.ent(id);
    if (!e || e.type !== 'encounter') { console.warn('engage：找不到遭遇實體', id); return Promise.resolve(); }
    return runEncounter(e, true);
  };
  async function runEncounter(e, forced) {
    var p = F.player;
    {
      var enc = V.data.encounters[e.def.encounter] || {};
      if (e.def.before && !forced) await V.dialogue.lines(e.def.before);
      if (!e.def.noConfirm && !forced) {
        var r = await UI.choose(e.def.prompt || enc.approach || ((enc.name || '對象') + '就在前面。'), [
          { id: 'go', label: '靠近', sub: '開始嚐味診療' }, { id: 'no', label: '先不要' }], { index: 0 });
        if (!r || r.id !== 'go') { e.cool = 2; return; }
      }
      e.alert = 0.7; V.audio.play('alert');
      // 互相面對
      var dx = e.x - p.x, dy = e.y - p.y;
      if (dx || dy) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      await U.wait(650);
      var res = await V.battle.start(e.def.encounter, { entity: e });
      Gm.setFlag('last_result', res);
      if (res === 'stabilized' || res === 'isolated' || res === 'collapsed' || res === 'read') { Gm.s.encDone[e.key] = res; }
      else { e.cool = 3; }
      F.refresh();
      var on = e.def.onResult || {};
      if (res !== 'evacuated' && on[res]) await Gm.run(on[res]);
    }
  }

  // ======================= 互動 =======================
  F.interact = function () {
    var p = F.player, v = V.DIRS[p.dir];
    var cands = F.entsAt(p.x + v.x, p.y + v.y).concat(F.entsAt(p.x, p.y));
    for (var i = 0; i < cands.length; i++) if (F.interactWith(cands[i])) return true;
    return false;
  };
  // 與單一實體互動（2D 版由 F.interact 依面向挑選；3D 版由呈現層依距離挑選後直接呼叫）
  F.interactWith = function (e) {
    if (e.type === 'npc') { talk(e); return true; }
    if (e.type === 'object') { F.script(function () { return useObject(e); }); return true; }
    if (e.type === 'encounter') {
      if (!e.done && e.def.dialogue) { talk(e); return true; }   // 擴充：遭遇實體可先播對話（對話裡用 ['engage', 實體id] 開始）
      if (!e.done) { startEncounter(e, false); return true; }
      var calm = e.def.calm || (V.data.encounters[e.def.encounter] || {}).calmText;
      if (calm) { F.script(function () { return V.dialogue.lines(calm); }); return true; }
    }
    return false;
  };
  // 能否互動（3D 版用來顯示互動提示）
  F.canInteract = function (e) {
    if (!e || !e.visible) return false;
    if (e.type === 'npc' || e.type === 'object') return true;
    if (e.type === 'encounter') return !e.done || !!(e.def.calm || (V.data.encounters[e.def.encounter] || {}).calmText);
    return false;
  };
  function talk(e) {
    var d = e.def, p = F.player;
    if (!e.step && !d.fixedDir) e.dir = V.opposite[p.dir];
    F.script(async function () {
      // talk 由上往下取第一個條件成立的項目；都不成立時改用 dialogue，再沒有就用 lines
      var dlg = d.dialogue, name = F.entName(e), hit = false;
      if (d.talk) {
        for (var i = 0; i < d.talk.length; i++) if (Gm.cond(d.talk[i].cond)) { hit = true; dlg = d.talk[i].dialogue; if (d.talk[i].lines) { await V.dialogue.lines(d.talk[i].lines, name); dlg = null; } break; }
      }
      if (dlg) await V.dialogue.play(dlg);
      else if (d.lines && !hit) await V.dialogue.lines(d.lines, name);
      if (d.actions) await Gm.run(d.actions);
    });
  }
  async function useObject(e) {
    var d = e.def, s = Gm.s, Dg = V.dialogue;
    if (d.useCond && !Gm.cond(d.useCond)) { await Dg.lines(d.lockedText || '現在還用不上。'); return; }
    var once = d.once != null ? d.once : (d.kind === 'chest' || d.kind === 'gather' || d.kind === 'observe');
    var used = !!s.objUsed[e.key];
    if (used && once) {
      if (d.kind === 'observe' && !d.usedText) { await Dg.lines(d.text || []); return; }
      await Dg.lines(d.usedText || (d.kind === 'chest' ? '寶匣已經空了。' : d.kind === 'gather' ? '這裡已經採過了。讓它慢慢長回來。' : (d.text || '沒有新的發現。')));
      return;
    }
    if (d.dialogue) await Dg.play(d.dialogue);
    else if (d.text) await Dg.lines(d.text);
    switch (d.kind) {
      case 'shrine': await shrine(e); break;
      case 'bed':
        if (await UI.confirm('要在這裡休息嗎？', '休息', '不用')) {
          await UI.fade('out', 500, '#0b0a0e'); Gm.heal(); Gm.respawnGathers(); V.audio.play('heal'); await U.wait(400); await UI.fade('in', 500);
          UI.toast('體力與感官都恢復了。', 'heal');
        }
        break;
      case 'altar': await V.craft.openAltar(d.name || '味診台'); break;
      case 'chest': V.audio.play('door'); break;
    }
    if (d.items) Object.keys(d.items).forEach(function (id) { Gm.give(id, d.items[id]); });
    U.toArray(d.flags).forEach(function (f) { Gm.setFlag(f, true); });
    if (d.kind === 'observe') { V.audio.play('chime'); }
    if (once || d.items || d.flags) { s.objUsed[e.key] = true; e.used = true; }
    if (d.actions) await Gm.run(d.actions);
  }
  async function shrine(e) {
    var s = Gm.s;
    s.respawn = { map: F.map.id, x: F.player.x, y: F.player.y };
    for (;;) {
      var r = await UI.choose('種源龕的青光安靜地脈動。', [
        { id: 'rest', label: '入庫並歇息', sub: '回復體力與感官，樣本入庫' },
        { id: 'save', label: '記下此刻（存檔）' },
        { id: 'leave', label: '離開' }]);
      if (!r || r.id === 'leave') return;
      if (r.id === 'rest') {
        var n = Gm.bankSamples(); Gm.heal(); Gm.respawnGathers(); V.audio.play('heal');
        UI.toast(n ? '已入庫 ' + n + ' 份樣本。體力與感官恢復。' : '體力與感官恢復。', 'heal');
        V.save.auto();
      } else if (r.id === 'save') { await V.menu.openSaveLoad('save'); }
    }
  }

  // ======================= 傳送 =======================
  F.warp = async function (mapId, x, y, dir, opts) {
    opts = opts || {};
    F.busy++;
    try {
      if (!opts.noFade) await UI.fade('out', 260, '#0b0a0e');
      var prevName = F.map ? F.map.def.name : null;
      F.load(mapId, x, y, dir || (F.player ? F.player.dir : 'down'));
      snapCamera();
      if (!opts.noFade) await UI.fade('in', 260);
      if (F.map.def.name && (F.map.def.name !== prevName || opts.banner)) UI.banner(F.map.def.name, F.map.def.subtitle);
      if (!opts.noSave) V.save.auto();
      var on = U.toArray(F.map.def.onEnter);
      for (var i = 0; i < on.length; i++) {
        var o = on[i];
        if (!Gm.cond(o.cond)) continue;
        if (o.cutscene) await V.cutscene.play(o.cutscene);
        if (o.actions) await Gm.run(o.actions);
      }
    } finally { F.busy--; F.refresh(); }
  };

  // 供其他呈現層（web-rpg-3d）重用的內部流程；2D 版本身不需要
  F._internal = { onPlayerStep: onPlayerStep, updateActor: updateActor, startStep: startStep, checkEncounters: checkEncounters,
    waterFree: waterFree, PLAYER_SPEED: PLAYER_SPEED };

  // ======================= 鏡頭／粒子 =======================
  var view = { w: 320, h: 180 };
  F.setView = function (w, h) { view.w = w; view.h = h; darkCanvas = null; setupParticles(); };
  function camTarget() {
    var p = F.player, c = F.cam;
    var tx = (c.tx != null ? c.tx : p.px + 8), ty = (c.ty != null ? c.ty : p.py + 4);
    return { x: tx, y: ty };
  }
  function clampCam(cx, cy) {
    var mw = F.map.pm.w * TS, mh = F.map.pm.h * TS;
    var x = cx - view.w / 2, y = cy - view.h / 2;
    x = mw <= view.w ? (mw - view.w) / 2 : U.clamp(x, 0, mw - view.w);
    y = mh <= view.h ? (mh - view.h) / 2 : U.clamp(y, 0, mh - view.h);
    return { x: x, y: y };
  }
  function snapCamera() { var t = camTarget(), c = clampCam(t.x, t.y); F.cam.x = c.x; F.cam.y = c.y; }
  F.snapCamera = snapCamera;
  // 過場鏡頭：移到指定格（毫秒），或 null 回到玩家
  F.cameraTo = function (tileX, tileY, ms) {
    var c = F.cam;
    return new Promise(function (resolve) {
      var from = { x: c.x, y: c.y };
      var to;
      if (tileX == null) { c.tx = c.ty = null; var t = camTarget(); to = clampCam(t.x, t.y); }
      else { to = clampCam(tileX * TS + 8, tileY * TS + 8); }
      if (!ms) { if (tileX != null) { c.tx = tileX * TS + 8; c.ty = tileY * TS + 8; } snapCamera(); resolve(); return; }
      c.tween = { from: from, to: to, t: 0, dur: ms / 1000, done: function () {
        if (tileX != null) { c.tx = tileX * TS + 8; c.ty = tileY * TS + 8; } else { c.tx = c.ty = null; }
        resolve();
      } };
    });
  };
  F.shake = function (ms, amp) { F.shakeT = (ms || 300) / 1000; F.shakeAmp = amp || 3; };

  function setupParticles() {
    particles = []; mist = [];
    if (!F.map) return;
    var def = F.map.def, tone = F.tone();
    var pc = def.particles || {};
    var nSp = pc.spores != null ? pc.spores : ({ dusk: 34, cave: 18, dawn: 16, day: 10, indoor: 0, wither: 4 }[tone] || 0);
    var nMist = pc.mist != null ? pc.mist : ({ dawn: 5, dusk: 3, day: 2 }[tone] || 0);
    var i;
    for (i = 0; i < nSp; i++) particles.push({ x: U.rand() * view.w, y: U.rand() * view.h, vx: (U.rand() - 0.5) * 5, vy: -2 - U.rand() * 5, ph: U.rand() * 6.28, s: U.rand() < 0.2 ? 2 : 1 });
    for (i = 0; i < nMist; i++) mist.push({ x: U.rand() * (view.w + 96) - 96, y: U.rand() * view.h, v: 3 + U.rand() * 5 });
  }

  // ======================= 更新 =======================
  F.update = function (dt) {
    if (!F.map) return;
    F.time += dt;
    var p = F.player, es = F.map.ents, i, e;
    var uiOpen = UI.stack.length > 0;
    if (updateActor(p, dt) && !p.queue) onPlayerStep();
    else if (!p.step && !p.queue && F.busy === 0 && !uiOpen) { /* 靜止 */ }
    for (i = 0; i < es.length; i++) {
      e = es[i];
      if (e.cool > 0) e.cool -= dt;
      if (e.alert > 0) e.alert -= dt;
      if (e.type !== 'npc' && e.type !== 'encounter') continue;
      var finished = updateActor(e, dt);
      if (finished && e.type === 'encounter' && e.visible && !e.done) checkEncounters();
      if (!e.visible || e.step || e.queue || F.busy || uiOpen) continue;
      var mv = e.def.move;
      if (!mv || (e.type === 'encounter' && e.done)) continue;
      e.wanderT -= dt;
      if (e.wanderT > 0) continue;
      var iv = mv.interval || [1.2, 3];
      e.wanderT = iv[0] + U.rand() * (iv[1] - iv[0]);
      var dir;
      if (mv.type === 'path') {
        if (!e.pathSteps) { e.pathSteps = V.rules.parsePath(mv.path); e.pathI = 0; }
        dir = e.pathSteps[e.pathI % e.pathSteps.length];
        var dv = V.DIRS[dir];
        if (!F.blocked(e.x + dv.x, e.y + dv.y, e)) { e.pathI++; startStep(e, dir, mv.speed || 2.2); e.wanderT = mv.pause || 0.05; }
        else { e.dir = dir; e.wanderT = 0.4; }
        continue;
      }
      dir = V.DIR_LIST[Math.floor(U.rand() * 4)];
      var d2 = V.DIRS[dir], nx = e.x + d2.x, ny = e.y + d2.y, rad = mv.radius != null ? mv.radius : 2;
      if (Math.abs(nx - e.home.x) > rad || Math.abs(ny - e.home.y) > rad) { e.dir = dir; continue; }
      if (e.inWater || mv.water) { var gch = F.map.pm.ground[ny * F.map.pm.w + nx]; if (!(V.TILES[gch] && V.TILES[gch].water)) continue; }
      if (!F.blocked(nx, ny, e) || ((e.inWater || mv.water) && waterFree(nx, ny, e))) startStep(e, dir, mv.speed || 2);
      else e.dir = dir;
    }
    // 鏡頭
    var c = F.cam;
    if (c.tween) {
      c.tween.t += dt / c.tween.dur;
      var k = U.ease(Math.min(1, c.tween.t));
      c.x = U.lerp(c.tween.from.x, c.tween.to.x, k); c.y = U.lerp(c.tween.from.y, c.tween.to.y, k);
      if (c.tween.t >= 1) { var done = c.tween.done; c.tween = null; done(); }
    } else {
      var t = camTarget(), cc = clampCam(t.x, t.y);
      c.x = cc.x; c.y = cc.y;
    }
    if (F.shakeT > 0) F.shakeT -= dt;
    // 粒子
    for (i = 0; i < particles.length; i++) {
      var q = particles[i];
      q.x += (q.vx + Math.sin(F.time * 0.7 + q.ph) * 4) * dt; q.y += q.vy * dt;
      if (q.y < -2) { q.y = view.h + 2; q.x = U.rand() * view.w; }
      if (q.x < -2) q.x = view.w + 2; else if (q.x > view.w + 2) q.x = -2;
    }
    for (i = 0; i < mist.length; i++) { mist[i].x += mist[i].v * dt; if (mist[i].x > view.w) { mist[i].x = -96; mist[i].y = U.rand() * view.h; } }
    refreshT -= dt;
    if (refreshT <= 0) { refreshT = 0.3; F.refresh(); }
  };
  function waterFree(x, y, self) {
    // 水中實體可以進入深水（一般行走判定為不可走）
    var pm = F.map.pm; if (x < 0 || y < 0 || x >= pm.w || y >= pm.h) return false;
    var es = F.map.ents;
    for (var i = 0; i < es.length; i++) { var e = es[i]; if (e !== self && e.visible && e.solid && e.x === x && e.y === y) return false; }
    return !(F.player.x === x && F.player.y === y);
  }

  // ======================= 繪製 =======================
  var drawList = [];
  function inWaterAt(a) {
    var pm = F.map.pm, x = Math.round(a.px / TS), y = Math.round(a.py / TS);
    if (x < 0 || y < 0 || x >= pm.w || y >= pm.h) return false;
    var t = V.TILES[pm.ground[y * pm.w + x]];
    return !!(t && t.water);
  }
  function drawActor(ctx, a, ox, oy) {
    var x = Math.round(a.px - ox), y = Math.round(a.py - oy);
    if (x < -24 || y < -32 || x > view.w + 8 || y > view.h + 8) return;
    var t = F.time;
    if (a.type === 'player' || a.type === 'npc') {
      var fr = a.step ? (Math.floor(a.animT * 9) % 4) : 0;
      var wet = a.inWater || inWaterAt(a);
      if (!wet) { ctx.fillStyle = 'rgba(10,8,16,0.35)'; ctx.fillRect(x + 3, y + 13, 10, 3); ctx.fillRect(x + 4, y + 12, 8, 1); }
      var h = wet ? 17 : S.FH;
      ctx.drawImage(a.sheet, fr * S.FW, S.dirIndex[a.dir] * S.FH, S.FW, h, x, y - 8 + (wet ? 3 : 0), S.FW, h);
      if (wet) { ctx.fillStyle = 'rgba(190,240,232,0.6)'; var rw = 10 + Math.round(Math.sin(t * 3 + a.x) * 2); ctx.fillRect(x + 8 - rw / 2, y + 11, rw, 1); }
      if (a.marked) drawMark(ctx, x + 5, y - 17 + Math.round(Math.sin(t * 4) * 1.2));
    } else if (a.type === 'encounter') {
      var size = a.csize, f = Math.floor(t * 2.5 + a.x) % 2;
      var spec = a.done ? calmSpec(a.cspec) : a.cspec;
      var img = S.creature(spec, size, f);
      ctx.fillStyle = 'rgba(10,8,16,0.35)'; ctx.fillRect(x + 8 - size * 0.35, y + 13, size * 0.7, 3);
      var jit = (!a.done && Math.sin(t * 17 + a.y) > 0.92) ? 1 : 0;
      ctx.drawImage(img, x + 8 - size / 2 + jit, y + 16 - size + 1);
      if (a.alert > 0) { ctx.fillStyle = '#A64232'; ctx.fillRect(x + 6, y - size + 6, 4, 7); ctx.fillRect(x + 6, y - size + 15, 4, 3); ctx.fillStyle = '#ffd59a'; ctx.fillRect(x + 7, y - size + 7, 2, 5); ctx.fillRect(x + 7, y - size + 16, 2, 1); }
    } else if (a.type === 'object') {
      var k = a.def.kind, fr2 = Math.floor(t * 2 + a.x * 0.7) % 2;
      var once = a.def.once != null ? a.def.once : (k === 'chest' || k === 'gather' || k === 'observe');
      ctx.drawImage(S.object(k, fr2, a.used && once), x, y - 8);
      if (a.marked) drawMark(ctx, x + 5, y - 15 + Math.round(Math.sin(t * 4) * 1.2));
    }
  }
  // 對話標記（實體 mark 條件成立時，頭上的「！」）
  function drawMark(ctx, x, y) {
    ctx.fillStyle = '#1b1420'; ctx.fillRect(x, y, 7, 9); ctx.fillRect(x + 2, y + 9, 3, 1);
    ctx.fillStyle = '#D8CCB3'; ctx.fillRect(x + 1, y + 1, 5, 7);
    ctx.fillStyle = '#D66A32'; ctx.fillRect(x + 3, y + 2, 1, 3); ctx.fillRect(x + 3, y + 6, 1, 1);
  }
  var calmCache = {};
  function calmSpec(spec) {
    var key = JSON.stringify(spec);
    if (!calmCache[key]) { var c = U.clone(spec); c.wild = 0; c.vein = '#73D6D0'; if (c.calmBody) c.body = c.calmBody; calmCache[key] = c; }
    return calmCache[key];
  }

  F.render = function (ctx) {
    if (!F.map) return;
    var m = F.map, L = m.layers, tone = F.tone(), t = F.time;
    var ox = Math.round(F.cam.x), oy = Math.round(F.cam.y);
    if (F.shakeT > 0) { ox += Math.round((U.rand() - 0.5) * 2 * F.shakeAmp); oy += Math.round((U.rand() - 0.5) * 2 * F.shakeAmp); }
    ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.drawImage(L.base, -ox, -oy);
    var i, a;
    for (i = 0; i < L.anims.length; i++) {
      a = L.anims[i];
      var sx = a.x * TS - ox, sy = a.y * TS - oy;
      if (sx < -TS || sy < -TS || sx > view.w || sy > view.h) continue;
      G.drawAnim(ctx, a, sx, sy, t);
    }
    drawList.length = 0;
    for (i = 0; i < m.ents.length; i++) { var e = m.ents[i]; if (e.visible && (e.type === 'npc' || e.type === 'encounter' || e.type === 'object')) drawList.push(e); }
    drawList.push(F.player);
    drawList.sort(function (p, q) { return (p.py - q.py) || (p === F.player ? 1 : -1); });
    for (i = 0; i < drawList.length; i++) drawActor(ctx, drawList[i], ox, oy);
    ctx.drawImage(L.over, -ox, -oy);
    // 色調
    if (tone === 'dawn') { mul(ctx, '#ffd2ad'); grad(ctx, 'rgba(214,106,50,0.22)', 'rgba(214,106,50,0)'); }
    else if (tone === 'dusk') { mul(ctx, '#8b94d6'); }
    else if (tone === 'indoor') { mul(ctx, '#ffe6c8'); }
    else if (tone === 'wither') { mul(ctx, '#d9cdbf'); ctx.fillStyle = 'rgba(150,140,128,0.16)'; ctx.fillRect(0, 0, view.w, view.h); }
    else if (tone === 'cave') { mul(ctx, '#b4aacd'); }
    // 霧
    if (mist.length) {   // 只畫在地圖範圍內（小地圖置中時不飄到外面的黑底上）
      var mb = G.mistBlob();
      ctx.save(); ctx.beginPath(); ctx.rect(-ox, -oy, m.pm.w * TS, m.pm.h * TS); ctx.clip();
      for (i = 0; i < mist.length; i++) ctx.drawImage(mb, Math.round(mist[i].x), Math.round(mist[i].y));
      ctx.restore();
    }
    // 黑暗與光源
    if (tone === 'cave' || tone === 'dusk') {
      if (!darkCanvas) darkCanvas = G.canvas(view.w, view.h);
      var dc = darkCanvas.getContext('2d');
      dc.globalCompositeOperation = 'source-over';
      dc.clearRect(0, 0, view.w, view.h);
      dc.fillStyle = tone === 'cave' ? 'rgba(6,5,12,0.90)' : 'rgba(10,12,40,0.34)';
      dc.fillRect(0, 0, view.w, view.h);
      dc.globalCompositeOperation = 'destination-out';
      var pr = tone === 'cave' ? 58 : 70, flick = Math.round(Math.sin(t * 2.3) * 1.5);
      var ls = G.lightSprite(pr + flick);
      dc.drawImage(ls, Math.round(F.player.px - ox + 8 - pr - flick), Math.round(F.player.py - oy + 2 - pr - flick));
      for (i = 0; i < L.lights.length; i++) {
        var l = L.lights[i], lx = l.x - ox, ly = l.y - oy;
        if (lx < -60 || ly < -60 || lx > view.w + 60 || ly > view.h + 60) continue;
        dc.drawImage(G.lightSprite(l.r), lx - l.r, ly - l.r);
      }
      for (i = 0; i < m.ents.length; i++) {
        var en = m.ents[i];
        if (!en.visible) continue;
        var lr = en.type === 'object' && (en.def.kind === 'shrine' || en.def.kind === 'altar') ? 36 : (en.type === 'encounter' ? 26 : (en.type === 'object' && en.def.kind === 'observe' && !en.used ? 16 : 0));
        if (lr) dc.drawImage(G.lightSprite(lr), Math.round(en.px - ox + 8 - lr), Math.round(en.py - oy + 4 - lr));
      }
      ctx.drawImage(darkCanvas, 0, 0);
    }
    // 孢子
    for (i = 0; i < particles.length; i++) {
      var q = particles[i];
      ctx.globalAlpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + q.ph));
      ctx.fillStyle = tone === 'wither' ? '#d9cf9b' : '#9fe9e2';
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
    }
    ctx.globalAlpha = 1;
  };
  function mul(ctx, color) {
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.fillRect(0, 0, view.w, view.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  var gradCache = {};
  function grad(ctx, top, bottom) {
    var key = top + view.h;
    if (!gradCache[key]) { var g = ctx.createLinearGradient(0, 0, 0, view.h * 0.7); g.addColorStop(0, top); g.addColorStop(1, bottom); gradCache[key] = g; }
    ctx.fillStyle = gradCache[key]; ctx.fillRect(0, 0, view.w, view.h);
  }
})();
