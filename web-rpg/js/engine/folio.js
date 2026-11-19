/*
 * 葉帖（圖鑑）：清單、條件進度、繪製（顯影動畫）與檢視。
 * 葉帖與手稿掃描頁的配對是遊戲設計，不是對手稿的解讀。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game;
  var Fo = V.folio = {};

  Fo.status = function (id) {
    if (Gm.s.folios[id]) return 'drawn';
    if (Gm.folioReady(id)) return 'ready';
    return 'todo';
  };
  // 是否已「見過」這張葉帖（任一條件達成才顯示名稱）
  function known(id) {
    if (Gm.s.folios[id]) return true;
    return Gm.folioConds(id).some(function (c) { return c.done; }) || !!V.data.folios[id].visible;
  }

  // 選單分頁
  Fo.tab = function (m, refresh) {
    var ids = Object.keys(V.data.folios).sort();
    var got = ids.filter(function (id) { return Gm.s.folios[id]; }).length;
    var items = [{ header: true, label: '葉帖　' + got + ' / ' + ids.length }];
    ids.forEach(function (id) {
      var f = V.data.folios[id], st = Fo.status(id), cs = Gm.folioConds(id);
      var doneN = cs.filter(function (c) { return c.done; }).length;
      items.push({
        id: id, cls: 'folio-' + st,
        label: '<span class="fo-id">' + id + '</span>' + (known(id) ? U.esc(Gm.folioName(id)) : '？？？'),
        sub: U.esc(f.cat || ''),
        right: st === 'drawn' ? '已繪製' : st === 'ready' ? '可繪製' : doneN + ' / ' + cs.length
      });
    });
    m.onMove = function (it) {
      if (!it || it.header) return;
      var f = V.data.folios[it.id], st = Fo.status(it.id), cs = Gm.folioConds(it.id);
      var html = '<div class="fo-card"><p class="tag">' + it.id + '・' + U.esc(f.cat || '') + '</p><h2>' + (known(it.id) ? U.esc(Gm.folioName(it.id)) : '？？？') + '</h2>';
      if (st === 'drawn') {
        html += '<div class="fo-thumb"><img alt="" src="' + U.esc(f.image) + '"></div><p class="fo-note" style="white-space:pre-line">' + U.esc(Gm.folioNote(it.id)) + '</p><p class="fine">按確認翻開這一葉。</p>';
      } else {
        html += '<ul class="fo-conds">' + cs.map(function (c) {
          return '<li class="' + (c.done ? 'done' : '') + '"><b>' + (c.done ? '✓' : '・') + ' ' + c.label + '</b>' + (c.hint ? '<span>' + U.esc(c.hint) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
        html += st === 'ready' ? '<p class="fo-ready">條件齊備。按確認繪製這張葉帖。</p>' : '<p class="fine">觀察（看）→ 取樣（採）→ 診斷（嚐）→ 繪製（畫）。</p>';
      }
      m.detailEl.innerHTML = html + '</div>';
    };
    m.onChoose = async function (it) {
      var st = Fo.status(it.id);
      if (st === 'todo') { V.audio.play('error'); return; }
      if (st === 'ready') { await Fo.draw(it.id); refresh(); }
      else await Fo.view(it.id, false);
    };
    m.list.set(items);
    // 優先停在可繪製的那一張
    for (var i = 0; i < items.length; i++) if (items[i].cls === 'folio-ready') { m.list.select(i, true); break; }
  };

  Fo.draw = async function (id) {
    if (!Gm.drawFolio(id)) return false;
    V.save.auto();
    await Fo.view(id, true);
    return true;
  };

  // 全幅檢視；drawing=true 時播放翻頁與顯影動畫
  Fo.view = function (id, drawing) {
    var f = V.data.folios[id];
    return new Promise(function (resolve) {
      var el = UI.el('div', 'folio-view' + (drawing ? ' drawing' : ''),
        '<div class="fv-book">' +
        '<div class="fv-page"><div class="fv-img"><img alt="手稿頁圖" src="' + U.esc(f.image) + '"><div class="fv-ink"></div></div></div>' +
        '<div class="fv-side panel"><p class="tag">' + id + '・' + U.esc(f.cat || '') + '</p><h2>' + U.esc(Gm.folioName(id)) + '</h2>' +
        '<p class="fv-note" style="white-space:pre-line">' + U.esc(Gm.folioNote(id)) + '</p>' +
        '<p class="fv-sign">—— 珂潾　記</p>' +
        (drawing ? '<p class="fv-stamp">入帖</p>' : '') +
        '<p class="fine">頁圖取自伏尼契手稿掃描；與葉帖的配對是本作的虛構設計，不是對手稿的解讀。</p>' +
        '<button type="button" class="btn" data-id="folio-close">' + (drawing ? '收進帖匣' : '闔上') + '</button></div></div>');
      var ready = !drawing, modal = { kind: 'folio', el: el };
      function done() { if (!ready) return; V.audio.play('cancel'); UI.pop(modal); resolve(); }
      el.querySelector('button').addEventListener('click', done);
      modal.update = function () { if (V.input.pressed('confirm') || V.input.pressed('cancel')) done(); };
      UI.push(modal);
      if (drawing) {
        V.audio.play('folio');
        V.timers.add(2600, function () { ready = true; el.classList.add('ready'); });
      }
    });
  };
})();
