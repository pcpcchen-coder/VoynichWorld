/*
 * 介面基礎：DOM 圖層、模態堆疊、清單元件、提示（toast）、地名橫幅、淡入淡出、選擇視窗、分頁說明。
 * 文字介面一律用 DOM（中文清晰、可直接點選）；地圖用 canvas。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util;
  var UI = V.ui = {};
  var stack = [];
  UI.stack = stack;

  UI.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  UI.init = function () {
    UI.root = document.getElementById('game');
    UI.layer = document.getElementById('ui-layer');
    UI.fadeEl = document.getElementById('fade');
    UI.overLayer = document.getElementById('over-layer') || UI.layer;
    UI.toastEl = document.getElementById('toasts');
    UI.bannerEl = document.getElementById('banner');
    try { document.documentElement.style.setProperty('--grain', 'url(' + V.gfx.makeGrain() + ')'); } catch (e) { /* 無紙紋亦可 */ }
  };

  // ---- 模態堆疊：最上層取得輸入 ----
  UI.push = function (modal) {
    stack.push(modal);
    // 過場把畫面淡出停住時，旁白與對話框要放在黑幕之上，否則會被蓋住（其他介面仍留在一般層）
    if (modal.el && !modal.el.parentNode) ((modal.kind === 'wait' || modal.kind === 'dialogue') ? UI.host() : UI.layer).appendChild(modal.el);
    V.input.clearFrame();
    return modal;
  };
  UI.pop = function (modal) {
    var i = stack.indexOf(modal);
    if (i >= 0) stack.splice(i, 1);
    if (modal.el && modal.el.parentNode) modal.el.parentNode.removeChild(modal.el);
    V.input.clearFrame();
  };
  UI.fadeHeld = false;
  // 過場進行中且黑幕停住時回傳黑幕之上的過場層；其餘情況回傳一般介面層
  UI.host = function () { return (UI.fadeHeld && V.cutscene && V.cutscene.running > 0) ? UI.overLayer : UI.layer; };
  UI.top = function () { return stack.length ? stack[stack.length - 1] : null; };
  UI.has = function (kind) { for (var i = 0; i < stack.length; i++) if (stack[i].kind === kind) return true; return false; };

  // ---- 清單元件 ----
  // items: [{ id, label(HTML), right(HTML), sub(HTML), disabled, header, data }]
  // opts: { cols, onChoose(item, i), onCancel(), onMove(item, i), wrap }
  function List(el, opts) {
    this.el = el; this.opts = opts || {}; this.items = []; this.index = 0;
    el.classList.add('list');
    var self = this;
    el.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.li') : null;
      if (!b || !el.contains(b)) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      var it = self.items[i]; if (!it || it.header) return;
      V.audio.unlock();
      var was = self.index === i;
      self.select(i);
      // 觸控／滑鼠：點一下即選定並執行（需二段確認的清單以 opts.tapSelects 表示）
      if (!self.opts.tapSelects || was) self.choose();
    });
  }
  List.prototype.set = function (items, keep) {
    var prevId = keep && this.items[this.index] ? this.items[this.index].id : null;
    this.items = items || [];
    var html = '';
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.header) { html += '<div class="li-head">' + it.label + '</div>'; continue; }
      html += '<button type="button" class="li' + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : '') + '" data-i="' + i + '" data-id="' + U.esc(it.id != null ? it.id : i) + '">' +
        (it.icon ? '<img class="li-icon" alt="" src="' + it.icon + '">' : '') +
        '<span class="li-main"><span class="li-label">' + it.label + '</span>' + (it.sub ? '<span class="li-sub">' + it.sub + '</span>' : '') + '</span>' +
        (it.right != null ? '<span class="li-right">' + it.right + '</span>' : '') + '</button>';
    }
    this.el.innerHTML = html;
    var idx = 0;
    if (prevId != null) for (var j = 0; j < this.items.length; j++) if (this.items[j].id === prevId) idx = j;
    if (keep && prevId == null) idx = Math.min(this.index, this.items.length - 1);
    this.index = -1;
    this.select(this.firstSelectable(idx, 1), true);
  };
  List.prototype.firstSelectable = function (from, dir) {
    var n = this.items.length; if (!n) return -1;
    var i = U.clamp(from, 0, n - 1);
    for (var k = 0; k < n; k++) {
      var j = ((i + k * dir) % n + n) % n;
      if (!this.items[j].header) return j;
    }
    return -1;
  };
  List.prototype.select = function (i, silent) {
    if (i < 0 || i >= this.items.length || this.items[i].header) return;
    var changed = i !== this.index;
    this.index = i;
    var nodes = this.el.querySelectorAll('.li');
    for (var k = 0; k < nodes.length; k++) {
      var on = parseInt(nodes[k].getAttribute('data-i'), 10) === i;
      nodes[k].classList.toggle('sel', on);
      if (on && nodes[k].scrollIntoView) { try { nodes[k].scrollIntoView({ block: 'nearest' }); } catch (e) { /* 舊瀏覽器 */ } }
    }
    if (changed && !silent) V.audio.play('cursor');
    if (changed && this.opts.onMove) this.opts.onMove(this.items[i], i);
  };
  List.prototype.current = function () { return this.items[this.index]; };
  List.prototype.move = function (d) {
    var n = this.items.length; if (!n) return;
    var i = this.index;
    for (var k = 0; k < n; k++) {
      i += d;
      if (i < 0 || i >= n) { if (this.opts.wrap === false) return; i = (i + n) % n; }
      if (!this.items[i].header) { this.select(i); return; }
    }
  };
  List.prototype.choose = function () {
    var it = this.items[this.index]; if (!it) return;
    if (it.disabled) { V.audio.play('error'); if (this.opts.onDisabled) this.opts.onDisabled(it, this.index); return; }
    V.audio.play('confirm');
    if (this.opts.onChoose) this.opts.onChoose(it, this.index);
  };
  List.prototype.update = function () {
    var I = V.input, cols = this.opts.cols || 1;
    if (I.nav('up')) this.move(-cols);
    else if (I.nav('down')) this.move(cols);
    else if (cols > 1 && I.nav('left')) this.move(-1);
    else if (cols > 1 && I.nav('right')) this.move(1);
    if (I.pressed('confirm')) this.choose();
    else if (I.pressed('cancel') && this.opts.onCancel) { V.audio.play('cancel'); this.opts.onCancel(); }
  };
  UI.List = List;

  // ---- 提示 ----
  UI.toast = function (text, kind, icon) {
    if (!UI.toastEl) return;
    var t = UI.el('div', 'toast ' + (kind || ''), (icon ? '<img alt="" src="' + V.gfx.icon(icon) + '">' : '') + '<span>' + U.esc(text) + '</span>');
    UI.toastEl.appendChild(t);
    while (UI.toastEl.children.length > 4) UI.toastEl.removeChild(UI.toastEl.firstChild);
    V.timers.add(3200, function () { t.classList.add('out'); });
    V.timers.add(3700, function () { if (t.parentNode) t.parentNode.removeChild(t); });
  };

  // ---- 地名橫幅 ----
  UI.banner = function (text, sub) {
    var b = UI.bannerEl; if (!b) return;
    b.innerHTML = '<span class="bn-main">' + U.esc(text) + '</span>' + (sub ? '<span class="bn-sub">' + U.esc(sub) + '</span>' : '');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    var token = (UI._bn = (UI._bn || 0) + 1);
    V.timers.add(2800, function () { if (UI._bn === token) b.classList.remove('show'); });
  };

  // ---- 淡入淡出 ----
  UI.fade = function (dir, ms, color) {
    ms = (ms == null ? 400 : ms);
    var f = UI.fadeEl;
    if (color) f.style.background = color;
    f.style.transition = 'opacity ' + Math.max(1, ms / V.runtime.speed) + 'ms linear';
    void f.offsetWidth;
    f.style.opacity = dir === 'out' ? '1' : '0';
    if (dir !== 'out') UI.fadeHeld = false;
    return U.wait(ms + 30).then(function () { if (dir === 'out') UI.fadeHeld = true; });
  };
  UI.fadeSet = function (on, color) {
    var f = UI.fadeEl; if (color) f.style.background = color;
    f.style.transition = 'none'; f.style.opacity = on ? '1' : '0';
    UI.fadeHeld = !!on;
  };

  // ---- 選擇視窗 ----
  // items: [{id,label,sub,disabled}]；回傳 Promise<被選項目或 null（取消）>
  UI.choose = function (title, items, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var el = UI.el('div', 'modal-wrap ' + (opts.cls || ''));
      var box = UI.el('div', 'panel choose');
      if (title) box.appendChild(UI.el('div', 'choose-title', title));
      var le = UI.el('div', 'choose-list'); box.appendChild(le); el.appendChild(box);
      var modal = { kind: 'choose', el: el };
      function done(v) { UI.pop(modal); resolve(v); }
      var list = new List(le, {
        onChoose: function (it) { done(it); },
        onCancel: opts.noCancel ? null : function () { done(null); }
      });
      list.set(items);
      if (opts.index) list.select(opts.index, true);
      modal.update = function () { list.update(); };
      UI.push(modal);
    });
  };
  UI.confirm = async function (text, yes, no) {
    var r = await UI.choose(text, [{ id: 'yes', label: yes || '是' }, { id: 'no', label: no || '否' }], { index: 0 });
    return !!r && r.id === 'yes';
  };

  // ---- 分頁說明（教學）----
  // pages: [{title, text(HTML 或純文字)}]
  UI.pages = function (title, pages, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var i = 0;
      var el = UI.el('div', 'modal-wrap dim');
      var box = UI.el('div', 'panel pages');
      el.appendChild(box);
      var modal = { kind: 'pages', el: el };
      function render() {
        var p = pages[i];
        box.innerHTML = '<div class="pages-head"><span class="pages-kicker">' + U.esc(title) + '</span><span class="pages-n">' + (i + 1) + ' / ' + pages.length + '</span></div>' +
          '<h3>' + U.esc(p.title || '') + '</h3><div class="pages-body">' + (p.html || U.esc(p.text || '').replace(/\n/g, '<br>')) + '</div>' +
          '<div class="pages-btns">' + (opts.skippable !== false && i < pages.length - 1 ? '<button type="button" class="btn ghost" data-a="skip">跳過</button>' : '<span></span>') +
          (i > 0 ? '<button type="button" class="btn ghost" data-a="prev">上一頁</button>' : '') +
          '<button type="button" class="btn" data-a="next">' + (i < pages.length - 1 ? '下一頁' : '明白了') + '</button></div>';
      }
      function act(a) {
        if (a === 'skip') return done();
        if (a === 'prev') { if (i > 0) { i--; V.audio.play('cursor'); render(); } return; }
        if (i < pages.length - 1) { i++; V.audio.play('confirm'); render(); } else done();
      }
      function done() { V.audio.play('confirm'); UI.pop(modal); resolve(); }
      box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) act(b.getAttribute('data-a')); });
      modal.update = function () {
        var I = V.input;
        if (I.pressed('confirm') || I.nav('right')) act('next');
        else if (I.nav('left')) act('prev');
        else if (I.pressed('cancel') && opts.skippable !== false) done();
      };
      render(); UI.push(modal);
    });
  };

  // 條狀量表 HTML
  UI.bar = function (cls, value, max, extra) {
    var pct = U.clamp(Math.round(value / Math.max(1, max) * 100), 0, 100);
    return '<div class="bar ' + cls + '"><i style="width:' + pct + '%"></i>' + (extra || '') + '</div>';
  };
  UI.glyph = function (g, cls, note) {
    var def = V.GLYPHS[g];
    return '<span class="glyph ' + (def ? 'g-' + def.key : 'g-unknown') + ' ' + (cls || '') + '"><b>' + (g || '？') + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</span>';
  };
})();
