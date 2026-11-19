/*
 * 對話：名牌、打字機效果、自動分頁、選項分支、條件與動作。
 * 特殊名牌：訊號（漣〔訊號：…〕（珂潾譯：…））與眾聲（穹母〔眾聲〕）。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, R = V.rules, UI = V.ui, Gm = V.game;
  var Dg = V.dialogue = {};
  var box = null, modal = null, state = null;
  var SPEEDS = { slow: 22, normal: 42, fast: 90, instant: 100000 };
  var BREAK = '。！？…」）—，、；';

  function ensure() {
    if (box) return;
    box = UI.el('div', 'dlg-wrap',
      '<div class="dlg-choices panel" hidden></div>' +
      '<div class="dlg panel"><div class="dlg-name" hidden></div><div class="dlg-signal" hidden></div>' +
      '<div class="dlg-text"></div><div class="dlg-next" aria-hidden="true">▼</div></div>');
    box.querySelector('.dlg').addEventListener('click', function () { V.audio.unlock(); V.input.press('confirm'); });
    modal = { kind: 'dialogue', el: box, update: update };
  }
  function show() { ensure(); if (UI.stack.indexOf(modal) < 0) UI.push(modal); }
  Dg.hide = function () { if (modal && UI.stack.indexOf(modal) >= 0) UI.pop(modal); state = null; };
  Dg.active = function () { return !!modal && UI.stack.indexOf(modal) >= 0; };

  // 依對話框實際大小把文字切成頁
  function paginate(textEl, text) {
    var pages = [], rest = text;
    var maxH = textEl.clientHeight + 1;
    var guard = 0;
    while (rest.length && guard++ < 50) {
      textEl.textContent = rest;
      if (textEl.scrollHeight <= maxH) { pages.push(rest); break; }
      var lo = 1, hi = rest.length;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        textEl.textContent = rest.slice(0, mid);
        if (textEl.scrollHeight <= maxH) lo = mid; else hi = mid - 1;
      }
      var cut = lo;
      for (var k = 0; k < 14 && cut - k > 8; k++) {
        if (BREAK.indexOf(rest.charAt(cut - k - 1)) >= 0) { cut = cut - k; break; }
      }
      pages.push(rest.slice(0, cut));
      rest = rest.slice(cut).replace(/^\s+/, '');
    }
    textEl.textContent = '';
    return pages.length ? pages : [''];
  }

  // 顯示一行（可能跨多頁），等玩家按確認後 resolve
  Dg.say = function (line, defSpeaker) {
    var L = R.parseLine(line);
    if (typeof line === 'string' && L.style === 'narration' && defSpeaker) L = { speaker: defSpeaker, style: 'normal', text: line };
    show();
    var nameEl = box.querySelector('.dlg-name'), sigEl = box.querySelector('.dlg-signal'),
      textEl = box.querySelector('.dlg-text'), dlg = box.querySelector('.dlg');
    box.querySelector('.dlg-choices').hidden = true;
    dlg.className = 'dlg panel style-' + L.style;
    if (L.speaker) {
      nameEl.hidden = false;
      nameEl.innerHTML = '<span>' + U.esc(L.speaker) + '</span>' + (L.style === 'chorus' ? '<em>眾聲</em>' : (L.style === 'tagged' ? '<em>' + U.esc(L.tag) + '</em>' : ''));
    } else nameEl.hidden = true;
    if (L.style === 'signal') {
      sigEl.hidden = false;
      sigEl.innerHTML = '<span class="sig-wave" aria-hidden="true"></span>' + U.esc(L.signal);
    } else sigEl.hidden = true;
    var text = Gm.s ? Gm.tpl(L.text) : L.text;
    var prefix = L.style === 'signal' ? '（' + L.translator + '譯）' : '';
    var pages = paginate(textEl, prefix + text);
    return new Promise(function (resolve) {
      state = { mode: 'say', pages: pages, page: 0, shown: 0, acc: 0, textEl: textEl, resolve: resolve, style: L.style, blipT: 0 };
      dlg.classList.remove('done');
      if (L.style === 'chorus') textEl.setAttribute('data-echo', '');
    });
  };

  function update(dt) {
    if (!state) return;
    var I = V.input;
    if (state.mode === 'choice') { state.list.update(); return; }
    var pg = state.pages[state.page];
    var cps = SPEEDS[(V.save && V.save.settings.textSpeed) || 'normal'] || 42;
    if (state.shown < pg.length) {
      state.acc += dt * cps;
      var n = Math.floor(state.acc);
      if (n > 0) {
        state.acc -= n; state.shown = Math.min(pg.length, state.shown + n);
        state.textEl.textContent = pg.slice(0, state.shown);
        if (state.style === 'chorus') state.textEl.setAttribute('data-echo', pg.slice(0, state.shown));
        state.blipT -= n; if (state.blipT <= 0) { V.audio.play('blip'); state.blipT = 3; }
      }
      if (I.pressed('confirm') || I.pressed('cancel')) {
        state.shown = pg.length; state.textEl.textContent = pg;
        if (state.style === 'chorus') state.textEl.setAttribute('data-echo', pg);
      }
      if (state.shown >= pg.length) box.querySelector('.dlg').classList.add('done');
      return;
    }
    box.querySelector('.dlg').classList.add('done');
    if (I.pressed('confirm') || I.pressed('cancel')) {
      V.audio.play('cursor');
      if (state.page < state.pages.length - 1) {
        state.page++; state.shown = 0; state.acc = 0; state.textEl.textContent = '';
        box.querySelector('.dlg').classList.remove('done');
      } else {
        var r = state.resolve; state = null; r();
      }
    }
  }

  // 顯示選項；回傳被選的索引
  Dg.choice = function (choices) {
    show();
    var ce = box.querySelector('.dlg-choices');
    ce.hidden = false;
    return new Promise(function (resolve) {
      var list = new UI.List(ce, {
        onChoose: function (it, i) { ce.hidden = true; state = null; resolve(it.data); }
      });
      list.set(choices.map(function (c, i) { return { id: 'choice' + i, label: U.esc(Gm.tpl(c.text)), data: i }; }));
      state = { mode: 'choice', list: list };
    });
  };

  // 連續播放多行
  Dg.lines = async function (lines, speaker) {
    lines = U.toArray(lines);
    for (var i = 0; i < lines.length; i++) await Dg.say(lines[i], speaker);
    Dg.hide();
  };

  // 播放 data.dialogues[id]
  //   簡式：['名：文', ...] 或 { lines:[...], actions:[...] }
  //   節點式：{ start:'a', nodes:{ a:{ text, speaker, choices, actions, next, branch } } }
  Dg.play = async function (id) {
    var d = V.data.dialogues[id];
    if (!d) { console.warn('找不到對話', id); return; }
    if (Array.isArray(d)) { await Dg.lines(d); return; }
    if (!d.nodes) {
      await Dg.lines(d.lines || [], d.speaker);
      if (d.actions) await Gm.run(d.actions);
      return;
    }
    var cur = d.start || Object.keys(d.nodes)[0], guard = 0;
    while (cur && guard++ < 500) {
      var n = d.nodes[cur];
      if (!n) { console.warn('對話 ' + id + ' 找不到節點 ' + cur); break; }
      var next = n.next;
      if (n.branch) {
        var hit = null;
        for (var b = 0; b < n.branch.length; b++) if (Gm.cond(n.branch[b].cond)) { hit = n.branch[b]; break; }
        cur = hit ? hit.next : next; continue;
      }
      var lines = U.toArray(n.text != null ? n.text : n.lines);
      for (var i = 0; i < lines.length; i++) await Dg.say(lines[i], n.speaker);
      if (n.actions) { Dg.hide(); await Gm.run(n.actions); }
      if (n.choices) {
        var opts = n.choices.filter(function (c) { return Gm.cond(c.cond); });
        if (opts.length) {
          var k = await Dg.choice(opts);
          var ch = opts[k];
          if (ch.actions) { Dg.hide(); await Gm.run(ch.actions); }
          if ('next' in ch) next = ch.next;
        }
      }
      cur = next;
    }
    Dg.hide();
  };
})();
