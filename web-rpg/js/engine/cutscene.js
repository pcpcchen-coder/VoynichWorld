/*
 * 過場腳本：指令序列。任何「動作」（見 rules.js 的 ACTIONS）都可直接當過場指令使用，
 * 另外加上等待／畫面控制類指令（CUTSCENE_CMDS）。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game;
  var C = V.cutscene = {};
  var imgEl = null;
  C.running = 0;

  C.isCmd = function (n) { return !!V.rules.CUTSCENE_CMDS[n]; };

  C.play = async function (id) {
    var cs = V.data.cutscenes[id];
    if (!cs) { console.warn('找不到過場', id); return; }
    var cmds = Array.isArray(cs) ? cs : cs.commands;
    V.field.busy++; C.running++;
    try { await C.run(cmds); }
    finally {
      C.running--; V.field.busy--;
      closeImage();
      V.field.refresh();
    }
  };
  C.run = async function (cmds) {
    for (var i = 0; i < cmds.length; i++) {
      var c = cmds[i];
      if (C.isCmd(c[0])) await C.cmd(c); else await Gm.do(c);
    }
  };

  function waitConfirm(el) {
    return new Promise(function (resolve) {
      var modal = { kind: 'wait', el: el, update: function () { if (V.input.pressed('confirm') || V.input.pressed('cancel')) { UI.pop(modal); resolve(); } } };
      if (el) el.onclick = function () { V.audio.unlock(); V.input.press('confirm'); };
      UI.push(modal);
    });
  }
  function closeImage() { if (imgEl && imgEl.parentNode) imgEl.parentNode.removeChild(imgEl); imgEl = null; }

  C.cmd = async function (c) {
    var F = V.field, Dg = V.dialogue;
    switch (c[0]) {
      case 'say':
        await Dg.say(c.length > 2 ? { speaker: c[1], style: 'normal', text: c[2] } : c[1]);
        Dg.hide(); break;
      case 'move': await F.moveActor(c[1], c[2], c[3]); break;
      case 'face': { var a = F.ent(c[1]); if (a) a.dir = c[2]; break; }
      case 'camera':
        if (c[1] === 'player' || c[1] == null) await F.cameraTo(null, null, c[2] || 0);
        else if (typeof c[1] === 'string') { var e = F.ent(c[1]); if (e) await F.cameraTo(e.x, e.y, c[2] || 0); }
        else await F.cameraTo(c[1], c[2], c[3] || 0);
        break;
      case 'fade': await UI.fade(c[1], c[2] == null ? 500 : c[2], c[3] || '#0b0a0e'); break;
      case 'image': {
        closeImage();
        imgEl = UI.el('div', 'cs-image',
          '<div class="cs-frame"><img alt="" src="' + U.esc(c[1]) + '"></div>' +
          (c[3] ? '<div class="cs-title">' + U.esc(c[3]) + '</div>' : ''));
        UI.layer.appendChild(imgEl);
        V.audio.play('folio');
        await U.wait(500);
        if (c[2]) { await Dg.lines(U.toArray(c[2])); }
        else await waitConfirm(null);
        break;
      }
      case 'imageclose': closeImage(); break;
      case 'narrate': {
        var el = UI.el('div', 'cs-narrate', '<p>' + U.esc(Gm.tpl(c[1])).replace(/\n/g, '<br>') + '</p><span class="cs-next">▼</span>');
        await waitConfirm(el);
        break;
      }
      case 'wait': await U.wait(c[1]); break;
      case 'shake': F.shake(c[1] || 400, c[2] || 3); V.audio.play('rumble'); await U.wait(c[1] || 400); break;
      case 'banner': UI.banner(c[1]); break;
      case 'if':
        if (Gm.cond(c[1])) await C.run(c[2] || []); else if (c[3]) await C.run(c[3]);
        break;
      case 'lock': F.busy++; break;
      case 'unlock': F.busy = Math.max(0, F.busy - 1); break;
    }
  };
})();
