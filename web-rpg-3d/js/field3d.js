/*
 * 3D 地圖探索：把共用的 field.js（格狀邏輯：碰撞、傳送、觸發、對話、物件、遭遇、過場移動）接到 3D 場景。
 *   - 玩家改成連續移動（相對鏡頭方向、類比搖桿），跨進新的一格時呼叫共用的 onPlayerStep（傳送、踩踏觸發、硫氣孔、自動遭遇）。
 *   - NPC 與過場的 move 仍是格狀步進（共用 updateActor），3D 只負責平滑呈現。
 *   - 互動：先看面向的那一格（與 2D 版相同），沒有就挑前方最近的可互動對象；畫面上顯示提示。
 *   - 鏡頭：可旋轉的第三人稱斜上視角；過場的 camera 指令改成移動鏡頭焦點。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE, U = V.util, W = V.world3d, M = V.models3d, X = V.input3d;
  var F = V.field, Gm = V.game, UI = V.ui;
  var F3 = V.field3d = {};
  var TS = 16, SPEED = 4.2, RADIUS = 0.28;
  var cam = { yaw: 0, pitch: 0.62, dist: 8.5, focus: new THREE.Vector3(), tween: null, override: null, zoomK: 1 };
  F3.cam = cam;
  var camera = null, visuals = [], playerVis = null, markTex = null, promptEl = null, target = null;
  var tmpV = new THREE.Vector3();
  var DIR_ANG = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

  F3.camera = function () { return camera; };
  function lpos(a) { return { x: a.px / TS + 0.5, y: a.py / TS + 0.5 }; }

  F3.install = function () {
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
    W.init();
    promptEl = document.getElementById('prompt3d');
    markTex = V.tex3d.mark();
    V.on('mapload', onMapLoad);
    V.on('resize3d', function () { camera.aspect = V.r3d.w / V.r3d.h; camera.updateProjectionMatrix(); });
    camera.aspect = V.r3d.w / V.r3d.h; camera.updateProjectionMatrix();
    // ---- 覆寫共用 field.js 中與呈現有關的部分 ----
    F.control = control;
    F.cameraTo = cameraTo;
    F.snapCamera = function () { snapVisuals(); cam.tween = null; cam.override = null; updateFocus(0, true); };
    F.render = function () {};
  };

  // ======================= 載入地圖 =======================
  function onMapLoad() {
    var m = F.map;
    W.build(m);
    visuals.forEach(function (v) { W.group.remove(v.root); });
    visuals = [];
    m.ents.forEach(function (e) {
      var v = makeVisual(e); if (!v) return;
      visuals.push(v); W.group.add(v.root);
    });
    var st = (V.data.start && V.data.start.sprite) || { hair: '#1e2440', cloth: '#D8CCB3', accent: '#2B7D79', style: 'bob' };
    var ch = M.character(st, { player: true });
    playerVis = { e: F.player, root: ch.root, ch: ch, ang: DIR_ANG[F.player.dir] || 0, pos: new THREE.Vector3(), lastDir: F.player.dir };
    W.group.add(ch.root);
    var p = F.player; p.fx = p.x + 0.5; p.fy = p.y + 0.5;
    var cfg = W.cfg;
    cam.pitch = cfg.pitch || 0.62; cam.baseDist = cfg.dist || 8.5;
    if (cfg.yaw != null) cam.yaw = cfg.yaw;
    cam.override = null; cam.tween = null;
    snapVisuals();
    updateFocus(0, true);
  }

  function makeVisual(e) {
    var v = { e: e, root: new THREE.Group(), ang: DIR_ANG[e.dir] || 0, pos: new THREE.Vector3() };
    if (e.type === 'npc') {
      var a = e.def.actor ? V.data.actors[e.def.actor] : null;
      var spec = e.def.sprite || (a && a.sprite) || {};
      v.ch = M.character(spec, {}); v.root.add(v.ch.root); v.height = v.ch.height;
    } else if (e.type === 'object') {
      if (e.def.kind === 'hidden') return null;
      v.prop = M.prop(e.def.kind, e.def); v.root.add(v.prop.root); v.height = 1;
      v.root.rotation.y = 0;
    } else if (e.type === 'encounter') {
      var enc = V.data.encounters[e.def.encounter] || {};
      var spec2 = e.def.sprite || enc.sprite || {};
      v.cr = V.creatures3d.build(e.def.encounter, spec2);
      var s = (e.def.size || 20) / 20 * (spec2.shape === 'beast' ? 0.75 : 0.85);
      v.cr.root.scale.multiplyScalar(s); v.root.add(v.cr.root); v.height = v.cr.height * s * (spec2.shape === 'beast' ? 1.5 : 1);
      v.spec = spec2; v.calm = 0;
    } else return null;
    var mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, depthTest: false, transparent: true }));
    mk.scale.set(0.42, 0.42, 0.42); mk.renderOrder = 20; mk.visible = false; v.mark = mk; v.root.add(mk);
    return v;
  }
  function placeVis(v, snap) {
    var e = v.e, p = lpos(e);
    var y = W.standHeight(p.x, p.y);
    if (e.type === 'encounter' && v.spec && v.spec.shape === 'mote' && W.waterLevel(p.x, p.y) != null) y = Math.max(y, W.waterLevel(p.x, p.y) - 0.3);
    tmpV.set(p.x, y, p.y);
    if (snap || v.pos.distanceTo(tmpV) > 2.5) v.pos.copy(tmpV); else v.pos.lerp(tmpV, 1 - Math.exp(-(e === F.player ? 22 : 14) * (F3._dt || 0.016)));
    v.root.position.copy(v.pos);
  }
  function snapVisuals() { visuals.forEach(function (v) { placeVis(v, true); }); if (playerVis) placeVis(playerVis, true); }

  // ======================= 操作 =======================
  function control(dt) {
    var p = F.player, I = V.input;
    if (F.busy || p.step || p.queue) return;
    if (Gm.notices.length) { F.script(Gm.flushNotices); return; }
    if (I.pressed('menu') || I.pressed('cancel')) { V.audio.play('confirm'); V.menu.open(); return; }
    if (I.pressed('confirm')) { var t = pickTarget(); if (t && F.interactWith(t)) { faceTo(t); return; } }
    if (p.fx == null || Math.floor(p.fx) !== p.x || Math.floor(p.fy) !== p.y) { p.fx = p.x + 0.5; p.fy = p.y + 0.5; }
    var mv = X.moveVec();
    if (!mv) { p.moving3d = 0; return; }
    var sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    var wx = cy * mv.x + sy * mv.y, wz = -sy * mv.x + cy * mv.y;
    var mag = Math.min(1, Math.hypot(wx, wz)); if (mag < 0.01) { p.moving3d = 0; return; }
    var sp = SPEED * (mv.analog ? Math.max(0.35, mag) : 1) * dt;
    var nx = wx / Math.hypot(wx, wz), nz = wz / Math.hypot(wx, wz);
    move(p, nx * sp, nz * sp);
    p.moving3d = mv.analog ? mag : 1;
    playerVis.targetAng = Math.atan2(nx, nz);
    p.dir = Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'right' : 'left') : (nz > 0 ? 'down' : 'up');
    playerVis.lastDir = p.dir;
    var tx = Math.floor(p.fx), ty = Math.floor(p.fy);
    p.px = (p.fx - 0.5) * TS; p.py = (p.fy - 0.5) * TS;
    if (tx !== p.x || ty !== p.y) {
      p.x = tx; p.y = ty;
      F._internal.onPlayerStep();
    }
  }
  function blocked(tx, ty, start) {
    if (start[tx + ',' + ty]) return false;
    return F.blocked(tx, ty, F.player);
  }
  function coverTiles(x, y) {
    var o = {};
    for (var ty = Math.floor(y - RADIUS); ty <= Math.floor(y + RADIUS); ty++) for (var tx = Math.floor(x - RADIUS); tx <= Math.floor(x + RADIUS); tx++) o[tx + ',' + ty] = 1;
    return o;
  }
  function move(p, dx, dz) {
    var start = coverTiles(p.fx, p.fy), e = 1e-3, row, col;
    start[Math.floor(p.fx) + ',' + Math.floor(p.fy)] = 0;   // 自己所在的格永遠視為可站
    var x = p.fx + dx;
    if (dx) {
      col = Math.floor(dx > 0 ? x + RADIUS : x - RADIUS);
      for (row = Math.floor(p.fy - RADIUS + e); row <= Math.floor(p.fy + RADIUS - e); row++) {
        if (col !== Math.floor(p.fx) && blocked(col, row, start)) { x = dx > 0 ? col - RADIUS - e : col + 1 + RADIUS + e; break; }
      }
    }
    p.fx = x;
    var y = p.fy + dz;
    if (dz) {
      row = Math.floor(dz > 0 ? y + RADIUS : y - RADIUS);
      for (col = Math.floor(p.fx - RADIUS + e); col <= Math.floor(p.fx + RADIUS - e); col++) {
        if (row !== Math.floor(p.fy) && blocked(col, row, start)) { y = dz > 0 ? row - RADIUS - e : row + 1 + RADIUS + e; break; }
      }
    }
    p.fy = y;
    // 斜角：只碰到角落的格時把人推開，避免卡進牆角
    var cx = Math.floor(p.fx), cyy = Math.floor(p.fy);
    if (F.blocked(cx, cyy, p) && !start[cx + ',' + cyy] && (cx !== p.x || cyy !== p.y)) { p.fx -= dx; p.fy -= dz; }
  }
  function faceTo(e) {
    var p = F.player, dx = e.x - p.x, dy = e.y - p.y;
    if (dx || dy) { playerVis.targetAng = Math.atan2(dx, dy); }
  }
  // 互動對象：先面向的那一格（2D 相同），再前方最近的
  function pickTarget() {
    var p = F.player; if (!p) return null;
    var v = V.DIRS[p.dir];
    var c = F.entsAt(p.x + v.x, p.y + v.y).concat(F.entsAt(p.x, p.y));
    for (var i = 0; i < c.length; i++) if (F.canInteract(c[i])) return c[i];
    var px = p.fx != null ? p.fx : p.x + 0.5, py = p.fy != null ? p.fy : p.y + 0.5;
    var ang = playerVis ? playerVis.ang : 0, fx = Math.sin(ang), fz = Math.cos(ang);
    var best = null, bs = 1e9;
    F.map.ents.forEach(function (e) {
      if (!F.canInteract(e)) return;
      var ex = e.x + 0.5 - px, ey = e.y + 0.5 - py, d = Math.hypot(ex, ey);
      if (d > 1.75) return;
      var dot = d > 0.01 ? (ex * fx + ey * fz) / d : 1;
      if (dot < 0.15 && d > 0.9) return;
      var s = d - dot * 0.6; if (s < bs) { bs = s; best = e; }
    });
    return best;
  }
  F3.pickTarget = pickTarget;

  // ======================= 鏡頭 =======================
  function cameraTo(tileX, tileY, ms) {
    return new Promise(function (resolve) {
      var to = tileX == null ? null : new THREE.Vector3(tileX + 0.5, W.standHeight(tileX + 0.5, tileY + 0.5) + 0.8, tileY + 0.5);
      if (!ms) { cam.override = to; cam.tween = null; updateFocus(0, true); resolve(); return; }
      cam.tween = { from: cam.focus.clone(), to: to, t: 0, dur: ms / 1000, done: resolve };
    });
  }
  function playerFocus() { return tmpV.set(playerVis.pos.x, playerVis.pos.y + 0.85, playerVis.pos.z).clone(); }
  function updateFocus(dt, snap) {
    if (!playerVis) return;
    var goal;
    if (cam.tween) {
      var tw = cam.tween; tw.t += dt / tw.dur;
      var k = U.ease(Math.min(1, tw.t));
      var dest = tw.to || playerFocus();
      cam.focus.copy(tw.from).lerp(dest, k);
      if (tw.t >= 1) { cam.tween = null; cam.override = tw.to; tw.done(); }
      return;
    }
    goal = cam.override || playerFocus();
    if (snap) cam.focus.copy(goal); else cam.focus.lerp(goal, 1 - Math.exp(-8 * dt));
  }
  function placeCamera(dt) {
    var c = X.takeCam();
    var free = V.scene === 'field' && !V.ui.has('battle');
    if (free) {
      cam.yaw -= c.dx * 0.006 + X.keysRot * dt * 1.8 / Math.max(0.25, V.runtime.speed);
      cam.pitch = U.clamp(cam.pitch + c.dy * 0.003, 0.28, 1.3);
      cam.zoomK = U.clamp(cam.zoomK + c.zoom * 0.08, 0.55, 1.5);
    }
    var dist = (cam.baseDist || 9.5) * cam.zoomK;
    if (V.r3d.h > V.r3d.w) dist *= 1.25;   // 直向畫面看得到的左右範圍較窄，拉遠一點
    var f = cam.focus, hd = Math.cos(cam.pitch) * dist;
    camera.position.set(f.x + Math.sin(cam.yaw) * hd, f.y + Math.sin(cam.pitch) * dist, f.z + Math.cos(cam.yaw) * hd);
    // 不要鑽進地形
    var gh = W.groundHeight(camera.position.x, camera.position.z);
    if (camera.position.y < gh + 0.8) camera.position.y = gh + 0.8;
    if (F.shakeT > 0) { var a = F.shakeAmp * 0.025; camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a; }
    camera.lookAt(f);
  }

  // ======================= 每幀 =======================
  F3.render = function (dt, raw) {
    if (!playerVis) return;
    F3._dt = raw;
    var t = W.time, p = F.player;
    // 玩家外力移動（過場、退一步）時同步連續座標
    if (p.step || p.queue) { p.fx = p.px / TS + 0.5; p.fy = p.py / TS + 0.5; }
    if (p.dir !== playerVis.lastDir) { playerVis.targetAng = DIR_ANG[p.dir]; playerVis.lastDir = p.dir; }
    if (p.step) playerVis.targetAng = DIR_ANG[p.dir];
    placeVis(playerVis);
    var ta = playerVis.targetAng != null ? playerVis.targetAng : playerVis.ang;
    playerVis.ang += angDiff(ta, playerVis.ang) * Math.min(1, raw * 14);
    playerVis.root.rotation.y = playerVis.ang;
    var moving = p.step ? 1 : (p.moving3d || 0);
    playerVis.ch.update(raw * (V.runtime.speed > 1 ? 1 : 1), moving, t);
    wade(playerVis);
    if (!(V.input3d.moveVec()) || F.busy || V.ui.top()) p.moving3d = 0;
    // 實體
    var showMarks = true;
    visuals.forEach(function (v) {
      var e = v.e;
      v.root.visible = !!e.visible;
      if (!e.visible) return;
      placeVis(v);
      if (v.ch) {
        var ta2 = DIR_ANG[e.dir] || 0;
        v.ang += angDiff(ta2, v.ang) * Math.min(1, raw * 10);
        v.root.rotation.y = v.ang;
        v.ch.update(raw, e.step ? 0.7 : 0, t);
        wade(v);
      } else if (v.prop) {
        v.prop.update(raw, t, !!e.used);
      } else if (v.cr) {
        var done = e.done === 'stabilized' || e.done === 'read';
        v.calm += ((done ? 1 : 0) - v.calm) * Math.min(1, raw * 2);
        v.cr.update(raw, t, { wild: v.spec.wild || 0, calm: v.calm, hurt: 0, good: 0 });
        // 朝向玩家
        var dx = playerVis.pos.x - v.pos.x, dz = playerVis.pos.z - v.pos.z;
        if (Math.hypot(dx, dz) < 6) { v.ang += angDiff(Math.atan2(dx, dz), v.ang) * Math.min(1, raw * 2); v.root.rotation.y = v.ang; }
      }
      v.mark.visible = showMarks && !!e.marked;
      if (v.mark.visible) v.mark.position.y = (v.height || 1.2) + 0.45 + Math.sin(t * 3) * 0.06;
    });
    updateFocus(dt);
    placeCamera(raw);
    W.update(raw, cam.focus, camera);
    V.r3d.renderer.render(W.scene, camera);
    updatePrompt();
  };
  function wade(v) {
    var wl = W.waterLevel(v.pos.x, v.pos.z);
    if (v.ch.shadow) v.ch.shadow.visible = wl == null;
  }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  // 互動提示：地圖空閒時顯示在對象上方
  var PROMPT_VERB = { npc: '交談', shrine: '種源龕', altar: '調劑', observe: '觀察', gather: '採集', bed: '休息', chest: '打開', gauge: '查看', sign: '閱讀', encounter: '靠近' };
  function updatePrompt() {
    var idle = V.scene === 'field' && !F.busy && !V.ui.top() && !F.player.step && !F.player.queue;
    target = idle ? pickTarget() : null;
    if (!target) { if (!promptEl.hidden) promptEl.hidden = true; return; }
    var v = null;
    for (var i = 0; i < visuals.length; i++) if (visuals[i].e === target) { v = visuals[i]; break; }
    var pos = v ? v.pos.clone() : new THREE.Vector3(target.x + 0.5, W.standHeight(target.x + 0.5, target.y + 0.5), target.y + 0.5);
    pos.y += (v && v.height ? v.height : 1) + 0.25;
    pos.project(camera);
    var x = (pos.x * 0.5 + 0.5) * V.r3d.w, y = (-pos.y * 0.5 + 0.5) * V.r3d.h;
    var verb = target.type === 'npc' ? PROMPT_VERB.npc : target.type === 'encounter' ? (target.done ? '查看' : '靠近') : (PROMPT_VERB[target.def.kind] || '查看');
    var name = F.entName(target) || (target.type === 'encounter' ? ((V.data.encounters[target.def.encounter] || {}).name || '') : (target.def.name || F.KIND_NAMES[target.def.kind] || ''));
    var key = V.input.device() === 'touch' || document.body.classList.contains('touch-enabled') ? 'A' : 'Z';
    var html = '<b>' + key + '</b>' + verb + (name ? '<span>' + U.esc(name) + '</span>' : '');
    if (promptEl._h !== html) { promptEl.innerHTML = html; promptEl._h = html; }
    promptEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-100%)';
    promptEl.hidden = false;
  }
  F3.target = function () { return target; };
  F3.playerVisual = function () { return playerVis; };
  F3.visuals = function () { return visuals; };
  // 世界座標 → 螢幕座標（測試用）
  F3.project = function (v3) { var q = v3.clone().project(camera); return { x: (q.x * 0.5 + 0.5) * V.r3d.w, y: (-q.y * 0.5 + 0.5) * V.r3d.h, z: q.z }; };
})();
