/*
 * 標題畫面、關於、進入遊戲（新遊戲／讀檔）、章末統計畫面。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game;
  var Sc = V.screens = {};
  var titleModal = null;

  V.setScene = function (s) { V.scene = s; document.body.setAttribute('data-scene', s); };

  var ABOUT = [
    { title: '關於本作', html: '<p>《薇蘿：葉帖紀行》（VELLORA — The Loose Folios）是以「薇蘿」世界觀製作的網頁 RPG。妳扮演記脈者珂潾，在脈枯蔓延的池環之間取樣、嚐味、診療，並把正在消失的生命一張一張畫成葉帖。</p><p>這裡沒有要打倒的對象。遭遇的結束方式是穩定、隔離或撤離，每一種都有後果。</p>' },
    { title: '虛構聲明', html: '<p><b>本作全部內容為原創虛構。</b>它不是對《伏尼契手稿》的翻譯、解讀或學術主張。</p><p>葉帖使用的手稿掃描頁圖，與遊戲中的名稱、筆記之間的配對，純屬本作的設計，不代表該頁「真正畫的是什麼」。</p><p>授權沿用主倉庫：CC BY-NC-SA 4.0。</p>' },
    { title: '操作', html: '<table class="glyph-table"><tr><th>動作</th><th>鍵盤</th><th>觸控</th></tr><tr><td>移動</td><td>方向鍵／WASD</td><td>左下方向鍵</td></tr><tr><td>確認／調查</td><td>Z、Enter、空白</td><td>A 鈕，或直接點選</td></tr><tr><td>取消／選單</td><td>X、Esc</td><td>B 鈕、右上 ≡</td></tr></table><p class="fine">對話框可直接點擊前進；所有選單都能直接點選。</p>' }
  ];

  Sc.title = function () {
    var meta = V.data.meta || {};
    if (titleModal) UI.pop(titleModal);
    while (UI.stack.length) UI.pop(UI.stack[UI.stack.length - 1]);
    V.setScene('title');
    V.audio.ambience('village');
    UI.fadeSet(false);
    var el = UI.el('div', 'title',
      '<div class="title-bg" style="background-image:url(' + (meta.titleImage || 'assets/title.jpg') + ')"></div><div class="title-shade"></div>' +
      '<div class="title-inner"><div class="title-head"><p class="title-kicker">VELLORA — The Loose Folios</p><h1>薇蘿<span>：</span>葉帖紀行</h1>' +
      '<p class="title-chapter">' + U.esc(meta.chapter || '') + (V.runtime.demo ? '<em>測試房</em>' : '') + '</p></div>' +
      '<div class="title-menu panel"></div>' +
      '<p class="title-foot">本作為原創虛構，不是對《伏尼契手稿》的翻譯或解讀。</p></div>');
    var m = titleModal = { kind: 'title', el: el };
    var list = new UI.List(el.querySelector('.title-menu'), {
      onChoose: async function (it) {
        if (it.id === 'continue') { var l = V.save.latest(); if (l) Sc.loadSlot(l.slot); }
        else if (it.id === 'new') {
          if (V.save.latest() && !(await UI.confirm('開始新的旅程？既有的存檔欄位不會被刪除，但自動存檔會被覆寫。', '開始', '取消'))) return;
          Sc.newGame();
        }
        else if (it.id === 'load') { var slot = await V.menu.openSaveLoad('load'); if (slot) Sc.loadSlot(slot); }
        else if (it.id === 'settings') { await settings(); }
        else if (it.id === 'about') { await UI.pages('關於', ABOUT, { skippable: true }); }
      }
    });
    function items() {
      var latest = V.save.latest();
      var a = [];
      if (latest) a.push({ id: 'continue', label: '繼續', sub: U.esc((latest.summary.map || '') + '　Lv ' + latest.summary.level + '　' + U.fmtTime(latest.summary.playtime)) });
      a.push({ id: 'new', label: '新遊戲' });
      a.push({ id: 'load', label: '讀取', disabled: !latest });
      a.push({ id: 'settings', label: '設定' });
      a.push({ id: 'about', label: '關於' });
      return a;
    }
    list.set(items());
    m.update = function () { list.update(); };
    UI.push(m);
  };
  function closeTitle() { if (titleModal) { UI.pop(titleModal); titleModal = null; } }

  function settings() {
    return new Promise(function (resolve) {
      var el = UI.el('div', 'modal-wrap dim');
      var box = UI.el('div', 'panel choose wide', '<div class="choose-title">設定</div><div class="choose-list"></div>');
      el.appendChild(box);
      var modal = { kind: 'settings', el: el };
      var list = new UI.List(box.querySelector('.choose-list'), {
        onChoose: function (it) { if (it.id === 'back') { UI.pop(modal); resolve(); return; } V.menu.settingsCycle(it.id); list.set(V.menu.settingsItems().concat([{ id: 'back', label: '返回' }]), true); },
        onCancel: function () { UI.pop(modal); resolve(); }
      });
      list.set(V.menu.settingsItems().concat([{ id: 'back', label: '返回' }]));
      modal.update = function () { list.update(); };
      UI.push(modal);
    });
  }

  Sc.newGame = async function () {
    await UI.fade('out', 400, '#0b0a0e');
    closeTitle();
    var st = V.data.start || {};
    Gm.newState();
    var pm = V.parseMap(st.map, V.data.maps[st.map]);
    var pos = V.resolvePos(pm, st) || { x: 1, y: 1 };
    Gm.s.respawn = st.respawn || { map: st.map, x: pos.x, y: pos.y };
    V.setScene('field');
    V.field.busy = 0;
    V.field.load(st.map, pos.x, pos.y, st.dir || 'down');
    V.field.snapCamera();
    if (st.cutscene) { await V.cutscene.play(st.cutscene); }
    await UI.fade('in', 400);
    if (V.field.map.def.name && !st.cutscene) UI.banner(V.field.map.def.name, V.field.map.def.subtitle);
    V.save.auto();
  };

  Sc.loadSlot = async function (slot) {
    var save = V.save.read(slot);
    if (!save) { UI.toast('讀取失敗：存檔不存在或已損毀。', 'warn'); return false; }
    await UI.fade('out', 300, '#0b0a0e');
    closeTitle();
    while (UI.stack.length) UI.pop(UI.stack[UI.stack.length - 1]);
    var s = V.save.restore(save);
    V.setScene('field');
    V.field.busy = 0;
    if (!V.data.maps[s.map]) { s.map = V.data.start.map; s.x = V.data.start.x; s.y = V.data.start.y; }
    V.field.load(s.map, s.x, s.y, s.dir);
    V.field.snapCamera();
    await UI.fade('in', 300);
    UI.banner(V.field.map.def.name || '', V.field.map.def.subtitle);
    V.emit('loaded', slot);
    return true;
  };

  // ---- 章末畫面 ----
  var DIM_TEXT = {
    bo: '妳傾向把斷掉的東西重新接回去。慢，而且不保證來得及。',
    fen: '妳傾向先止住擴散。乾淨、有效，留下的是一塊一塊的孤島。',
    rong: '妳傾向把痛分給更多人一起承擔。界線變薄了。',
    lu: '妳傾向先把它畫下來。記錄不救當下，但未來的人會需要。'
  };
  Sc.dimSummary = function () {
    var d = Gm.s.dims, keys = ['bo', 'fen', 'rong', 'lu'];
    var max = Math.max.apply(null, keys.map(function (k) { return d[k] || 0; }));
    if (max <= 0) return '四個方向都還沒有重量。妳還沒有替這個世界做過選擇。';
    var top = keys.filter(function (k) { return (d[k] || 0) === max; });
    if (top.length > 1) return '「' + top.map(function (k) { return V.DIMS[k].name; }).join('」與「') + '」在妳身上一樣重。妳還在兩種做法之間。';
    return DIM_TEXT[top[0]];
  };
  Sc.ending = function (id) {
    var meta = V.data.meta || {}, e = (meta.endings && meta.endings[id || 'default']) || {};
    var s = Gm.s;
    return new Promise(function (resolve) {
      var dims = ['bo', 'fen', 'rong', 'lu'].map(function (k) {
        return '<div class="end-dim"><span>' + V.DIMS[k].name + '</span>' + UI.bar('dim-' + k, s.dims[k] || 0, Math.max(6, s.dims.bo, s.dims.fen, s.dims.rong, s.dims.lu)) + '<em>' + (s.dims[k] || 0) + '</em></div>';
      }).join('');
      var conn = Object.keys(V.data.zones).map(function (z) { return '<dt>' + U.esc(V.data.zones[z].name) + '連通度</dt><dd>' + Math.round(s.conn[z]) + '</dd>'; }).join('');
      var el = UI.el('div', 'ending',
        '<div class="title-bg" style="background-image:url(' + (e.image || 'assets/ending.jpg') + ')"></div><div class="title-shade"></div>' +
        '<div class="end-inner"><div class="end-box panel">' +
        '<p class="tag">' + U.esc(e.kicker || meta.chapter || '') + '</p><h1>' + U.esc(e.title || '章末') + '</h1>' +
        // 擴充：text 每行可用「〔若 條件〕」開頭（條件成立才顯示）與樣板 {conn:區域} 等
        U.toArray(e.text).map(function (t) {
          var m = /^〔若\s*([^〕]+)〕/.exec(t);
          if (m) { if (!Gm.cond(m[1].trim())) return ''; t = t.slice(m[0].length); }
          return '<p>' + U.esc(Gm.tpl(t)) + '</p>';
        }).join('') +
        '<dl class="end-stats"><dt>遊玩時間</dt><dd>' + U.fmtTime(s.playtime) + '</dd><dt>等級</dt><dd>' + s.level + '</dd>' +
        '<dt>葉帖</dt><dd>' + Object.keys(s.folios).length + ' / ' + Object.keys(V.data.folios).length + '</dd>' +
        '<dt>穩定</dt><dd>' + s.stats.stabilized + ' 次</dd><dt>隔離</dt><dd>' + s.stats.isolated + ' 次</dd>' + conn + '</dl>' +
        (e.hideDims ? '' : '<h3>四向度</h3><div class="end-dims">' + dims + '</div>') + '<p class="end-lean">' + U.esc(Sc.dimSummary()) + '</p>' +   // 擴充：hideDims 不顯示四向度數值
        '<p class="end-tbc">— 待續 —</p>' +
        U.toArray(e.after).map(function (t) { return '<p class="end-after">' + U.esc(t) + '</p>'; }).join('') +   // 擴充：待續之後的段落（下一章預告）
        '<p class="fine">' + U.esc(e.note || '後續章節的完整劇本收錄於 docs/script/（尚未實作為可玩內容）。') + '</p>' +
        '<div class="end-btns">' + (e.allowContinue ? '<button type="button" class="btn ghost" data-a="stay">繼續探索</button>' : '') +
        '<button type="button" class="btn" data-a="title" data-id="end-title">回到標題</button></div></div></div>');
      var modal = { kind: 'ending', el: el };
      V.audio.play('folio');
      function act(a) {
        UI.pop(modal);
        if (a === 'stay') { resolve(); return; }
        resolve(); Sc.title();
      }
      el.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) act(b.getAttribute('data-a')); });
      modal.update = function () { if (V.input.pressed('confirm')) act('title'); else if (V.input.pressed('cancel') && e.allowContinue) act('stay'); };
      V.save.write('auto');
      UI.push(modal);
      UI.fadeSet(false);
    });
  };
})();
