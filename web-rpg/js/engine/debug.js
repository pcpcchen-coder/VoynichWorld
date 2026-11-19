/*
 * 偵錯 API：只有網址帶 ?debug=1 時才掛到 window.__vellora，供自動化測試使用。
 * 平時不暴露任何作弊熱鍵。
 */
(function () {
  'use strict';
  var V = window.VELLORA;
  V.debugInit = function () {
    var Gm = V.game, F = V.field, B = V.battle, UI = V.ui;
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    var api = window.__vellora = {
      V: V,
      ready: true,
      state: function () { return Gm.s; },
      scene: function () { return V.scene; },
      ui: function () { return UI.stack.map(function (m) { return m.kind; }); },
      busy: function () { return F.busy > 0 || UI.stack.length > 0 || !!(F.player && (F.player.step || F.player.queue)); },
      player: function () { var p = F.player; return p ? { map: F.map.id, x: p.x, y: p.y, dir: p.dir, moving: !!p.step } : null; },
      speed: function (n) { V.runtime.speed = n; return n; },
      press: function (name) { V.input.press(name); },
      hold: function (name, on) { V.input.setHeld(name, on); },
      setFlag: function (n, v) { Gm.setFlag(n, v === undefined ? true : v); F.refresh(); },
      give: function (id, n) { Gm.give(id, n || 1, true); },
      setStat: function (k, v) { Gm.s[k] = v; },
      teleport: async function (map, x, y, dir) { await F.warp(map, x, y, dir || 'down', { noSave: true }); return api.player(); },
      face: function (dir) { F.player.dir = dir; },
      entities: function () { return F.map.ents.map(function (e) { return { id: e.id, type: e.type, kind: e.def.kind, x: e.x, y: e.y, visible: e.visible, done: e.done }; }); },
      battle: function () {
        var st = B.st; if (!st) return null;
        return { id: st.id, turn: st.turn, menu: st.menu, imbalance: st.imbalance, result: st.result, residue: st.residue,
          truth: st.seq.map(function (g) { return g.g; }), known: st.seq.map(function (g) { return g.known; }),
          awaiting: !!st.resolveCmd, items: st.list.items.map(function (i) { return i.id; }) };
      },
      battleExec: function (cmd) { return B.exec(cmd); },
      // 自動完成目前的遭遇（以正確處置穩定對象）
      winEncounter: async function () {
        var guard = 0;
        while (guard++ < 400) {
          var top = UI.top();
          if (!B.st) return Gm.s.flags.last_result;
          if (top && top.kind === 'pages') { V.input.press('cancel'); await sleep(40); continue; }
          if (top && top.kind === 'result') { V.input.press('confirm'); await sleep(40); continue; }
          var st = B.st;
          if (st.resolveCmd && !st.result) {
            Gm.s.stamina = Gm.maxStamina(); Gm.s.load = 0;
            var front = st.seq[0].g;
            if (front === '甜') { st.seq[0].known = '甜'; B.exec({ cmd: 'guard' }); }
            else if (front === '腥') B.exec({ cmd: 'clear' });
            else {
              var id = Object.keys(V.data.items).filter(function (k) { return V.data.items[k].treats === front; })[0];
              if (!id) { st.seq.shift(); B.exec({ cmd: 'guard' }); }
              else { if (!Gm.count(id)) Gm.give(id, 1, true); B.exec({ cmd: 'treat', item: id }); }
            }
          }
          await sleep(30);
        }
        return 'timeout';
      },
      save: function (slot) { return V.save.write(slot || 'slot1'); },
      errors: []
    };
    window.addEventListener('error', function (e) { api.errors.push(String(e.message || e)); });
    window.addEventListener('unhandledrejection', function (e) { api.errors.push('unhandledrejection: ' + String(e.reason && e.reason.stack || e.reason)); });
  };
})();
