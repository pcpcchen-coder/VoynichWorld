/*
 * 音效：全部以 WebAudio 即時合成（無音檔）。
 * 瀏覽器規定需使用者互動後才能啟動，因此 unlock() 會在第一次按鍵／觸控時呼叫。
 * 音量分三軌：主音量、音效、環境音；設定為 0 即關閉。
 */
(function () {
  'use strict';
  var V = window.VELLORA;
  var A = V.audio = {};
  var ctx = null, master = null, sfxBus = null, ambBus = null, noiseBuf = null;
  var amb = null, ambKind = null, wanted = null;
  var vol = { master: 0.8, sfx: 0.8, ambience: 0.6 };

  A.available = !!(window.AudioContext || window.webkitAudioContext);
  A.unlock = function () {
    if (!A.available) return;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        ambBus = ctx.createGain(); ambBus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        A.setVolumes(vol);
        if (wanted) A.ambience(wanted);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  };
  A.setVolumes = function (v) {
    vol = { master: v.master, sfx: v.sfx, ambience: v.ambience };
    if (!ctx) return;
    master.gain.value = vol.master;
    sfxBus.gain.value = vol.sfx;
    ambBus.gain.value = vol.ambience * 0.6;
  };

  function env(g, t, a, peak, dec) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, dur, peak, delay, dest) {
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, peak || 0.2, dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, freq, q, peak, delay, type) {
    var t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain(); env(g, t, 0.01, peak || 0.2, dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  var GLYPH_NOTE = { '鹹': 523, '苦': 587, '焦': 440, '澀': 659, '腥': 392, '甜': 784 };

  A.play = function (name, opt) {
    if (!ctx || vol.master <= 0 || vol.sfx <= 0) return;
    opt = opt || {};
    try {
      switch (name) {
        case 'cursor': tone('square', 880, 880, 0.03, 0.04); break;
        case 'confirm': tone('triangle', 660, 990, 0.08, 0.12); break;
        case 'cancel': tone('triangle', 520, 330, 0.08, 0.1); break;
        case 'blip': tone('square', 300 + Math.random() * 40, 0, 0.018, 0.025); break;
        case 'step': noise(0.04, 500, 1, 0.03); break;
        case 'taste': {
          var f = GLYPH_NOTE[opt.glyph] || 600;
          tone('sine', f, f, 0.5, 0.16, opt.delay || 0); tone('sine', f * 2.01, f * 2.01, 0.35, 0.05, opt.delay || 0);
          break;
        }
        case 'treat': noise(0.25, 1200, 2, 0.12); tone('sine', 300, 700, 0.3, 0.12, 0.05); tone('sine', 900, 1300, 0.2, 0.06, 0.18); break;
        case 'backfire': tone('sawtooth', 160, 60, 0.4, 0.18); noise(0.3, 200, 0.8, 0.2); break;
        case 'hit': noise(0.18, 300, 0.7, 0.25); tone('square', 120, 70, 0.15, 0.08); break;
        case 'heal': [523, 659, 784].forEach(function (n, i) { tone('sine', n, n, 0.3, 0.1, i * 0.08); }); break;
        case 'item': tone('triangle', 784, 784, 0.1, 0.12); tone('triangle', 1175, 1175, 0.18, 0.1, 0.09); break;
        case 'save': [392, 523, 659, 784].forEach(function (n, i) { tone('sine', n, n, 0.4, 0.08, i * 0.1); }); break;
        case 'folio': noise(0.5, 2500, 0.6, 0.1); tone('sine', 330, 330, 1.2, 0.08, 0.2); tone('sine', 495, 495, 1.2, 0.06, 0.45); tone('sine', 660, 660, 1.4, 0.05, 0.7); break;
        case 'warp': noise(0.4, 800, 0.5, 0.08); tone('sine', 300, 150, 0.4, 0.06); break;
        case 'door': noise(0.12, 400, 1.2, 0.15); tone('triangle', 200, 160, 0.12, 0.08); break;
        case 'splash': noise(0.15, 1500, 0.8, 0.08); break;
        case 'hiss': noise(0.6, 3000, 0.4, 0.12, 0, 'highpass'); break;
        case 'craft': noise(0.2, 900, 3, 0.1); noise(0.2, 1300, 3, 0.1, 0.18); tone('sine', 440, 880, 0.5, 0.1, 0.35); break;
        case 'level': [523, 659, 784, 1047].forEach(function (n, i) { tone('triangle', n, n, 0.35, 0.12, i * 0.09); }); break;
        case 'alert': tone('square', 880, 880, 0.06, 0.1); tone('square', 1175, 1175, 0.1, 0.1, 0.08); break;
        case 'guard': tone('sine', 220, 330, 0.25, 0.1); noise(0.2, 600, 2, 0.05); break;
        case 'isolate': tone('sawtooth', 220, 110, 0.8, 0.12); noise(0.8, 250, 0.5, 0.12); break;
        case 'quest': [659, 880].forEach(function (n, i) { tone('triangle', n, n, 0.3, 0.1, i * 0.12); }); break;
        case 'error': tone('square', 150, 150, 0.12, 0.08); break;
        case 'rumble': noise(1.2, 80, 0.5, 0.35, 0, 'lowpass'); break;
        case 'chime': tone('sine', 1047, 1047, 1.0, 0.07); tone('sine', 1568, 1568, 0.8, 0.04, 0.05); break;
      }
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  };

  // ---- 環境音 ----
  // kind：village 風＋遠處鐘管草；wild 風＋高頻蟲鳴；cave 低鳴＋滴水；indoor 爐火；none 靜音
  A.ambience = function (kind) {
    wanted = kind;
    if (!ctx) return;
    if (ambKind === kind) return;
    stopAmb();
    ambKind = kind;
    if (!kind || kind === 'none') return;
    var nodes = [], out = ctx.createGain(); out.gain.value = 0.0001; out.connect(ambBus);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
    function wind(freq, q, g) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      var gg = ctx.createGain(); gg.gain.value = g;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + Math.random() * 0.05; lg.gain.value = freq * 0.4;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      s.connect(f); f.connect(gg); gg.connect(out); s.start();
      nodes.push(s, lfo);
    }
    function drone(freq, g, type) {
      var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
      var gg = ctx.createGain(); gg.gain.value = g;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = g * 0.8;
      lfo.connect(lg); lg.connect(gg.gain); lfo.start();
      o.connect(gg); gg.connect(out); o.start(); nodes.push(o, lfo);
    }
    if (kind === 'village') { wind(420, 0.6, 0.22); drone(110, 0.025); drone(165.3, 0.015); }
    else if (kind === 'wild') { wind(600, 0.5, 0.25); wind(3200, 4, 0.03); drone(98, 0.02); }
    else if (kind === 'cave') { wind(180, 0.8, 0.18); drone(55, 0.05); drone(82.5, 0.02, 'triangle'); }
    else if (kind === 'indoor') { wind(1800, 0.7, 0.04); wind(250, 0.5, 0.05); }
    else if (kind === 'wither') { wind(900, 0.4, 0.28); drone(73, 0.03, 'sawtooth'); }
    var timer = null;
    if (kind === 'cave' || kind === 'village' || kind === 'wild') {
      timer = setInterval(function () {
        if (!ctx || vol.ambience <= 0) return;
        try {
          var t = ctx.currentTime;
          if (kind === 'cave') { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(1400 + Math.random() * 600, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.12); env(g, t, 0.005, 0.05, 0.15); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2); }
          else { var o2 = ctx.createOscillator(), g2 = ctx.createGain(); var f = [220, 247, 294, 330][Math.floor(Math.random() * 4)]; o2.frequency.value = f; env(g2, t, 0.6, 0.02, 2.5); o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + 3.2); }
        } catch (e) { /* 忽略 */ }
      }, kind === 'cave' ? 2300 : 5200);
    }
    amb = { out: out, nodes: nodes, timer: timer };
  };
  function stopAmb() {
    if (!amb) return;
    var a = amb; amb = null; ambKind = null;
    if (a.timer) clearInterval(a.timer);
    try {
      a.out.gain.cancelScheduledValues(ctx.currentTime);
      a.out.gain.setValueAtTime(a.out.gain.value || 0.5, ctx.currentTime);
      a.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setTimeout(function () { a.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* 已停 */ } }); a.out.disconnect(); }, 900);
    } catch (e) { /* 忽略 */ }
  }
  A.stopAmbience = function () { wanted = null; stopAmb(); };
})();
