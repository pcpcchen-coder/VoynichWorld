/*
 * 味診台調劑（樣本 → 處置藥）與以物易物（單位：池糖籤）。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game;
  var Cr = V.craft = {};

  function windowed(title, kicker) {
    var el = UI.el('div', 'menu craft',
      '<div class="menu-frame panel"><div class="menu-head"><div class="craft-title"><small>' + U.esc(kicker || '') + '</small>' + U.esc(title) + '</div>' +
      '<span class="craft-purse"></span><button type="button" class="btn ghost menu-close" data-id="craft-close">離開</button></div>' +
      '<div class="craft-tabs" hidden></div>' +
      '<div class="menu-body"><div class="menu-list"></div><div class="menu-detail"></div></div><div class="menu-foot"></div></div>');
    return {
      el: el, kind: 'craft', listEl: el.querySelector('.menu-list'), detailEl: el.querySelector('.menu-detail'),
      footEl: el.querySelector('.menu-foot'), purseEl: el.querySelector('.craft-purse'), tabsEl: el.querySelector('.craft-tabs')
    };
  }

  // 擴充：meta.medCap＝處置藥持有上限
  function capped(id) { var cap = V.data.meta && V.data.meta.medCap, it = V.data.items[id]; return !!(cap && it && it.cat === 'medicine' && Gm.count(id) >= cap); }
  Cr.capped = capped;
  Cr.canCraft = function (r) {
    if ((r.level || 1) > Gm.s.level) return false;
    if (capped(r.output)) return false;
    if (r.cond && !Gm.cond(r.cond)) return false;
    return Object.keys(r.inputs).every(function (id) { return Gm.count(id) >= r.inputs[id]; });
  };
  Cr.doCraft = function (rid) {
    var r = V.data.recipes[rid];
    if (!r || !Cr.canCraft(r)) return false;
    Object.keys(r.inputs).forEach(function (id) { Gm.take(id, r.inputs[id], true); });
    Gm.give(r.output, r.count || 1, true);
    Gm.s.stats.crafted++;
    U.toArray(r.flags).forEach(function (f) { Gm.setFlag(f, true); });
    return true;
  };

  // ---- 調劑 ----
  Cr.openAltar = function (name) {
    return new Promise(function (resolve) {
      var w = windowed(name || '味診台', '調劑');
      function items() {
        return Object.keys(V.data.recipes).filter(function (id) { var r = V.data.recipes[id]; return !r.hidden || Gm.cond(r.hidden); }).map(function (id) {
          var r = V.data.recipes[id], out = V.data.items[r.output], ok = Cr.canCraft(r);
          return { id: id, label: U.esc(r.name || out.name), icon: V.gfx.icon(out.icon), right: '持有 ' + Gm.count(r.output), cls: ok ? '' : 'dim', sub: ok ? '可調配' : ((r.level || 1) > Gm.s.level ? '需要等級 ' + r.level : '材料不足') };
        });
      }
      function detail(it) {
        if (!it) { w.detailEl.innerHTML = '<p class="muted pad">還沒有學會任何配方。</p>'; return; }
        var r = V.data.recipes[it.id], out = V.data.items[r.output];
        var ins = Object.keys(r.inputs).map(function (id) {
          var have = Gm.count(id), need = r.inputs[id], d = V.data.items[id];
          return '<li class="' + (have >= need ? 'ok' : 'lack') + '"><img alt="" src="' + V.gfx.icon(d.icon) + '">' + U.esc(d.name) + '<em>' + have + ' / ' + need + '</em></li>';
        }).join('');
        w.detailEl.innerHTML = '<div class="it-card"><img class="it-big" alt="" src="' + V.gfx.icon(out.icon) + '"><h2>' + U.esc(out.name) + (r.count > 1 ? ' ×' + r.count : '') + '</h2>' +
          '<p class="tag">處置藥' + (out.treats ? '・對「' + out.treats + '」' : '') + ((r.level || 1) > 1 ? '・等級 ' + r.level : '') + '</p>' +
          '<p>' + U.esc(r.desc || out.desc || '') + '</p><h3>材料</h3><ul class="craft-ins">' + ins + '</ul></div>';
      }
      var list = new UI.List(w.listEl, {
        onMove: detail, onCancel: done,
        onDisabled: function () { UI.toast('材料或等級不足。', 'warn'); },
        onChoose: function (it) {
          if (!Cr.doCraft(it.id)) { V.audio.play('error'); UI.toast('材料或等級不足。', 'warn'); return; }
          var r = V.data.recipes[it.id], out = V.data.items[r.output];
          V.audio.play('craft');
          w.el.classList.remove('crafted'); void w.el.offsetWidth; w.el.classList.add('crafted');
          UI.toast('調配完成：' + out.name + (r.count > 1 ? ' ×' + r.count : ''), 'item', out.icon);
          list.set(items(), true); detail(list.current());
        }
      });
      function done() { UI.pop(w); resolve(); }
      w.el.querySelector('.menu-close').addEventListener('click', function () { V.audio.play('cancel'); done(); });
      w.footEl.textContent = '確認：調配一份　取消：離開';
      w.update = function () { list.update(); };
      UI.push(w);
      list.set(items());
      if (!list.items.length) detail(null);
    });
  };

  // ---- 以物易物 ----
  Cr.openShop = function (id) {
    var shop = V.data.shops[id];
    if (!shop) { console.warn('找不到商店', id); return Promise.resolve(); }
    var cur = shop.currency || (V.data.meta && V.data.meta.currency);
    var curDef = V.data.items[cur] || { name: '池糖籤' };
    return new Promise(function (resolve) {
      var w = windowed(shop.name || '以物易物', '交換');
      var mode = 'buy';
      w.tabsEl.hidden = false;
      w.tabsEl.innerHTML = '<button type="button" class="tab" data-m="buy">換入</button><button type="button" class="tab" data-m="sell">換出</button>';
      w.tabsEl.addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) { mode = b.getAttribute('data-m'); V.audio.play('cursor'); refresh(); } });
      function purse() { w.purseEl.innerHTML = '<img alt="" src="' + V.gfx.icon(curDef.icon) + '">' + U.esc(curDef.name) + ' <b>' + Gm.count(cur) + '</b>'; }
      function items() {
        var src = mode === 'buy' ? (shop.stock || []) : (shop.buys || []);
        return src.filter(function (e) { return Gm.cond(e.cond); }).map(function (e) {
          var d = V.data.items[e.item];
          var left = mode === 'buy' && e.qty != null ? e.qty - (Gm.s.flags['shop:' + id + ':' + e.item] || 0) : null;   // 擴充：qty＝存量
          var ok = mode === 'buy' ? Gm.count(cur) >= e.price && left !== 0 && !capped(e.item) : Gm.count(e.item) > 0;
          return { id: e.item, label: U.esc(d.name), icon: V.gfx.icon(d.icon), right: (mode === 'buy' ? '' : '+') + e.price + ' 籤', sub: '持有 ' + Gm.count(e.item) + (left != null ? '・存量 ' + left : ''), cls: ok ? '' : 'dim', data: e, left: left };
        });
      }
      function detail(it) {
        if (!it) { w.detailEl.innerHTML = '<p class="muted pad">' + (mode === 'buy' ? '這裡沒有可換的東西。' : '對方不收妳手上的東西。') + '</p>'; return; }
        var d = V.data.items[it.id];
        w.detailEl.innerHTML = '<div class="it-card"><img class="it-big" alt="" src="' + V.gfx.icon(d.icon) + '"><h2>' + U.esc(d.name) + '</h2><p class="tag">' + (V.menu.CAT[d.cat] || '') + '</p><p>' + U.esc(d.desc || '') + '</p>' +
          '<p class="fine">' + (mode === 'buy' ? '以 ' + it.data.price + ' 張' + curDef.name + '換入一份。' : '換出一份，得到 ' + it.data.price + ' 張' + curDef.name + '。') + '</p></div>';
      }
      var list = new UI.List(w.listEl, {
        onMove: detail, onCancel: done,
        onChoose: function (it) {
          var e = it.data;
          if (mode === 'buy') {
            if (it.left === 0) { V.audio.play('error'); UI.toast('這樣已經換完了。', 'warn'); return; }
            if (capped(e.item)) { V.audio.play('error'); UI.toast('這種藥已經帶滿了。', 'warn'); return; }
            if (Gm.count(cur) < e.price) { V.audio.play('error'); UI.toast(curDef.name + '不夠。', 'warn'); return; }
            Gm.take(cur, e.price, true); Gm.give(e.item, 1, true);
            if (e.qty != null) Gm.s.flags['shop:' + id + ':' + e.item] = (Gm.s.flags['shop:' + id + ':' + e.item] || 0) + 1;
            if (e.say && !Gm.s.flags['shop:' + id + ':' + e.item + ':said']) { Gm.s.flags['shop:' + id + ':' + e.item + ':said'] = true; UI.toast(e.say); }
          } else {
            if (Gm.count(e.item) < 1) { V.audio.play('error'); UI.toast('手上沒有這樣東西。', 'warn'); return; }
            Gm.take(e.item, 1, true); Gm.give(cur, e.price, true);
          }
          V.audio.play('item'); purse();
          list.set(items(), true); detail(list.current());
        }
      });
      function refresh() {
        Array.prototype.forEach.call(w.tabsEl.children, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === mode); });
        purse(); list.set(items()); if (!list.items.length) detail(null);
      }
      function done() { UI.pop(w); resolve(); }
      w.el.querySelector('.menu-close').addEventListener('click', function () { V.audio.play('cancel'); done(); });
      w.footEl.textContent = '左右：切換換入／換出　確認：交換一份　取消：離開';
      w.update = function () {
        if (V.input.nav('left') || V.input.nav('right')) { mode = mode === 'buy' ? 'sell' : 'buy'; V.audio.play('cursor'); refresh(); return; }
        if (list.items.length) list.update(); else if (V.input.pressed('cancel')) done();
      };
      UI.push(w);
      refresh();
    });
  };
})();
