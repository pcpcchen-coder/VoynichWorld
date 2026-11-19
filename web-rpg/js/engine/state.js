/*
 * 遊戲狀態與規則執行：旗標、物品、任務、成長、四向度、連通度、葉帖條件，以及動作執行器。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, R = V.rules;
  var Gm = V.game = {};
  Gm.s = null;

  function D() { return V.data; }

  Gm.newState = function () {
    var st = D().start || {};
    var s = {
      flags: U.clone(st.flags) || {},
      items: {}, unbanked: {}, quests: {},
      level: st.level || 1, exp: 0, stamina: 0, load: 0,
      skills: (st.skills || []).slice(),
      folios: {}, folioNotified: {},
      dims: { bo: 0, fen: 0, rong: 0, lu: 0 },
      conn: {}, vein: {},
      stats: { stabilized: 0, isolated: 0, collapsed: 0, retreated: 0, evacuated: 0, encounters: 0, crafted: 0, steps: 0, folios: 0 },
      playtime: 0,
      map: st.map, x: st.x, y: st.y, dir: st.dir || 'down',
      respawn: st.respawn || { map: st.map, x: st.x, y: st.y },
      tones: {}, actorVis: {}, seen: {}, glossary: {}, objUsed: {}, encDone: {},
      partyName: st.name || '珂潾'
    };
    if (st.dims) Object.keys(st.dims).forEach(function (k) { s.dims[Gm.dimKey(k)] = st.dims[k]; });
    Object.keys(D().zones || {}).forEach(function (z) {
      var zd = D().zones[z];
      s.conn[z] = zd.start != null ? zd.start : 50;
      if (zd.vein) s.vein[z] = zd.vein;
    });
    if (st.conn) Object.keys(st.conn).forEach(function (z) { s.conn[Gm.zoneKey(z)] = st.conn[z]; });
    Gm.s = s;
    if (st.exp) s.exp = st.exp;
    // 依見識推回等級
    s.level = Math.max(s.level, Gm.levelForExp(s.exp));
    s.stamina = Gm.maxStamina(); s.load = 0;
    levels().forEach(function (row) { if (row.level <= s.level) U.toArray(row.learn).forEach(function (sk) { if (s.skills.indexOf(sk) < 0) s.skills.push(sk); }); });
    (st.glossary || []).forEach(function (g) { s.glossary[g] = true; });
    Object.keys(st.items || {}).forEach(function (id) { s.items[id] = st.items[id]; });
    (st.quests || []).forEach(function (q) { s.quests[q] = { status: 'active', stage: 0 }; });
    return s;
  };

  // ---- 成長 ----
  function levels() { var l = D().levels; return (l && l.length) ? l : [{ level: 1, exp: 0, stamina: 30, load: 40 }]; }
  Gm.levels = levels;
  Gm.levelRow = function (lv) {
    var L = levels(), row = L[0];
    for (var i = 0; i < L.length; i++) if (L[i].level <= lv) row = L[i];
    return row;
  };
  Gm.levelForExp = function (exp) {
    var L = levels(), lv = L[0].level;
    for (var i = 0; i < L.length; i++) if (exp >= L[i].exp) lv = L[i].level;
    return lv;
  };
  Gm.nextLevelExp = function () {
    var L = levels();
    for (var i = 0; i < L.length; i++) if (L[i].level === Gm.s.level + 1) return L[i].exp;
    return null;
  };
  Gm.maxStamina = function () { return Gm.levelRow(Gm.s.level).stamina; };
  Gm.maxLoad = function () { return Gm.levelRow(Gm.s.level).load; };
  Gm.loadPct = function () { return Math.round(Gm.s.load / Gm.maxLoad() * 100); };
  Gm.hasSkill = function (id) { return Gm.s.skills.indexOf(id) >= 0; };
  Gm.learn = function (id, silent) {
    if (Gm.hasSkill(id)) return;
    Gm.s.skills.push(id);
    var sk = D().skills[id];
    if (!silent && sk) {
      V.audio.play('level');
      Gm.notices.push({ title: '手技', pages: [{ title: '學會手技：' + sk.name, text: sk.desc || '' }] });
    }
  };
  // 等待顯示的說明視窗（升級、學會手技）；地圖空閒時由 field 依序彈出
  Gm.notices = [];
  Gm.flushNotices = async function () {
    while (Gm.notices.length) { var n = Gm.notices.shift(); await V.ui.pages(n.title, n.pages, { skippable: true }); }
  };
  // 教學：data.tutorials[id] = { title, pages:[{title,text|html}] }；看過的可在選單「教學」重看
  Gm.showTutorial = async function (id, force) {
    var t = D().tutorials[id];
    if (!t) { console.warn('找不到教學', id); return; }
    if (Gm.s.seen['tut:' + id] && !force) return;
    Gm.s.seen['tut:' + id] = true;
    await V.ui.pages(t.title, t.pages, { skippable: true });
  };
  // 使用消耗品：item.use = { stamina, load, clearResidue, text }；回傳效果說明
  Gm.useItem = function (it) {
    var u = it.use || {}, s = Gm.s, out = [];
    if (u.stamina) { s.stamina = U.clamp(s.stamina + u.stamina, 0, Gm.maxStamina()); out.push('體力 ' + (u.stamina > 0 ? '+' : '') + u.stamina); }
    if (u.load) { Gm.addLoad(u.load); out.push('感官負荷 ' + (u.load > 0 ? '+' : '') + u.load); }
    if (u.clearResidue) out.push('味覺殘留清除');
    return out.length ? '（' + out.join('・') + '）' : '';
  };
  Gm.addExp = function (n) {
    var s = Gm.s; if (!n) return;
    s.exp += n;
    var target = Gm.levelForExp(s.exp);
    while (s.level < target) {
      s.level++;
      var row = Gm.levelRow(s.level);
      s.stamina = Gm.maxStamina(); s.load = 0;   // 升級：體力回滿、感官負荷歸零
      V.audio.play('level');
      V.ui.toast('等級提升至 ' + s.level + '　體力上限 ' + row.stamina + '・負荷上限 ' + row.load, 'level');
      var learned = [];
      U.toArray(row.learn).forEach(function (sk) { if (!Gm.hasSkill(sk)) { Gm.learn(sk, true); learned.push(sk); } });
      // 畫面顯示手技說明：排入佇列，於地圖上空閒時彈出（不打斷遭遇結算）
      Gm.notices.push({ title: '等級 ' + s.level, pages: [{ title: '等級提升至 ' + s.level,
        html: '<p>體力上限 ' + row.stamina + '・感官負荷上限 ' + row.load + '。體力回滿，感官負荷歸零。</p>' +
          learned.map(function (id) { var k = D().skills[id] || { name: id }; return '<h3>學會手技：' + V.util.esc(k.name) + '</h3><p>' + V.util.esc(k.desc || '') + '</p>'; }).join('') }] });
      V.emit('levelup', s.level);
    }
  };

  // ---- 旗標 ----
  Gm.flag = function (n) { return Gm.s.flags[n]; };
  Gm.setFlag = function (n, v) { Gm.s.flags[n] = v === undefined ? true : v; Gm.checkFolios(); V.emit('flag', n); };

  // ---- 物品 ----
  Gm.item = function (id) { return D().items[id]; };
  Gm.count = function (id) { return Gm.s.items[id] || 0; };
  Gm.give = function (id, n, silent) {
    n = n == null ? 1 : n;
    var it = Gm.item(id);
    if (!it) { console.warn('未知物品', id); return; }
    Gm.s.items[id] = Gm.count(id) + n;
    if (it.cat === 'sample') Gm.s.unbanked[id] = (Gm.s.unbanked[id] || 0) + n;
    if (!silent) { V.audio.play('item'); V.ui.toast('取得　' + it.name + (n > 1 ? ' ×' + n : ''), 'item', it.icon); }
    Gm.checkFolios();
  };
  Gm.take = function (id, n, silent) {
    n = n == null ? 1 : n;
    var have = Gm.count(id), k = Math.min(have, n);
    Gm.s.items[id] = have - k;
    if (Gm.s.items[id] <= 0) delete Gm.s.items[id];
    if (Gm.s.unbanked[id]) { Gm.s.unbanked[id] = Math.max(0, Gm.s.unbanked[id] - k); if (!Gm.s.unbanked[id]) delete Gm.s.unbanked[id]; }
    if (!silent && k) { var it = Gm.item(id); V.ui.toast('交出　' + (it ? it.name : id) + (k > 1 ? ' ×' + k : ''), 'take'); }
    return k;
  };
  Gm.bankSamples = function () {
    var n = 0; Object.keys(Gm.s.unbanked).forEach(function (k) { n += Gm.s.unbanked[k]; });
    Gm.s.unbanked = {};
    return n;
  };
  Gm.loseUnbanked = function (ratio) {
    var lost = [];
    Object.keys(Gm.s.unbanked).forEach(function (id) {
      var k = Math.floor(Gm.s.unbanked[id] * ratio);   // 未入庫樣本失去一半（無條件捨去）
      if (k > 0) { Gm.take(id, k, true); lost.push((Gm.item(id) || {}).name + ' ×' + k); }
    });
    Gm.s.unbanked = {};
    return lost;
  };

  // ---- 任務 ----
  Gm.quest = function (id) { return D().quests[id]; };
  Gm.questStatus = function (id) { var q = Gm.s.quests[id]; return q ? q.status : 'none'; };
  Gm.questStageIndex = function (id, stageId) {
    var q = Gm.quest(id); if (!q) return -1;
    for (var i = 0; i < q.stages.length; i++) if (q.stages[i].id === stageId) return i;
    var n = Number(stageId); return isNaN(n) ? -1 : n;
  };
  Gm.questAct = function (id, what) {
    var q = Gm.quest(id); if (!q) { console.warn('未知任務', id); return; }
    var cur = Gm.s.quests[id];
    if (!what || what === 'start') {
      if (cur) return;
      Gm.s.quests[id] = { status: 'active', stage: 0 };
      V.audio.play('quest'); V.ui.toast((q.type === 'side' ? '支線' : '主線') + '・新任務：' + q.name, 'quest');
      return;
    }
    if (what === 'done') {
      if (cur && cur.status === 'done') return;
      Gm.s.quests[id] = { status: 'done', stage: q.stages.length - 1 };
      V.audio.play('quest'); V.ui.toast('任務完成：' + q.name, 'quest');
      var rw = q.rewards || {};
      if (rw.exp) Gm.addExp(rw.exp);
      Object.keys(rw.items || {}).forEach(function (it) { Gm.give(it, rw.items[it]); });
      Object.keys(rw.flags || {}).forEach(function (f) { Gm.setFlag(f, rw.flags[f]); });
      Object.keys(rw.dims || {}).forEach(function (d) { Gm.addDim(d, rw.dims[d]); });
      Object.keys(rw.conn || {}).forEach(function (z) { Gm.addConn(z, rw.conn[z]); });
      return;
    }
    var idx = Gm.questStageIndex(id, what);
    if (idx < 0) { console.warn('任務 ' + id + ' 沒有階段 ' + what); return; }
    if (!cur) Gm.s.quests[id] = cur = { status: 'active', stage: 0 };
    if (cur.status === 'done') return;
    if (idx <= cur.stage) return;
    cur.stage = idx;
    V.audio.play('quest'); V.ui.toast('任務更新：' + q.stages[idx].text, 'quest');
  };

  // ---- 四向度與連通度 ----
  // 四向度代號：bo／fen／rong／lu，也接受劇本代號 axis.sow／axis.burn／axis.merge／axis.record 與 sow／burn／merge／record、播／焚／融／錄
  Gm.dimKey = function (k) { return R.dimKey(k); };
  // 連通度代號：區域 id，也接受 world.connectivity.區域id
  Gm.zoneKey = function (z) { return R.zoneKey(z, 'connectivity'); };
  Gm.addDim = function (k, n) { k = Gm.dimKey(k); if (Gm.s.dims[k] == null) Gm.s.dims[k] = 0; Gm.s.dims[k] += n; };
  Gm.addConn = function (z, n) { z = Gm.zoneKey(z); Gm.s.conn[z] = U.clamp((Gm.s.conn[z] != null ? Gm.s.conn[z] : 50) + n, 0, 100); };
  // 脈況（味變→霧退→流慢→封脈→乾化）：world.veinstate.區域id 或區域 id
  Gm.setVein = function (z, stage) { z = R.zoneKey(z, 'veinstate'); Gm.s.vein[z] = stage; V.emit('vein', z); };
  Gm.vein = function (z) { z = R.zoneKey(z, 'veinstate'); return Gm.s.vein[z] || ((D().zones[z] || {}).vein) || R.VEIN_STAGES[0]; };

  // ---- 葉帖 ----
  Gm.folioConds = function (id) {
    var f = D().folios[id]; if (!f) return [];
    var c = f.conditions || {}, out = [];
    [['observe', '觀察'], ['sample', '取樣'], ['diagnose', '診斷']].forEach(function (p) {
      if (c[p[0]]) out.push({ kind: p[0], label: p[1], flag: c[p[0]], done: R.isFlagRef(c[p[0]]) ? !!Gm.s.flags[c[p[0]]] : Gm.cond(c[p[0]]), hint: (f.hints || {})[p[0]] });
    });
    return out;
  };
  Gm.folioReady = function (id) {
    if (Gm.s.folios[id]) return false;
    var cs = Gm.folioConds(id); if (!D().folios[id]) return false;
    for (var i = 0; i < cs.length; i++) if (!cs[i].done) return false;
    return true;
  };
  Gm.checkFolios = function () {
    if (!Gm.s) return;
    Object.keys(D().folios).forEach(function (id) {
      if (!Gm.s.folioNotified[id] && Gm.folioReady(id)) {
        Gm.s.folioNotified[id] = true;
        if (V.ui && V.ui.toast) V.ui.toast('葉帖 ' + id + '〈' + D().folios[id].name + '〉可以繪製了（選單 → 葉帖）', 'folio');
      }
    });
  };
  Gm.drawFolio = function (id) {
    var f = D().folios[id]; if (!f || !Gm.folioReady(id)) return false;
    Gm.s.folios[id] = { at: Math.floor(Gm.s.playtime) };
    Gm.s.stats.folios = Object.keys(Gm.s.folios).length;
    var rw = f.reward || {};
    Gm.addExp(rw.exp != null ? rw.exp : 10);
    Gm.addDim('lu', rw.lu != null ? rw.lu : 1);
    Object.keys(rw.flags || {}).forEach(function (k) { Gm.setFlag(k, rw.flags[k]); });
    return true;
  };

  // ---- 條件 ----
  Gm.ctx = {
    flag: function (n) { return Gm.s.flags[n]; },
    item: function (id) { return Gm.count(id); },
    questStatus: function (id) { return Gm.questStatus(id); },
    questStage: function (id) { var q = Gm.s.quests[id]; return q ? q.stage : -1; },
    questStageId: function (id) { var q = Gm.s.quests[id], d = Gm.quest(id); return q && d && d.stages[q.stage] ? d.stages[q.stage].id : null; },
    questStageIndex: function (id, st) { return Gm.questStageIndex(id, st); },
    level: function () { return Gm.s.level; },
    dim: function (k) { return Gm.s.dims[Gm.dimKey(k)] || 0; },
    conn: function (z) { return Gm.s.conn[Gm.zoneKey(z)] || 0; },
    vein: function (z) { return Gm.vein(z); },
    seen: function (k) { return !!Gm.s.seen[k]; },
    folio: function (id) { return !!Gm.s.folios[id]; },
    folioReady: function (id) { return Gm.folioReady(id); },
    stamina: function () { return Gm.s.stamina; },
    load: function () { return Gm.loadPct(); }
  };
  Gm.cond = function (c) {
    try { return R.evalCond(c, Gm.ctx); } catch (e) { console.error(e); return false; }
  };
  Gm.tpl = function (t) { return R.template(t, Gm.ctx); };

  // ---- 體力／負荷 ----
  Gm.heal = function (st, ld) {
    var s = Gm.s;
    s.stamina = st == null ? Gm.maxStamina() : Math.min(Gm.maxStamina(), s.stamina + st);
    s.load = ld == null ? 0 : Math.max(0, s.load - ld);
  };
  // 感官負荷以「點數」計（上限見等級表 load 欄）；百分比用 loadPct()
  Gm.addLoad = function (n) { Gm.s.load = U.clamp(Gm.s.load + n, 0, Gm.maxLoad()); };
  Gm.hurt = function (n) { Gm.s.stamina = Math.max(0, Gm.s.stamina - n); };

  // 地圖上體力歸零：撤離回種源龕
  Gm.evacuate = async function (reason) {
    var s = Gm.s;
    s.stats.evacuated++;
    var lost = Gm.loseUnbanked(0.5);
    await V.ui.fade('out', 600, '#0b0a0e');
    s.stamina = Math.max(1, Math.floor(Gm.maxStamina() / 2)); s.load = 0;   // 回到最近碰過的種源龕，體力回復一半
    await V.field.warp(s.respawn.map, s.respawn.x, s.respawn.y, 'down', { noFade: true });
    await V.ui.fade('in', 600);
    var lines = [(reason || '體力耗盡。') + '珂潾被帶回最近的種源龕。'];
    lines.push(lost.length ? '途中遺失了尚未入庫的樣本：' + lost.join('、') + '。' : '還好，沒有遺失樣本。');
    await V.dialogue.lines(lines);
  };

  // ======================= 動作執行器 =======================
  Gm.run = async function (list) {
    list = list || [];
    if (list.length && !Array.isArray(list[0])) list = [list]; // 允許單一動作
    for (var i = 0; i < list.length; i++) await Gm.do(list[i]);
  };
  Gm.do = async function (a) {
    var n = a[0];
    switch (n) {
      case 'flag': Gm.setFlag(a[1], a.length > 2 ? a[2] : true); break;
      case 'unflag': delete Gm.s.flags[a[1]]; break;
      case 'addflag': Gm.setFlag(a[1], (Number(Gm.s.flags[a[1]]) || 0) + (a[2] == null ? 1 : a[2])); break;
      case 'give': Gm.give(a[1], a[2]); break;
      case 'take': Gm.take(a[1], a[2]); break;
      case 'quest': Gm.questAct(a[1], a[2]); break;
      case 'encounter': {
        var res = await V.battle.start(a[1], {});
        Gm.setFlag('last_result', res);
        break;
      }
      case 'warp': await V.field.warp(a[1], a[2], a[3], a[4]); break;
      case 'cutscene': await V.cutscene.play(a[1]); break;
      case 'dialogue': await V.dialogue.play(a[1]); break;
      case 'dim': Gm.addDim(a[1], a[2]); break;
      case 'conn': Gm.addConn(a[1], a[2]); break;
      case 'exp': Gm.addExp(a[1]); break;
      case 'heal': Gm.heal(a[1], a[2]); V.audio.play('heal'); break;
      case 'hurt':
        Gm.hurt(a[1]);
        if (Gm.s.stamina <= 0) await Gm.evacuate();
        break;
      case 'load': Gm.addLoad(a[1]); break;
      case 'learn': Gm.learn(a[1]); break;
      case 'shop': await V.craft.openShop(a[1]); break;
      case 'craft': await V.craft.openAltar(a[1]); break;
      case 'save': await V.menu.openSaveLoad('save'); break;
      case 'sfx': V.audio.play(a[1]); break;
      case 'toast': V.ui.toast(Gm.tpl(a[1])); break;
      case 'tone': Gm.s.tones[a[2] || Gm.s.map] = a[1]; break;
      case 'respawn': Gm.s.respawn = { map: a[1], x: a[2], y: a[3] }; break;
      case 'glossary':
        if (!Gm.s.glossary[a[1]]) { Gm.s.glossary[a[1]] = true; var g = D().glossary[a[1]]; if (g) V.ui.toast('詞彙收錄：' + g.term, 'glossary'); }
        break;
      case 'actor': Gm.s.actorVis[Gm.s.map + '/' + a[1]] = a[2] === 'show'; break;
      case 'ending': await V.screens.ending(a[1]); break;
      case 'tutorial': await Gm.showTutorial(a[1], a[2] === 'force'); break;
      case 'vein': Gm.setVein(a[1], a[2]); break;
      case 'lines': await V.dialogue.lines(a[1]); break;
      default:
        if (V.cutscene && V.cutscene.isCmd(n)) await V.cutscene.cmd(a);
        else console.warn('未知動作', a);
    }
  };
})();
