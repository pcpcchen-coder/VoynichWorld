/*
 * 主選單：狀態、物品、葉帖、任務、詞彙／教學回顧、存檔、設定、回標題。
 * 鍵盤：左右切換分頁、上下選擇、確認執行、取消關閉。觸控：直接點選。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game;
  var M = V.menu = {};
  var TABS = [
    { id: 'status', name: '狀態' }, { id: 'items', name: '物品' }, { id: 'folios', name: '葉帖' },
    { id: 'quests', name: '任務' }, { id: 'glossary', name: '教學' }, { id: 'save', name: '存檔' },
    { id: 'settings', name: '設定' }, { id: 'title', name: '標題' }
  ];
  var CAT = { sample: '樣本', medicine: '處置藥', consumable: '消耗品', key: '重要物品' };
  M.CAT = CAT;
  var cur = null;

  M.isOpen = function () { return !!cur; };
  M.open = function (tabId) {
    if (cur) return cur.promise;
    var el = UI.el('div', 'menu',
      '<div class="menu-frame panel"><div class="menu-head"><div class="menu-tabs" role="tablist"></div>' +
      '<button type="button" class="btn ghost menu-close" data-id="menu-close">關閉</button></div>' +
      '<div class="menu-body"><div class="menu-list"></div><div class="menu-detail"></div></div>' +
      '<div class="menu-foot"></div></div>');
    var m = cur = { el: el, tab: tabId || 'status', kind: 'menu' };
    m.tabsEl = el.querySelector('.menu-tabs'); m.listEl = el.querySelector('.menu-list');
    m.detailEl = el.querySelector('.menu-detail'); m.bodyEl = el.querySelector('.menu-body'); m.footEl = el.querySelector('.menu-foot');
    m.tabsEl.innerHTML = TABS.map(function (t) { return '<button type="button" class="tab" role="tab" data-tab="' + t.id + '">' + t.name + '</button>'; }).join('');
    m.tabsEl.addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) { V.audio.play('cursor'); setTab(b.getAttribute('data-tab')); } });
    el.querySelector('.menu-close').addEventListener('click', function () { V.audio.play('cancel'); close(); });
    m.list = new UI.List(m.listEl, {
      onChoose: function (it) { if (m.onChoose) m.onChoose(it); },
      onCancel: close,
      onMove: function (it) { if (m.onMove) m.onMove(it); }
    });
    m.update = function () {
      var I = V.input;
      if (I.nav('left')) { V.audio.play('cursor'); shift(-1); return; }
      if (I.nav('right')) { V.audio.play('cursor'); shift(1); return; }
      if (m.list.items.length) m.list.update();
      else if (I.pressed('cancel')) { V.audio.play('cancel'); close(); }
    };
    m.promise = new Promise(function (res) { m.resolve = res; });
    UI.push(m);
    setTab(m.tab);
    return m.promise;
  };
  function close() { if (!cur) return; var m = cur; cur = null; UI.pop(m); m.resolve(); }
  M.close = close;
  function shift(d) {
    var i = 0; TABS.forEach(function (t, k) { if (t.id === cur.tab) i = k; });
    setTab(TABS[(i + d + TABS.length) % TABS.length].id);
  }
  function setTab(id) {
    var m = cur; m.tab = id; m.onChoose = null; m.onMove = null;
    Array.prototype.forEach.call(m.tabsEl.children, function (b) {
      var on = b.getAttribute('data-tab') === id; b.classList.toggle('on', on);
      if (on && b.scrollIntoView) { try { b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) { /* 忽略 */ } }
    });
    m.bodyEl.className = 'menu-body tab-' + id;
    m.detailEl.innerHTML = ''; m.footEl.textContent = '左右：切換分頁　上下：選擇　確認：執行　取消：關閉';
    TAB[id](m);
  }
  M.refresh = function () { if (cur) setTab(cur.tab); };

  var TAB = {};
  TAB.status = function (m) {
    var s = Gm.s, next = Gm.nextLevelExp();
    m.list.set([]);
    var skills = s.skills.map(function (id) { var k = V.data.skills[id]; return k ? '<li><b>' + U.esc(k.name) + '</b>　' + U.esc(k.desc || '') + '</li>' : ''; }).join('');
    var cur$ = (V.data.meta && V.data.meta.currency) ? V.data.items[V.data.meta.currency] : null;
    m.detailEl.innerHTML =
      '<div class="st-card"><h2>' + U.esc(s.partyName) + '<small>記脈者・等級 ' + s.level + '</small></h2>' +
      '<div class="st-row"><span>體力</span>' + UI.bar('hp', s.stamina, Gm.maxStamina()) + '<em>' + Math.ceil(s.stamina) + ' / ' + Gm.maxStamina() + '</em></div>' +
      '<div class="st-row"><span>感官負荷</span>' + UI.bar('load' + (Gm.loadPct() >= 70 ? ' hot' : ''), s.load, Gm.maxLoad(), '<u style="left:70%"></u>') + '<em>' + Math.round(s.load) + ' / ' + Gm.maxLoad() + '</em></div>' +
      '<div class="st-row"><span>見識</span>' + UI.bar('exp', next ? s.exp - Gm.levelRow(s.level).exp : 1, next ? next - Gm.levelRow(s.level).exp : 1) + '<em>' + (next ? s.exp + ' / ' + next : s.exp + '（已達上限）') + '</em></div>' +
      '<dl class="st-dl"><dt>所在</dt><dd>' + U.esc((V.data.maps[s.map] || {}).name || '') + '</dd>' +
      '<dt>遊玩時間</dt><dd>' + U.fmtTime(s.playtime) + '</dd>' +
      '<dt>葉帖</dt><dd>' + Object.keys(s.folios).length + ' / ' + Object.keys(V.data.folios).length + '</dd>' +
      (cur$ ? '<dt>' + U.esc(cur$.name) + '</dt><dd>' + Gm.count(V.data.meta.currency) + '</dd>' : '') +
      '<dt>穩定／隔離</dt><dd>' + s.stats.stabilized + ' ／ ' + s.stats.isolated + '</dd>' +
      Object.keys(V.data.zones).map(function (z) { return '<dt>' + U.esc(V.data.zones[z].name) + '</dt><dd>連通度 ' + Math.round(s.conn[z] || 0) + '・' + (V.rules.VEIN_NAMES[Gm.vein(z)] || '') + '</dd>'; }).join('') +
      '</dl>' +
      '<h3>手技</h3><ul class="st-skills">' + (skills || '<li class="muted">還沒有學會的手技。</li>') + '</ul></div>';
  };

  TAB.items = function (m) {
    var s = Gm.s, items = [];
    Object.keys(CAT).forEach(function (cat) {
      var ids = Object.keys(s.items).filter(function (id) { return V.data.items[id] && V.data.items[id].cat === cat && s.items[id] > 0; });
      if (!ids.length) return;
      items.push({ header: true, label: CAT[cat] });
      ids.forEach(function (id) {
        var it = V.data.items[id];
        items.push({ id: id, label: U.esc(it.name), right: '×' + s.items[id], icon: V.gfx.icon(it.icon) });
      });
    });
    m.onMove = function (it) {
      if (!it || it.header) return;
      var d = V.data.items[it.id], un = s.unbanked[it.id];
      m.detailEl.innerHTML = '<div class="it-card"><img class="it-big" alt="" src="' + V.gfx.icon(d.icon) + '"><h2>' + U.esc(d.name) + '</h2>' +
        '<p class="tag">' + CAT[d.cat] + (d.treats ? '・對「' + d.treats + '」' : '') + '</p><p>' + U.esc(d.desc || '') + '</p>' +
        (un ? '<p class="fine">其中 ' + un + ' 份尚未入庫（在種源龕歇息即可入庫；力竭撤離時會遺失一部分）。</p>' : '') +
        (d.use && d.usable !== 'battle' ? '<p class="fine">按確認使用。</p>' : '') + '</div>';
    };
    m.onChoose = async function (it) {
      var d = V.data.items[it.id];
      if (!d.use || d.usable === 'battle') { V.audio.play('error'); return; }
      if (!(await UI.confirm('使用' + d.name + '？', '使用', '取消'))) return;
      Gm.take(it.id, 1, true);
      var eff = Gm.useItem(d);
      V.audio.play('heal'); UI.toast('使用了' + d.name + '。' + eff, 'heal');
      setTab('items');
    };
    if (!items.length) { m.list.set([]); m.detailEl.innerHTML = '<p class="muted pad">背包是空的。</p>'; return; }
    m.list.set(items);
  };

  TAB.folios = function (m) { V.folio.tab(m, function () { setTab('folios'); }); };

  TAB.quests = function (m) {
    var s = Gm.s, act = [], done = [];
    Object.keys(s.quests).forEach(function (id) { var q = V.data.quests[id]; if (!q) return; (s.quests[id].status === 'done' ? done : act).push(id); });
    var items = [];
    function row(id) { var q = V.data.quests[id]; return { id: id, label: U.esc(q.name), right: q.type === 'side' ? '支線' : '主線', cls: s.quests[id].status === 'done' ? 'done' : '' }; }
    if (act.length) { items.push({ header: true, label: '進行中' }); act.forEach(function (id) { items.push(row(id)); }); }
    if (done.length) { items.push({ header: true, label: '已完成' }); done.forEach(function (id) { items.push(row(id)); }); }
    m.onMove = function (it) {
      if (!it || it.header) return;
      var q = V.data.quests[it.id], st = s.quests[it.id];
      var html = '<div class="q-card"><h2>' + U.esc(q.name) + '</h2><p class="tag">' + (q.type === 'side' ? '支線' : '主線') + (st.status === 'done' ? '・已完成' : '') + '</p><p>' + U.esc(q.desc || '') + '</p><ol class="q-stages">';
      q.stages.forEach(function (sg, i) {
        if (i > st.stage) return;
        var d = st.status === 'done' || i < st.stage;
        html += '<li class="' + (d ? 'done' : 'now') + '">' + (d ? '✓ ' : '▶ ') + U.esc(sg.text) + '</li>';
      });
      m.detailEl.innerHTML = html + '</ol></div>';
    };
    if (!items.length) { m.list.set([]); m.detailEl.innerHTML = '<p class="muted pad">目前沒有任務。</p>'; return; }
    m.list.set(items);
  };

  TAB.glossary = function (m) {
    var s = Gm.s, items = [{ header: true, label: '教學回顧' }, { id: '@glyphs', label: '味符對照' }];
    Object.keys(V.data.tutorials).forEach(function (id) {
      if (s.seen['tut:' + id]) items.push({ id: '@tut:' + id, label: U.esc(V.data.tutorials[id].title) });
    });
    var terms = Object.keys(V.data.glossary).filter(function (id) { return s.glossary[id]; });
    if (terms.length) { items.push({ header: true, label: '詞彙' }); terms.forEach(function (id) { items.push({ id: id, label: U.esc(V.data.glossary[id].term) }); }); }
    m.onMove = function (it) {
      if (!it || it.header) return;
      if (it.id === '@glyphs') { m.detailEl.innerHTML = '<div class="g-card"><h2>味符對照</h2><p>嚐味讀出的每個味符代表一種病理。按確認查看對照表。</p></div>'; return; }
      if (it.id.indexOf('@tut:') === 0) { var t = V.data.tutorials[it.id.slice(5)]; m.detailEl.innerHTML = '<div class="g-card"><h2>' + U.esc(t.title) + '</h2><p>共 ' + t.pages.length + ' 頁。按確認重看。</p></div>'; return; }
      var g = V.data.glossary[it.id];
      m.detailEl.innerHTML = '<div class="g-card"><h2>' + U.esc(g.term) + '</h2><p>' + U.esc(g.text).replace(/\n/g, '<br>') + '</p></div>';
    };
    m.onChoose = function (it) {
      if (it.id === '@glyphs') V.battle.help();
      else if (it.id.indexOf('@tut:') === 0) Gm.showTutorial(it.id.slice(5), true);
    };
    m.list.set(items);
  };

  function slotItems() {
    return V.save.SLOTS.map(function (sl) {
      var i = V.save.info(sl);
      return {
        id: sl, label: V.save.SLOT_NAMES[sl],
        sub: i ? U.esc((i.summary.chapter ? i.summary.chapter + '・' : '') + (i.summary.map || '') + '　Lv ' + i.summary.level + '　葉帖 ' + i.summary.folios + '　' + U.fmtTime(i.summary.playtime)) : '— 空 —',
        right: i ? V.save.fmtDate(i.savedAt) : '', data: i
      };
    });
  }
  TAB.save = function (m) {
    m.detailEl.innerHTML = '<div class="g-card"><h2>存檔</h2><p>三個手動欄位，另有自動存檔（換地圖與在種源龕歇息時寫入）。</p>' +
      (V.save.persistent ? '' : '<p class="warn-text">這個瀏覽器不允許寫入本機儲存：存檔只會保留到關閉頁面為止。</p>') + '</div>';
    m.onChoose = async function (it) {
      var opts = [];
      if (it.id !== 'auto') opts.push({ id: 'save', label: '存入這個欄位' });
      if (it.data) opts.push({ id: 'load', label: '讀取這個存檔' });
      opts.push({ id: 'cancel', label: '取消' });
      var r = await UI.choose(V.save.SLOT_NAMES[it.id], opts);
      if (!r || r.id === 'cancel') return;
      if (r.id === 'save') {
        if (it.data && !(await UI.confirm('覆蓋' + V.save.SLOT_NAMES[it.id] + '？', '覆蓋', '取消'))) return;
        doSave(it.id); setTab('save');
      } else if (r.id === 'load') {
        if (!(await UI.confirm('讀取後，未存檔的進度會消失。', '讀取', '取消'))) return;
        close(); V.screens.loadSlot(it.id);
      }
    };
    m.list.set(slotItems());
  };
  function doSave(slot) {
    if (V.save.write(slot)) { V.audio.play('save'); UI.toast('已存入' + V.save.SLOT_NAMES[slot] + '。', 'save'); }
    else { V.audio.play('error'); UI.toast('存檔失敗：瀏覽器不允許寫入。', 'warn'); }
  }

  // 獨立的存／讀檔視窗（種源龕、標題畫面用）。回傳 Promise<是否完成>
  M.openSaveLoad = async function (mode) {
    for (;;) {
      var items = slotItems().filter(function (it) { return mode === 'load' ? true : it.id !== 'auto'; });
      items.forEach(function (it) { if (mode === 'load' && !it.data) it.disabled = true; });
      items.push({ id: 'cancel', label: '返回' });
      var r = await UI.choose(mode === 'load' ? '讀取哪一個存檔？' : '存入哪一個欄位？', items, { cls: 'wide' });
      if (!r || r.id === 'cancel') return false;
      if (mode === 'load') return r.id;
      if (r.data && !(await UI.confirm('覆蓋' + V.save.SLOT_NAMES[r.id] + '？', '覆蓋', '取消'))) continue;
      doSave(r.id);
      return true;
    }
  };

  var SPEED_NAMES = { slow: '慢', normal: '普通', fast: '快', instant: '瞬間' };
  var TOUCH_NAMES = { auto: '自動', on: '顯示', off: '隱藏' };
  M.settingsItems = function () {
    var s = V.save.settings;
    return [
      { id: 'textSpeed', label: '文字速度', right: SPEED_NAMES[s.textSpeed] },
      { id: 'master', label: '主音量', right: s.master ? s.master * 10 + '%' : '關閉' },
      { id: 'sfx', label: '音效', right: s.sfx ? s.sfx * 10 + '%' : '關閉' },
      { id: 'ambience', label: '環境音', right: s.ambience ? s.ambience * 10 + '%' : '關閉' },
      { id: 'touch', label: '觸控按鍵', right: TOUCH_NAMES[s.touch] }
    ];
  };
  M.settingsCycle = function (id) {
    var s = V.save.settings;
    function cyc(list, v) { return list[(list.indexOf(v) + 1) % list.length]; }
    if (id === 'textSpeed') s.textSpeed = cyc(['slow', 'normal', 'fast', 'instant'], s.textSpeed);
    else if (id === 'touch') s.touch = cyc(['auto', 'on', 'off'], s.touch);
    else if (id === 'master' || id === 'sfx' || id === 'ambience') s[id] = s[id] >= 10 ? 0 : s[id] + 2;
    V.save.saveSettings();
    V.audio.play('confirm');
  };
  TAB.settings = function (m) {
    m.detailEl.innerHTML = '<div class="g-card"><h2>設定</h2><p>按確認切換數值。音量調到「關閉」即靜音。</p><p class="fine">鍵盤：方向鍵／WASD 移動，Z／Enter／空白 確認，X／Esc 取消與選單。</p></div>';
    m.onChoose = function (it) { M.settingsCycle(it.id); m.list.set(M.settingsItems(), true); };
    m.list.set(M.settingsItems());
  };

  TAB.title = function (m) {
    m.detailEl.innerHTML = '<div class="g-card"><h2>回到標題</h2><p>未存檔的進度會消失。自動存檔會保留最後一次換地圖時的狀態。</p></div>';
    m.onChoose = async function () {
      if (await UI.confirm('確定要回到標題畫面？', '回標題', '取消')) { close(); V.screens.title(); }
    };
    m.list.set([{ id: 'back', label: '回到標題畫面' }]);
  };
})();
