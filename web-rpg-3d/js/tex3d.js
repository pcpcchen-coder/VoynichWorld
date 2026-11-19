/*
 * 程式生成貼圖（canvas → THREE.CanvasTexture）。不使用任何外部圖檔。
 *   detail：活土／岩面的灰階細節（海綿孔、菌絲紋），乘在頂點色上
 *   glow：放射漸層光點（孢子、發光花、脈光）
 *   mist：柔邊霧團
 *   bark：導管根的纖維紋
 *   mark：頭上的「！」標記
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE;
  var T = V.tex3d = {};
  var cache = {};

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // 可平鋪的值雜訊
  function tileNoise(size, cells, seed) {
    var rng = V.util.rng(seed || 1), g = [], i, j;
    for (i = 0; i < cells * cells; i++) g.push(rng());
    var out = new Float32Array(size * size);
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var fx = x / size * cells, fy = y / size * cells;
      var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = g[(y0 % cells) * cells + (x0 % cells)], b = g[(y0 % cells) * cells + ((x0 + 1) % cells)];
      var c = g[((y0 + 1) % cells) * cells + (x0 % cells)], d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return out;
  }
  function fbm(size, seed, octaves) {
    var acc = new Float32Array(size * size), amp = 1, tot = 0, cells = 4;
    for (var o = 0; o < (octaves || 5); o++) {
      var n = tileNoise(size, cells, (seed || 1) * 31 + o * 7);
      for (var i = 0; i < acc.length; i++) acc[i] += n[i] * amp;
      tot += amp; amp *= 0.5; cells *= 2;
    }
    for (var k = 0; k < acc.length; k++) acc[k] /= tot;
    return acc;
  }
  function toTex(c, repeat) {
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }

  // 地面細節：亮度約 0.75–1.1，帶海綿孔與細紋
  T.detail = function () {
    if (cache.detail) return cache.detail;
    var S = 256, c = canvas(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
    var n = fbm(S, 3, 6), rng = V.util.rng(99);
    for (var i = 0; i < S * S; i++) {
      var v = 0.8 + n[i] * 0.38;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = Math.max(0, Math.min(255, v * 210));
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // 海綿孔
    for (var k = 0; k < 140; k++) {
      var x = rng() * S, y = rng() * S, r = 0.8 + rng() * 2.6;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        ctx.fillStyle = 'rgba(30,20,20,' + (0.18 + rng() * 0.25) + ')';
        ctx.beginPath(); ctx.arc(x + dx * S, y + dy * S, r, 0, 6.283); ctx.fill();
      }
    }
    // 菌絲細紋
    ctx.strokeStyle = 'rgba(240,235,220,0.10)'; ctx.lineWidth = 0.8;
    for (var m = 0; m < 40; m++) {
      var px = rng() * S, py = rng() * S; ctx.beginPath(); ctx.moveTo(px, py);
      for (var s = 0; s < 6; s++) { px += (rng() - 0.5) * 30; py += (rng() - 0.5) * 30; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    return (cache.detail = toTex(c, true));
  };

  // 岩面：層理＋礦物斑
  T.rock = function () {
    if (cache.rock) return cache.rock;
    var S = 256, c = canvas(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
    var n = fbm(S, 7, 5), n2 = fbm(S, 13, 3);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var i = y * S + x;
      var strata = 0.5 + 0.5 * Math.sin((y / S) * Math.PI * 2 * 9 + n2[i] * 9);
      var v = 0.7 + n[i] * 0.35 + strata * 0.12;
      img.data[i * 4] = Math.min(255, v * 205); img.data[i * 4 + 1] = Math.min(255, v * 200); img.data[i * 4 + 2] = Math.min(255, v * 196);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return (cache.rock = toTex(c, true));
  };

  // 樹皮／導管根：縱向纖維
  T.bark = function () {
    if (cache.bark) return cache.bark;
    var S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rng = V.util.rng(5);
    ctx.fillStyle = '#c9c0b4'; ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 70; i++) {
      var x = rng() * S, w = 1 + rng() * 3;
      ctx.fillStyle = 'rgba(' + (rng() < 0.5 ? '60,40,30' : '255,250,240') + ',' + (0.08 + rng() * 0.18) + ')';
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (rng() - 0.5) * 12, S * 0.33, x + (rng() - 0.5) * 12, S * 0.66, x, S);
      ctx.lineTo(x + w, S); ctx.bezierCurveTo(x + w, S * 0.6, x + w, S * 0.3, x + w, 0); ctx.fill();
    }
    return (cache.bark = toTex(c, true));
  };

  // 犢皮（膜牆、棚屋、骨紙白的器物）
  T.vellum = function () {
    if (cache.vellum) return cache.vellum;
    var S = 128, c = canvas(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
    var n = fbm(S, 21, 5);
    for (var i = 0; i < S * S; i++) {
      var v = 0.86 + n[i] * 0.2;
      img.data[i * 4] = Math.min(255, v * 230); img.data[i * 4 + 1] = Math.min(255, v * 220); img.data[i * 4 + 2] = Math.min(255, v * 198); img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(120,90,60,0.18)';
    for (var k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(0, k * 16 + 8); ctx.bezierCurveTo(40, k * 16 + 4, 90, k * 16 + 12, S, k * 16 + 8); ctx.stroke(); }
    return (cache.vellum = toTex(c, true));
  };

  // 放射光點
  T.glow = function () {
    if (cache.glow) return cache.glow;
    var S = 64, c = canvas(S, S), ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (cache.glow = t);
  };

  // 霧團：柔邊、不規則
  T.mist = function () {
    if (cache.mist) return cache.mist;
    var S = 128, c = canvas(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S), n = fbm(S, 41, 4);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2), d = Math.sqrt(dx * dx + dy * dy);
      var a = Math.max(0, 1 - d) * (0.45 + n[y * S + x] * 0.9);
      var i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.max(0, Math.min(255, a * a * 255));
    }
    ctx.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (cache.mist = t);
  };

  // 葉片（灌叢、樹冠用；帶透明的分岔葉脈）
  T.leaf = function () {
    if (cache.leaf) return cache.leaf;
    var S = 128, c = canvas(S, S), ctx = c.getContext('2d'), rng = V.util.rng(11);
    for (var i = 0; i < 26; i++) {
      var x = 10 + rng() * (S - 20), y = 10 + rng() * (S - 20), r = 8 + rng() * 16, a = rng() * 6.28;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      var g = ctx.createLinearGradient(-r, 0, r, 0);
      g.addColorStop(0, 'rgba(70,80,140,1)'); g.addColorStop(1, 'rgba(160,170,220,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(180,240,235,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
      ctx.restore();
    }
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (cache.leaf = t);
  };

  // 頭上標記
  T.mark = function () {
    if (cache.mark) return cache.mark;
    var S = 64, c = canvas(S, S), ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(11,10,14,0.85)'; ctx.beginPath(); ctx.ellipse(32, 28, 15, 24, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#D8CCB3'; ctx.beginPath(); ctx.ellipse(32, 28, 12, 21, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#D66A32'; ctx.fillRect(28, 12, 8, 21); ctx.fillRect(28, 37, 8, 7);
    ctx.fillStyle = 'rgba(11,10,14,0.85)'; ctx.beginPath(); ctx.moveTo(26, 49); ctx.lineTo(38, 49); ctx.lineTo(32, 60); ctx.fill();
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (cache.mark = t);
  };

  // 天空：上靛下橙，低角度的橙矮星
  T.skyColors = {
    dawn: { top: '#1d2a4a', mid: '#8a5a5a', low: '#e88a4a', sun: '#ffb070', fog: '#7a8a8c' },
    day: { top: '#2a3f66', mid: '#7f8fa0', low: '#e0a070', sun: '#ffc890', fog: '#8a9a98' },
    dusk: { top: '#141c38', mid: '#4a3a5a', low: '#b8604a', sun: '#ff9060', fog: '#4a4a62' },
    wither: { top: '#4a4a4c', mid: '#8a7a6c', low: '#c09a70', sun: '#ffd8a0', fog: '#9a9080' },
    cave: { top: '#0a0e14', mid: '#0b0d14', low: '#121820', sun: '#000000', fog: '#1a2c32' },
    indoor: { top: '#0b0a0e', mid: '#0b0a0e', low: '#0b0a0e', sun: '#000000', fog: '#14100c' },
    none: { top: '#2a3f66', mid: '#7f8fa0', low: '#e0a070', sun: '#ffc890', fog: '#8a9a98' }
  };
})();
