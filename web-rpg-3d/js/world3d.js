/*
 * 由格狀地圖（共用 mapparse 的結果，含 patches）生成 3D 場景：
 *   地形（活土、岩崖、池底；頂點色＋細節貼圖）、水面（生物發光的池水 shader）、天空、光線、霧、孢子、
 *   植被（靛藍灌叢、鐘管草、發光花、管根樹、高草）、浮基小棚、室內牆、脈橋、導管根柱、家具。
 * 座標：格 (x, y) 的中心在世界座標 (x+0.5, 高度, y+0.5)。1 格＝1 單位，珂潾身高約 1.25。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE, M = V.models3d, T = V.tex3d, L = V.layouts3d;
  var W = V.world3d = {};
  var SUB = 4;   // 每格細分
  W.scene = null; W.group = null; W.cfg = null; W.pm = null;
  W.time = 0;
  W.lightSources = [];   // { x, y, z, color, intensity }：動態點光源候選

  var SOLID = { 'R': 1, '#': 1, '0': 1 };
  var GROUND_COLOR = {
    '.': '#4e3f3e', ',': '#8f7258', ';': '#2e4166', '"': '#30405c', '^': '#b5a184', 'x': '#a2927c', '!': '#8a6e3e',
    '_': '#5a5262', ':': '#6e5844', 'D': '#8c6a4c', '>': '#9a8a74', '~': '#2b5856', 'W': '#10303a', 's': '#3d7c72',
    '=': '#10303a', 'H': '#5b4334', '|': '#4a3a2e', 'R': '#6a5e58', '#': '#3a3440', '0': '#2a2630'
  };
  var MOSS = new THREE.Color('#2c3f62'), MINERAL = new THREE.Color('#8a8070');
  var OFFSET = { '~': -0.24, 's': -0.18, 'W': -0.75, '=': -0.75 };

  function isWater(ch) { return ch === '~' || ch === 'W' || ch === 's'; }

  W.init = function () {
    W.scene = new THREE.Scene();
    W.sun = new THREE.DirectionalLight(0xffb070, 2.4);
    W.sun.castShadow = true;
    W.sunTarget = new THREE.Object3D(); W.scene.add(W.sunTarget); W.sun.target = W.sunTarget;
    W.scene.add(W.sun);
    W.hemi = new THREE.HemisphereLight(0x6a8ab0, 0x3a2a28, 1.0); W.scene.add(W.hemi);
    W.amb = new THREE.AmbientLight(0x404050, 0.25); W.scene.add(W.amb);
    W.points = [];
    for (var i = 0; i < 6; i++) { var pl = new THREE.PointLight(0x73D6D0, 0, 6, 1.6); pl.castShadow = false; W.scene.add(pl); W.points.push(pl); }
    W.sky = makeSky(); W.scene.add(W.sky);
    W.scene.fog = new THREE.FogExp2(0x7a8a8c, 0.025);
    W.spores = makeSpores(); W.scene.add(W.spores);
    V.on('quality', function () { if (W.pm) applyQuality(); });
  };

  function applyQuality() {
    var p = V.quality.p();
    W.sun.castShadow = p.shadows && W.cfg.kind !== 'indoor';
    if (p.shadows) { W.sun.shadow.mapSize.set(p.shadowSize, p.shadowSize); if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; } }
    W.points.forEach(function (pl, j) { pl.visible = j < p.lights; });
    W.spores.geometry.setDrawRange(0, Math.floor(W.spores.userData.count * p.spores * W.sporeDensity));
    if (W.mistGroup) W.mistGroup.visible = p.mist;
    if (W.grassMesh) W.grassMesh.count = Math.floor(W.grassMesh.userData.full * p.grass);
    // 低畫質：所有材質重新編譯（陰影開關）
    W.scene.traverse(function (o) { if (o.material && o.material.needsUpdate !== undefined) { if (Array.isArray(o.material)) o.material.forEach(function (m) { m.needsUpdate = true; }); else o.material.needsUpdate = true; } });
  }
  W.applyQuality = applyQuality;

  // ======================= 天空 =======================
  function makeSky() {
    var g = new THREE.SphereGeometry(400, 32, 16);
    var m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(1, 0.2, 0) }, time: { value: 0 }, hills: { value: 1 }, hillCol: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform vec3 top, mid, low, sunCol, sunDir, hillCol; uniform float time, hills; varying vec3 vP;',
        'float h1(float n){ return fract(sin(n)*43758.5453); }',
        'float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(h1(i),h1(i+1.0),f); }',
        'float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); float a=h1(i.x+i.y*57.0), b=h1(i.x+1.0+i.y*57.0), c=h1(i.x+(i.y+1.0)*57.0), d=h1(i.x+1.0+(i.y+1.0)*57.0); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
        'void main(){',
        '  float y = vP.y; vec3 c = mix(low, mid, smoothstep(-0.02, 0.18, y)); c = mix(c, top, smoothstep(0.15, 0.7, y));',
        '  float sd = max(dot(vP, normalize(sunDir)), 0.0);',
        '  c += sunCol * (pow(sd, 6.0) * 0.35 + pow(sd, 60.0) * 0.8) ; c = mix(c, vec3(1.0,0.93,0.8), smoothstep(0.9975, 0.9985, sd));',
        '  float az = atan(vP.z, vP.x);',
        '  vec2 cp = vec2(az * 3.0 + time * 0.004, y * 9.0);',
        '  float cl = n2(cp * vec2(1.0, 3.0)) * 0.6 + n2(cp * vec2(2.3, 7.0)) * 0.4;',
        '  float band = smoothstep(0.03, 0.12, y) * (1.0 - smoothstep(0.25, 0.5, y));',
        '  c = mix(c, mix(c * 1.15, sunCol * 0.9 + mid * 0.3, pow(sd, 3.0)), smoothstep(0.5, 0.75, cl) * band * 0.7);',
        '  if (hills > 0.5) {',
        '    float hh = 0.02 + n1(az * 7.0) * 0.05 + n1(az * 23.0) * 0.018 + step(0.82, n1(az * 3.0)) * 0.035;',
        '    float far = 0.012 + n1(az * 4.0 + 9.0) * 0.06;',
        '    if (y < far) c = mix(c, mix(hillCol, mid, 0.55), 0.85);',
        '    if (y < hh) c = mix(c, hillCol, 0.92);',
        '  }',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}'].join('\n')
    });
    var s = new THREE.Mesh(g, m); s.renderOrder = -10; s.frustumCulled = false;
    return s;
  }

  // ======================= 孢子 =======================
  function makeSpores() {
    var N = 900, pos = new Float32Array(N * 3), ph = new Float32Array(N);
    for (var i = 0; i < N; i++) { pos[i * 3] = Math.random(); pos[i * 3 + 1] = Math.random(); pos[i * 3 + 2] = Math.random(); ph[i] = Math.random() * 100; }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    var m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, box: { value: new THREE.Vector3(36, 7, 36) }, color: { value: new THREE.Color(0x9fe9e2) }, map: { value: T.glow() }, scale: { value: 300 } },
      vertexShader: [
        'uniform float time, scale; uniform vec3 center, box; attribute float phase; varying float vA;',
        'void main(){',
        '  vec3 p = position * box;',
        '  p.y = mod(p.y + time * (0.18 + fract(phase) * 0.25), box.y);',
        '  p.x += sin(time * 0.3 + phase) * 0.8; p.z += cos(time * 0.25 + phase * 1.3) * 0.8;',
        '  vec3 w = vec3(center.x - box.x * 0.5 + mod(p.x - center.x + box.x * 0.5 + 1000.0 * box.x, box.x), center.y - 0.5 + p.y, center.z - box.z * 0.5 + mod(p.z - center.z + box.z * 0.5 + 1000.0 * box.z, box.z));',
        '  vec4 mv = modelViewMatrix * vec4(w, 1.0);',
        '  vA = (0.45 + 0.55 * sin(time * 2.0 + phase * 6.0)) * smoothstep(0.0, 0.8, p.y) * (1.0 - smoothstep(box.y - 1.5, box.y, p.y));',
        '  gl_PointSize = (0.06 + fract(phase * 7.0) * 0.08) * scale / -mv.z;',
        '  gl_Position = projectionMatrix * mv;',
        '}'].join('\n'),
      fragmentShader: 'uniform vec3 color; uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color * t.rgb, t.a * vA); }'
    });
    var pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.count = N; pts.renderOrder = 5;
    return pts;
  }

  // ======================= 水面 =======================
  function waterMaterial(chasm) {
    var u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, deep: { value: new THREE.Color(chasm ? '#0b2430' : '#0f3a44') }, shallow: { value: new THREE.Color('#1f706c') },
      glow: { value: new THREE.Color('#73D6D0') }, sky: { value: new THREE.Color('#e88a4a') }, fancy: { value: 1 }
    }]);
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true, uniforms: u,
      vertexShader: [
        'attribute float depth; varying float vD; varying vec3 vW; ',
        '#include <fog_pars_vertex>',
        'void main(){ vD = depth; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
        '#include <fog_vertex>',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float time, fancy; uniform vec3 deep, shallow, glow, sky; varying float vD; varying vec3 vW;',
        '#include <fog_pars_fragment>',
        'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }',
        'void main(){',
        '  vec2 p = vW.xz;',
        '  float w = n(p * 1.3 + vec2(time * 0.15, time * 0.11)) * 0.5 + n(p * 3.1 - vec2(time * 0.21, time * 0.07)) * 0.5;',
        '  if (vD < 0.0) discard; float dn = clamp(vD / 0.75, 0.0, 1.0); vec3 c = mix(shallow, deep, dn);',
        '  vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(V.y, 0.0), 3.0);',
        '  c = mix(c, sky, fr * 0.45 + w * 0.06);',
        '  float caust = smoothstep(0.62, 0.72, w) * (1.0 - dn) * 0.35;',
        '  c += glow * caust;',
        '  if (fancy > 0.5) { float sp = step(0.985, h(floor(p * 9.0))) * (0.5 + 0.5 * sin(time * 2.0 + h(floor(p * 9.0) + 3.0) * 30.0)); c += glow * sp * 0.9; }',
        '  float a = (mix(0.42, 0.88, dn) + fr * 0.1) * smoothstep(0.0, 0.06, vD); c += vec3(0.75, 0.95, 0.9) * (1.0 - smoothstep(0.0, 0.07, vD)) * 0.6;',
        '  gl_FragColor = vec4(c, a);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '  #include <fog_fragment>',
        '}'].join('\n')
    });
  }

  // ======================= 地形 =======================
  W.build = function (mapRt) {
    if (!W.scene) W.init();
    if (W.group) { disposeGroup(W.group); W.scene.remove(W.group); }
    W.group = new THREE.Group(); W.scene.add(W.group);
    W.lightSources = []; W.animated = []; W.mistGroup = null; W.grassMesh = null; W.steam = [];
    var pm = W.pm = mapRt.pm;
    var tone = (V.game.s && V.game.s.tones && V.game.s.tones[mapRt.id]) || mapRt.def.tone || 'day';
    var cfg = W.cfg = L.get(mapRt.id, tone);
    W.tone = tone;
    W.sporeDensity = (mapRt.def.particles && mapRt.def.particles.spores != null) ? Math.min(1.6, mapRt.def.particles.spores / 16) : ({ dusk: 1.4, cave: 1, dawn: 1, day: 0.6, indoor: 0, wither: 0.25 }[tone] || 0.6);
    SUB = V.quality.level === 'low' ? 2 : 4;   // 低畫質：地形網格減為四分之一
    buildTerrain(pm, cfg);
    buildWater(pm, cfg);
    buildDecor(pm, cfg);
    buildHouses(pm, cfg);
    if (cfg.kind === 'indoor') buildIndoor(pm, cfg);
    buildBridges(pm, cfg);
    buildMist(pm, cfg);
    setTone(tone, cfg);
    applyQuality();
  };
  function disposeGroup(g) {
    g.traverse(function (o) {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    });
  }

  // 每格分類：solid（岩、洞壁、地圖外）或可見地面
  function tileAt(pm, x, y) {
    if (x < 0 || y < 0 || x >= pm.w || y >= pm.h) return null;
    return pm.ground[y * pm.w + x];
  }
  // 平滑的值雜訊（0–1）
  function vnoise(x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, H = V.util.hash2;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = H(ix, iy, s), b = H(ix + 1, iy, s), c = H(ix, iy + 1, s), d = H(ix + 1, iy + 1, s);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  W.vnoise = vnoise;
  function isSolidCh(ch, cfg) {
    if (cfg.kind === 'indoor') return false;
    return ch == null || SOLID[ch];
  }
  // 脈橋地圖：橋面範圍內的可走格（橋上的草、花）也是橋；地圖南北外側是開闊的峽谷
  function terrainCh(pm, cfg, x, y) {
    var ch = tileAt(pm, x, y);
    if (cfg.chasm) {
      if (ch == null && x >= 4 && x < pm.w - 4) return 'W';
      if (ch != null && ch !== 'W' && ch !== '~' && ch !== '=' && !SOLID[ch] && W.bridgeBox && x >= W.bridgeBox.x0 && x <= W.bridgeBox.x1 && y >= W.bridgeBox.y0 && y <= W.bridgeBox.y1) return '=';
    }
    return ch;
  }

  function buildTerrain(pm, cfg) {
    var mg = cfg.margin || 0, w = pm.w, h = pm.h;
    var x0 = -mg, y0 = -mg, x1 = w + mg, y1 = h + mg;
    var nx = (x1 - x0) * SUB + 1, ny = (y1 - y0) * SUB + 1;
    var cliff = cfg.cliff || 2.4;
    // 1) 格級距離場：每格到最近「非實心」格的距離（chamfer）
    var TW = x1 - x0, TH = y1 - y0, dist = new Float32Array(TW * TH);
    var INF = 1e6, i, x, y;
    W.bridgeBox = null;
    if (cfg.chasm) { var bb = null; for (var by = 0; by < pm.h; by++) for (var bx = 0; bx < pm.w; bx++) if (tileAt(pm, bx, by) === '=') { if (!bb) bb = { x0: bx, x1: bx, y0: by, y1: by }; bb.x0 = Math.min(bb.x0, bx); bb.x1 = Math.max(bb.x1, bx); bb.y0 = Math.min(bb.y0, by); bb.y1 = Math.max(bb.y1, by); } W.bridgeBox = bb; }
    for (y = 0; y < TH; y++) for (x = 0; x < TW; x++) dist[y * TW + x] = isSolidCh(terrainCh(pm, cfg, x + x0, y + y0), cfg) ? INF : 0;
    var D1 = 1, D2 = 1.4142;
    for (y = 0; y < TH; y++) for (x = 0; x < TW; x++) {
      i = y * TW + x; var d = dist[i]; if (!d) continue;
      if (x > 0) d = Math.min(d, dist[i - 1] + D1);
      if (y > 0) { d = Math.min(d, dist[i - TW] + D1); if (x > 0) d = Math.min(d, dist[i - TW - 1] + D2); if (x < TW - 1) d = Math.min(d, dist[i - TW + 1] + D2); }
      dist[i] = d;
    }
    for (y = TH - 1; y >= 0; y--) for (x = TW - 1; x >= 0; x--) {
      i = y * TW + x; var d2 = dist[i]; if (!d2) continue;
      if (x < TW - 1) d2 = Math.min(d2, dist[i + 1] + D1);
      if (y < TH - 1) { d2 = Math.min(d2, dist[i + TW] + D1); if (x < TW - 1) d2 = Math.min(d2, dist[i + TW + 1] + D2); if (x > 0) d2 = Math.min(d2, dist[i + TW - 1] + D2); }
      dist[i] = d2;
    }
    function tileDist(tx, ty) { tx = Math.max(x0, Math.min(x1 - 1, tx)); ty = Math.max(y0, Math.min(y1 - 1, ty)); return dist[(ty - y0) * TW + (tx - x0)]; }

    var pos = new Float32Array(nx * ny * 3), colr = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2);
    var hts = W.hgrid = new Float32Array(nx * ny);
    W.hinfo = { x0: x0, y0: y0, nx: nx, ny: ny, sub: SUB };
    var c = new THREE.Color(), acc = new THREE.Color(), rockC = new THREE.Color(cfg.rock || (cfg.kind === 'cave' ? '#6a6680' : '#5e5a68')), mossTop = new THREE.Color(cfg.kind === 'cave' ? '#242a3a' : '#2d3a56');
    var U = V.util;
    for (var vy = 0; vy < ny; vy++) for (var vx = 0; vx < nx; vx++) {
      var px = x0 + vx / SUB, py = y0 + vy / SUB;
      // 2) 鄰近非實心格的最近距離（精確，半徑 2 格內），以及加權平均的高度偏移與顏色
      var best = INF, wsum = 0, hsum = 0; acc.setRGB(0, 0, 0);
      var tx0 = Math.floor(px), ty0 = Math.floor(py);
      for (var dy = -2; dy <= 1; dy++) for (var dx = -2; dx <= 1; dx++) {
        var tx = tx0 + dx, ty = ty0 + dy, ch = terrainCh(pm, cfg, tx, ty);
        if (isSolidCh(ch, cfg)) continue;
        var ex = Math.max(tx - px, 0, px - (tx + 1)), ey = Math.max(ty - py, 0, py - (ty + 1));
        var dd = Math.sqrt(ex * ex + ey * ey); if (dd < best) best = dd;
        var cx = tx + 0.5 - px, cy = ty + 0.5 - py, cd = Math.sqrt(cx * cx + cy * cy);
        var wt = Math.max(0, 1 - cd / 0.78); if (!wt) continue;
        wt = wt * wt;
        var off = OFFSET[ch] || 0;
        if (ch === '=' && !cfg.chasm) {   // 橋下：鄰近有水就是池底，否則是地面
          var wet = isWater(tileAt(pm, tx - 1, ty)) || isWater(tileAt(pm, tx + 1, ty)) || isWater(tileAt(pm, tx, ty - 1)) || isWater(tileAt(pm, tx, ty + 1));
          off = wet ? -0.75 : -0.3;
        }
        if (cfg.chasm && (ch === 'W' || ch === '=')) off = -9;
        if (cfg.chasm && ch === '~') off = -2.2;
        hsum += off * wt; wsum += wt;
        c.set(GROUND_COLOR[ch] || '#5b4334');
        if (ch === '=' || ch === 'W') c.set(cfg.chasm ? '#1a2a30' : GROUND_COLOR.W);
        acc.r += c.r * wt; acc.g += c.g * wt; acc.b += c.b * wt;
      }
      if (best === INF) best = 2 + Math.max(0, tileDist(Math.round(px - 0.5), Math.round(py - 0.5)) - 1);
      var base = L.baseHeight(cfg, Math.max(0, Math.min(pm.h - 0.001, py)));
      var nz = vnoise(px * 1.3, py * 1.3, 7) * 0.5 + vnoise(px * 0.35, py * 0.35, 3) * 0.5;
      var hgt;
      if (best > 0.001) {
        // 岩崖：離可走區越遠越高，外圍再緩緩抬升
        var k = U.clamp(best / 0.85, 0, 1); k = k * k * (3 - 2 * k);
        var lowRow = cfg.lowRows && cfg.lowRows.some(function (r) { return py >= r[0] && py < r[1] + 1 && px > 1 && px < pm.w - 1; });
        hgt = lowRow ? base + (wsum ? hsum / wsum * (1 - k) : 0) + k * (0.35 + nz * 0.15) : base + (wsum ? hsum / wsum * (1 - k) : 0) + k * (cliff + nz * 0.8) + Math.max(0, best - 1.5) * (cfg.kind === 'cave' ? 0.12 : 0.55) + (cfg.kind === 'cave' ? 0 : Math.max(0, best - 5) * 0.4);
        if (cfg.kind === 'outdoor' && best > 1.2) hgt += Math.sin(px * 0.35) * Math.cos(py * 0.3) * 0.8 * Math.min(1, (best - 1.2) / 3);
        var steep = U.clamp(k * 1.6 - 0.2, 0, 1);
        c.copy(rockC).multiplyScalar(0.8 + nz * 0.4);
        if (best > 1.6 && cfg.kind !== 'indoor') c.lerp(mossTop, 0.6);
        if (wsum) { acc.multiplyScalar(1 / wsum); c.lerp(acc, 1 - steep); }
      } else {
        hgt = base + (wsum ? hsum / wsum : 0);
        acc.multiplyScalar(1 / (wsum || 1)); c.copy(acc).multiplyScalar(0.88 + nz * 0.24);
        if (cfg.kind === 'outdoor' && hsum >= -0.01) {   // 活土上的靛苔斑與礦物淺斑
          var mo = vnoise(px * 0.16, py * 0.16, 11), mi = vnoise(px * 0.3 + 40, py * 0.3, 5);
          c.lerp(MOSS, U.clamp((mo - 0.5) * 2.2, 0, 0.6)); c.lerp(MINERAL, U.clamp((mi - 0.72) * 2.5, 0, 0.35));
        }
      }
      var vi = vy * nx + vx;
      hts[vi] = hgt;
      pos[vi * 3] = px; pos[vi * 3 + 1] = hgt; pos[vi * 3 + 2] = py;
      colr[vi * 3] = c.r; colr[vi * 3 + 1] = c.g; colr[vi * 3 + 2] = c.b;
      uv[vi * 2] = (px + hgt * 0.35) * 0.5; uv[vi * 2 + 1] = (py + hgt * 0.8) * 0.5;
    }
    var idx = new Uint32Array((nx - 1) * (ny - 1) * 6), k2 = 0;
    for (vy = 0; vy < ny - 1; vy++) for (vx = 0; vx < nx - 1; vx++) {
      var a = vy * nx + vx, b = a + 1, c2 = a + nx, d3 = c2 + 1;
      idx[k2++] = a; idx[k2++] = c2; idx[k2++] = b; idx[k2++] = b; idx[k2++] = c2; idx[k2++] = d3;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: T.detail(), roughness: 0.93, metalness: 0 });
    var terrain = new THREE.Mesh(g, mat);
    terrain.receiveShadow = true; terrain.castShadow = true;
    W.group.add(terrain);
    W.terrain = terrain;
  }

  // 地形高度（連續座標，單位：格）；雙線性取樣
  W.groundHeight = function (x, y) {
    var I = W.hinfo; if (!I) return 0;
    var fx = (x - I.x0) * I.sub, fy = (y - I.y0) * I.sub;
    var ix = Math.max(0, Math.min(I.nx - 2, Math.floor(fx))), iy = Math.max(0, Math.min(I.ny - 2, Math.floor(fy)));
    var tx = Math.max(0, Math.min(1, fx - ix)), ty = Math.max(0, Math.min(1, fy - iy));
    var H = W.hgrid, n = I.nx;
    var a = H[iy * n + ix], b = H[iy * n + ix + 1], c = H[(iy + 1) * n + ix], d = H[(iy + 1) * n + ix + 1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  // 人物站立高度：在脈橋上就是橋面
  W.standHeight = function (x, y) {
    var pm = W.pm; if (!pm) return 0;
    var tx = Math.floor(x), ty = Math.floor(y), ch = terrainCh(pm, W.cfg, tx, ty);
    var base = L.baseHeight(W.cfg, Math.max(0, Math.min(pm.h - 0.001, y)));
    if (ch === '=') return base + 0.06;
    // 橋頭：與橋相鄰時不要陷下去
    var g = W.groundHeight(x, y);
    var nearBridge = false;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (tileAt(pm, tx + dx, ty + dy) === '=') nearBridge = true;
    if (nearBridge && !isWater(ch)) return Math.max(g, base);
    return g;
  };
  W.waterLevel = function (x, y) {
    var pm = W.pm, ch = tileAt(pm, Math.floor(x), Math.floor(y));
    if (!isWater(ch)) return null;
    if (W.cfg.chasm && ch === 'W') return null;
    return L.baseHeight(W.cfg, Math.max(0, Math.min(pm.h - 0.001, y))) - 0.06;
  };

  function buildWater(pm, cfg) {
    // 依水位分組（階梯池每層一片），每組一張覆蓋該組範圍的網格；深度＝水位－地形高度，岸邊自然淡出
    var groups = {}, x, y;
    for (y = 0; y < pm.h; y++) for (x = 0; x < pm.w; x++) {
      var ch = tileAt(pm, x, y);
      if (!isWater(ch) && ch !== '=') continue;
      if (cfg.chasm && (ch === 'W' || ch === '=')) continue;
      if (ch === '=' && !(isWater(tileAt(pm, x - 1, y)) || isWater(tileAt(pm, x + 1, y)) || isWater(tileAt(pm, x, y - 1)) || isWater(tileAt(pm, x, y + 1)))) continue;
      var lv = Math.round((L.baseHeight(cfg, y + 0.5) - 0.06 + (cfg.chasm ? -2.0 : 0)) * 100) / 100;
      var gk = String(lv), gr = groups[gk] || (groups[gk] = { lv: lv, x0: x, x1: x, y0: y, y1: y });
      gr.x0 = Math.min(gr.x0, x); gr.x1 = Math.max(gr.x1, x); gr.y0 = Math.min(gr.y0, y); gr.y1 = Math.max(gr.y1, y);
    }
    var m = W.waterMat = waterMaterial(false);
    Object.keys(groups).forEach(function (k) {
      var gr = groups[k], R = 3;
      var gx0 = gr.x0 - 1, gy0 = gr.y0 - 1, gw = gr.x1 - gr.x0 + 3, gh = gr.y1 - gr.y0 + 3;
      var g = new THREE.PlaneGeometry(gw, gh, gw * R, gh * R); g.rotateX(-Math.PI / 2);
      var pos = g.attributes.position, dep = new Float32Array(pos.count);
      for (var i = 0; i < pos.count; i++) {
        var px = pos.getX(i) + gx0 + gw / 2, pz = pos.getZ(i) + gy0 + gh / 2;
        pos.setX(i, px); pos.setZ(i, pz); pos.setY(i, gr.lv);
        dep[i] = gr.lv - W.groundHeight(px, pz);
        // 不同水位的鄰層不畫在這一片
        if (Math.abs(L.baseHeight(cfg, Math.max(0, Math.min(pm.h - 0.01, pz))) - 0.06 - gr.lv) > 0.3 && !cfg.chasm) dep[i] = -1;
      }
      g.setAttribute('depth', new THREE.BufferAttribute(dep, 1));
      g.computeBoundingSphere();
      var water = new THREE.Mesh(g, m); water.renderOrder = 2;
      W.group.add(water);
    });
    if (cfg.chasm) {
      // 谷底的河與霧
      var pg = new THREE.PlaneGeometry(pm.w + 60, pm.h + 60); pg.rotateX(-Math.PI / 2);
      var dep = new Float32Array(pg.attributes.position.count).fill(1);
      pg.setAttribute('depth', new THREE.BufferAttribute(dep, 1));
      var cm = W.chasmMat = waterMaterial(true); cm.uniforms.sky.value.set('#20404a'); cm.uniforms.shallow.value.set('#14484a');
      var river = new THREE.Mesh(pg, cm); river.position.set(pm.w / 2, -7.5, pm.h / 2); river.renderOrder = 1;
      W.group.add(river);
    }
  }

  // ======================= 植被與物件 =======================
  function rnd(x, y, s) { return V.util.hash2(x, y, s); }
  function buildDecor(pm, cfg) {
    var bushes = [], bells = [], flowers = [], trees = [], boulders = [], fences = [], pipes = [], grass = [], furn = [];
    for (var y = 0; y < pm.h; y++) for (var x = 0; x < pm.w; x++) {
      var o = pm.objects[y * pm.w + x], g = pm.ground[y * pm.w + x];
      if (g === '"') grass.push([x, y]);
      if (!o) continue;
      if (o === 'b') bushes.push([x, y]); else if (o === 't') bells.push([x, y]); else if (o === 'f') flowers.push([x, y]);
      else if (o === 'Y') trees.push([x, y]); else if (o === 'r') boulders.push([x, y]); else if (o === 'n') fences.push([x, y]);
      else if (o === 'P') pipes.push([x, y]); else furn.push([x, y, o]);
    }
    var dummy = new THREE.Object3D();
    function sh(x, y) { return W.standHeight(x, y); }

    // 靛藍灌叢：每叢 5–7 個壓扁的多面體
    if (bushes.length) {
      var bg = new THREE.IcosahedronGeometry(0.32, 1);
      var bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
      var count = bushes.length * 6, im = new THREE.InstancedMesh(bg, bm, count), ci = 0, col = new THREE.Color();
      var pal = ['#22305a', '#2b2f66', '#1d3a5a', '#3a2f6a', '#2a4466'];
      bushes.forEach(function (b) {
        for (var k = 0; k < 6; k++) {
          var a = k * 1.1 + rnd(b[0], b[1], k) * 2, r = k ? 0.22 + rnd(b[0], b[1], k + 9) * 0.12 : 0;
          var bx = b[0] + 0.5 + Math.cos(a) * r, bz = b[1] + 0.5 + Math.sin(a) * r;
          var s = k ? 0.6 + rnd(b[0], b[1], k + 3) * 0.4 : 1.05;
          dummy.position.set(bx, sh(bx, bz) + 0.2 * s + (k ? 0 : 0.12), bz);
          dummy.scale.set(s, s * 0.78, s); dummy.rotation.set(rnd(b[0], k, 1), rnd(b[1], k, 2) * 6, 0);
          dummy.updateMatrix(); im.setMatrixAt(ci, dummy.matrix);
          col.set(pal[(b[0] * 7 + b[1] * 3 + k) % pal.length]); im.setColorAt(ci, col); ci++;
        }
      });
      im.castShadow = true; im.receiveShadow = true; W.group.add(im);
      // 葉尖的脈光
      var tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 4), M.mat('#9fe9e2', { emissive: '#73D6D0', ei: 1.6 }), bushes.length * 4), ti = 0;
      bushes.forEach(function (b) {
        for (var k = 0; k < 4; k++) {
          var bx = b[0] + 0.5 + (rnd(b[0], b[1], k + 20) - 0.5) * 0.7, bz = b[1] + 0.5 + (rnd(b[0], b[1], k + 30) - 0.5) * 0.7;
          dummy.position.set(bx, sh(bx, bz) + 0.45 + rnd(b[0], b[1], k + 40) * 0.25, bz); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
          tips.setMatrixAt(ti++, dummy.matrix);
        }
      });
      W.group.add(tips);
    }
    // 鐘管草：每格 4 支管，管口的鐘發光
    if (bells.length) {
      var tg = new THREE.CylinderGeometry(0.03, 0.045, 1, 6); tg.translate(0, 0.5, 0);
      var tm = new THREE.InstancedMesh(tg, M.mat('#6a5a4a', { map: T.bark(), rough: 0.7 }), bells.length * 4);
      var bellG = new THREE.CylinderGeometry(0.09, 0.03, 0.14, 8, 1, true);
      var belm = new THREE.InstancedMesh(bellG, M.mat('#3a5a8a', { side: THREE.DoubleSide, emissive: '#2B7D79', ei: 0.4 }), bells.length * 4);
      var glowT = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 2 }), bells.length * 4);
      var bi = 0;
      bells.forEach(function (b) {
        for (var k = 0; k < 4; k++) {
          var bx = b[0] + 0.25 + rnd(b[0], b[1], k) * 0.5, bz = b[1] + 0.25 + rnd(b[0], b[1], k + 5) * 0.5, hh = 0.7 + rnd(b[0], b[1], k + 7) * 0.7;
          var base = sh(bx, bz), lean = (rnd(b[0], b[1], k + 11) - 0.5) * 0.25;
          dummy.position.set(bx, base, bz); dummy.scale.set(1, hh, 1); dummy.rotation.set(lean, 0, (rnd(b[0], b[1], k + 13) - 0.5) * 0.25); dummy.updateMatrix(); tm.setMatrixAt(bi, dummy.matrix);
          var top = new THREE.Vector3(0, hh, 0).applyEuler(dummy.rotation).add(dummy.position);
          dummy.position.copy(top); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); belm.setMatrixAt(bi, dummy.matrix);
          dummy.position.y += 0.01; dummy.updateMatrix(); glowT.setMatrixAt(bi, dummy.matrix);
          bi++;
        }
      });
      tm.castShadow = true; W.group.add(tm, belm, glowT);
      W.animated.push({ obj: [tm, belm, glowT], kind: 'sway' });
    }
    // 發光花：莖＋發光的鐘形花＋光暈，並列為點光源候選
    flowers.forEach(function (f) {
      var gx = new THREE.Group();
      var bx = f[0] + 0.5, bz = f[1] + 0.5; gx.position.set(bx, sh(bx, bz), bz);
      var hue = ['#73D6D0', '#9fd8ff', '#bfa8ff', '#9fe9c8'][(f[0] + f[1]) % 4];
      for (var k = 0; k < 3; k++) {
        var hh = 0.35 + rnd(f[0], f[1], k) * 0.35, a = k * 2.1 + rnd(f[0], f[1], 9);
        var stem = M.mesh(M.geo('fl-stem', function () { var g = new THREE.CylinderGeometry(0.012, 0.018, 1, 4); g.translate(0, 0.5, 0); return g; }), M.mat('#2a3a4a'));
        stem.scale.set(1, hh, 1); stem.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12); stem.rotation.z = Math.cos(a) * 0.2; gx.add(stem);
        var bell = M.mesh(M.geo('fl-bell', function () { var g = new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6); g.scale(1, 1.4, 1); g.rotateX(Math.PI); return g; }), M.mat(hue, { emissive: hue, ei: 1.3, side: THREE.DoubleSide }), false);
        bell.position.set(Math.cos(a) * 0.12 + Math.sin(stem.rotation.z) * -hh * 0.2, hh, Math.sin(a) * 0.12); gx.add(bell);
      }
      var gl = M.glowSprite(hue, 1.1, 0.55); gl.position.y = 0.55; gx.add(gl);
      W.group.add(gx);
      W.lightSources.push({ x: bx, y: gx.position.y + 0.6, z: bz, color: hue, intensity: 1.2, dist: 4 });
      W.animated.push({ obj: gl, kind: 'pulse', ph: f[0] * 0.7 + f[1] });
    });
    // 管根樹：扭曲的樹幹、外露的接口根、平頂樹冠（像健康池環概念圖的傘狀樹）
    trees.forEach(function (t) {
      var gx = new THREE.Group(), bx = t[0] + 0.5, bz = t[1] + 0.5; gx.position.set(bx, sh(bx, bz), bz);
      var s = 0.85 + rnd(t[0], t[1], 1) * 0.4;
      var trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.9, 0.05), new THREE.Vector3(-0.08, 1.8, -0.06), new THREE.Vector3(0.05, 2.5, 0.02)]);
      var trunk = M.mesh(new THREE.TubeGeometry(trunkCurve, 10, 0.13, 7, false), M.mat('#7a5a44', { map: T.bark() }));
      gx.add(trunk);
      for (var r = 0; r < 5; r++) {
        var a = r * 1.26 + rnd(t[0], t[1], r) * 0.5;
        var rc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(Math.cos(a) * 0.35, 0.2, Math.sin(a) * 0.35), new THREE.Vector3(Math.cos(a) * 0.75, -0.05, Math.sin(a) * 0.75)]);
        gx.add(M.mesh(new THREE.TubeGeometry(rc, 6, 0.05, 5, false), M.mat('#6a4a38', { map: T.bark() })));
        var nub = M.mesh(M.geo('tr-nub', function () { return new THREE.SphereGeometry(0.05, 6, 4); }), M.mat('#9fe9e2', { emissive: '#2B7D79', ei: 1 }), false);
        nub.position.set(Math.cos(a) * 0.75, 0.0, Math.sin(a) * 0.75); gx.add(nub);
      }
      var canopyM = M.mat('#3b4a8c', { rough: 0.8, flat: true }), canopyM2 = M.mat('#4d5ca6', { rough: 0.8, flat: true }), under = M.mat('#2a2450', { rough: 0.9 });
      // 傘狀樹冠：幾團壓扁的葉叢，下緣有一圈深色的葉背
      var blobs = 7;
      for (var ci = 0; ci < blobs; ci++) {
        var ca = ci / blobs * Math.PI * 2 + rnd(t[0], t[1], ci) * 0.5, cr = ci ? 0.75 + rnd(t[0], t[1], ci + 3) * 0.3 : 0;
        var cb = M.mesh(M.geo('tr-blob', function () { var g = new THREE.IcosahedronGeometry(0.62, 1); g.scale(1, 0.42, 1); return g; }), ci % 2 ? canopyM : canopyM2);
        cb.position.set(Math.cos(ca) * cr, 2.6 + (ci ? 0 : 0.18) + rnd(t[0], t[1], ci + 7) * 0.12, Math.sin(ca) * cr);
        var sc2 = ci ? 0.8 + rnd(t[0], t[1], ci + 9) * 0.35 : 1.2; cb.scale.setScalar(sc2); gx.add(cb);
      }
      var ug = M.mesh(M.geo('tr-und', function () { var g = new THREE.CircleGeometry(1.45, 18); g.rotateX(Math.PI / 2); return g; }), under);
      ug.position.y = 2.5; gx.add(ug);
      for (var p = 0; p < 6; p++) {   // 懸垂的發光莢
        var pa = p * 1.05 + rnd(t[0], t[1], p + 3), pr = 0.6 + rnd(t[0], t[1], p + 4) * 0.6;
        var pod = M.mesh(M.geo('tr-pod', function () { var g = new THREE.SphereGeometry(0.05, 6, 5); g.scale(1, 1.6, 1); return g; }), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.5 }), false);
        pod.position.set(Math.cos(pa) * pr, 2.3 - rnd(t[0], t[1], p + 5) * 0.3, Math.sin(pa) * pr); gx.add(pod);
      }
      gx.scale.setScalar(s); gx.rotation.y = rnd(t[0], t[1], 2) * 6.28;
      W.group.add(gx);
      W.animated.push({ obj: gx, kind: 'tree', ph: t[0] + t[1] });
    });
    // 礦石塊
    boulders.forEach(function (b) {
      var bx = b[0] + 0.5, bz = b[1] + 0.5;
      var m = M.mesh(M.geo('boulder', function () { var g = new THREE.DodecahedronGeometry(0.45, 1); return g; }), M.mat('#8a7a68', { flat: true, map: T.rock() }));
      m.position.set(bx, sh(bx, bz) + 0.25, bz); m.scale.set(1.1, 0.75, 0.95); m.rotation.set(rnd(b[0], b[1], 1), rnd(b[0], b[1], 2) * 6, 0); m.receiveShadow = true;
      W.group.add(m);
    });
    // 根籬
    fences.forEach(function (f) {
      var gx = new THREE.Group(), bx = f[0] + 0.5, bz = f[1] + 0.5; gx.position.set(bx, sh(bx, bz), bz);
      var post = M.mesh(M.geo('fence-post', function () { var g = new THREE.CylinderGeometry(0.05, 0.07, 0.8, 6); g.translate(0, 0.4, 0); return g; }), M.mat('#6a4a38', { map: T.bark() }));
      gx.add(post);
      var horiz = tileAt(pm, f[0] - 1, f[1]) === null || (pm.objects[f[1] * pm.w + f[0] - 1] === 'n') || (pm.objects[f[1] * pm.w + f[0] + 1] === 'n');
      for (var k = 0; k < 2; k++) {
        var rail = M.mesh(M.geo('fence-rail', function () { var g = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 5); g.rotateZ(Math.PI / 2); return g; }), M.mat('#7a5a44', { map: T.bark() }));
        rail.position.y = 0.3 + k * 0.28; if (!horiz) rail.rotation.y = Math.PI / 2; gx.add(rail);
      }
      W.group.add(gx);
    });
    // 導管根柱：粗大的活體導管，帶脈光環
    pipes.forEach(function (p) {
      var gx = new THREE.Group(), bx = p[0] + 0.5, bz = p[1] + 0.5; gx.position.set(bx, sh(bx, bz), bz);
      var col2 = M.mesh(M.geo('pipe-col', function () { var g = new THREE.CylinderGeometry(0.28, 0.36, 2.2, 12); g.translate(0, 1.1, 0); return g; }), M.mat('#8a6048', { map: T.bark(), rough: 0.7 }));
      gx.add(col2);
      for (var k = 0; k < 3; k++) {
        var ring = M.mesh(M.geo('pipe-ring', function () { var g = new THREE.TorusGeometry(0.33, 0.035, 6, 16); g.rotateX(Math.PI / 2); return g; }), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.4 }), false);
        ring.position.y = 0.5 + k * 0.85; gx.add(ring);
      }
      var gl = M.glowSprite('#73D6D0', 1.6, 0.5); gl.position.y = 1.2; gx.add(gl);
      W.group.add(gx);
      W.lightSources.push({ x: bx, y: gx.position.y + 1.3, z: bz, color: '#73D6D0', intensity: 1.6, dist: 5 });
      W.animated.push({ obj: gl, kind: 'pulse', ph: p[0] });
    });
    // 家具
    furn.forEach(function (f) {
      var gx = new THREE.Group(), bx = f[0] + 0.5, bz = f[1] + 0.5; gx.position.set(bx, sh(bx, bz), bz);
      var o = f[2];
      if (o === 'k') {   // 櫃架
        var fr = M.mesh(M.geo('shelf', function () { var g = new THREE.BoxGeometry(0.9, 1.3, 0.35); g.translate(0, 0.65, 0); return g; }), M.mat('#6a4a38', { map: T.bark() })); gx.add(fr);
        for (var j = 0; j < 6; j++) {
          var jar = M.mesh(M.geo('sh-jar', function () { return new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8); }), M.mat(['#c9bc9f', '#8fc9a3', '#c58a52', '#73D6D0'][j % 4], { emissive: j % 3 ? '#000000' : '#2B7D79', ei: 0.6 }));
          jar.position.set(-0.3 + (j % 3) * 0.3, 0.45 + Math.floor(j / 3) * 0.45, 0.2); gx.add(jar);
        }
        gx.position.z -= 0.25;
      } else if (o === 'c') {
        var tp = M.mesh(M.geo('table', function () { var g = new THREE.CylinderGeometry(0.42, 0.4, 0.07, 14); g.translate(0, 0.5, 0); return g; }), M.mat('#7a5a44', { map: T.bark() })); gx.add(tp);
        var lg = M.mesh(M.geo('table-leg', function () { var g = new THREE.CylinderGeometry(0.07, 0.12, 0.5, 8); g.translate(0, 0.25, 0); return g; }), M.mat('#5a4030')); gx.add(lg);
        var cup = M.mesh(M.geo('cup', function () { return new THREE.CylinderGeometry(0.05, 0.04, 0.08, 8); }), M.mat('#c9bc9f')); cup.position.set(0.12, 0.57, 0.05); gx.add(cup);
      } else if (o === 'p') {
        for (var q = 0; q < 3; q++) {
          var pj = M.mesh(M.geo('pot', function () { var g = new THREE.SphereGeometry(0.16, 10, 8); g.scale(1, 1.25, 1); g.translate(0, 0.19, 0); return g; }), M.mat(['#98613C', '#b5774a', '#7a5040'][q], { map: T.vellum() }));
          pj.position.set(-0.2 + q * 0.2, 0, (q % 2) * 0.15 - 0.05); pj.scale.setScalar(0.8 + q * 0.12); gx.add(pj);
        }
      } else if (o === 'h') {
        var ringS = M.mesh(M.geo('hearth', function () { var g = new THREE.TorusGeometry(0.32, 0.1, 6, 14); g.rotateX(Math.PI / 2); g.translate(0, 0.1, 0); return g; }), M.mat('#6a5e58', { flat: true })); gx.add(ringS);
        var ember = M.mesh(M.geo('ember', function () { var g = new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.4, 1); return g; }), M.mat('#ff9a50', { emissive: '#D66A32', ei: 2 }), false);
        ember.position.y = 0.08; gx.add(ember);
        var hg = M.glowSprite('#ffa060', 1.4, 0.6); hg.position.y = 0.35; gx.add(hg);
        W.lightSources.push({ x: bx, y: gx.position.y + 0.6, z: bz, color: '#ff9a50', intensity: 2.4, dist: 6, warm: true });
        W.animated.push({ obj: hg, kind: 'flicker', ph: f[0] });
      } else if (o === 'm') {
        var mt = M.mesh(M.geo('mat', function () { var g = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16); g.translate(0, 0.02, 0); return g; }), M.mat('#6a5a7a', { map: T.vellum() }), false);
        mt.receiveShadow = true; gx.add(mt);
      }
      W.group.add(gx);
    });
    // 高草（靛藍細葉，實例化）
    if (grass.length) {
      var gg = new THREE.ConeGeometry(0.025, 0.5, 3); gg.translate(0, 0.25, 0);
      var per = 14, gm = new THREE.InstancedMesh(gg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), grass.length * per), gi = 0, gc = new THREE.Color();
      grass.forEach(function (t) {
        for (var k = 0; k < per; k++) {
          var gx2 = t[0] + rnd(t[0], t[1], k) , gz = t[1] + rnd(t[0], t[1], k + 50);
          dummy.position.set(gx2, sh(gx2, gz), gz); var s2 = 0.6 + rnd(t[0], k, 3) * 0.8; dummy.scale.set(1, s2, 1);
          dummy.rotation.set((rnd(k, t[1], 4) - 0.5) * 0.5, rnd(t[0], t[1], k + 9) * 6, (rnd(k, t[0], 5) - 0.5) * 0.5); dummy.updateMatrix();
          gm.setMatrixAt(gi, dummy.matrix); gc.set(k % 5 ? '#3a4a78' : '#4a7a8a'); gm.setColorAt(gi, gc); gi++;
        }
      });
      gm.userData.full = gi; W.grassMesh = gm; W.group.add(gm);
      W.animated.push({ obj: [gm], kind: 'sway' });
    }
    // 上層遮蔽：垂根（洞頂垂下的根絲）
    for (var yy = 0; yy < pm.h; yy++) for (var xx = 0; xx < pm.w; xx++) {
      var ov = pm.overlay[yy * pm.w + xx]; if (!ov) continue;
      var gx3 = new THREE.Group(), ox = xx + 0.5, oz = yy + 0.5; gx3.position.set(ox, sh(ox, oz) + 2.2, oz);
      for (var r2 = 0; r2 < 4; r2++) {
        var len = 0.6 + rnd(xx, yy, r2) * 1.0;
        var root = M.mesh(M.geo('ov-root', function () { var g = new THREE.CylinderGeometry(0.02, 0.008, 1, 4); g.translate(0, -0.5, 0); return g; }), M.mat(ov === 'o' ? '#2a3a5a' : '#6a4a38'), false);
        root.scale.set(1, len, 1); root.position.set((rnd(xx, yy, r2 + 5) - 0.5) * 0.8, 0, (rnd(xx, yy, r2 + 6) - 0.5) * 0.8); gx3.add(root);
        var tipg = M.mesh(M.geo('ov-tip', function () { return new THREE.SphereGeometry(0.025, 5, 4); }), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.5 }), false);
        tipg.position.set(root.position.x, -len, root.position.z); gx3.add(tipg);
      }
      W.group.add(gx3);
    }
    // 硫氣孔：冒煙的黃白結晶口
    for (var vy2 = 0; vy2 < pm.h; vy2++) for (var vx2 = 0; vx2 < pm.w; vx2++) {
      if (pm.ground[vy2 * pm.w + vx2] !== '!') continue;
      var cx = vx2 + 0.5, cz = vy2 + 0.5, gy = sh(cx, cz);
      var crust = M.mesh(M.geo('vent', function () { var g = new THREE.TorusGeometry(0.22, 0.08, 6, 12); g.rotateX(Math.PI / 2); return g; }), M.mat('#c9b06a', { flat: true, emissive: '#A64232', ei: 0.25 }));
      crust.position.set(cx, gy + 0.03, cz); W.group.add(crust);
      W.steam.push({ x: cx, y: gy, z: cz, n: 5, color: '#e8dca0', sulfur: true });
    }
    (cfg.steam || []).forEach(function (s) { W.steam.push({ x: s[0] + 0.5, y: W.standHeight(s[0] + 0.5, s[1] + 0.5), z: s[1] + 0.5, n: s[2], color: '#d8f0ea' }); });
    buildSteam();
  }

  // 蒸氣（溫泉）與硫煙
  function buildSteam() {
    if (!W.steam.length) return;
    var tex = T.mist(), n = 0;
    W.steam.forEach(function (s) { n += s.n; });
    var gx = new THREE.Group(); W.steamGroup = gx;
    W.steam.forEach(function (s) {
      for (var i = 0; i < s.n; i++) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(s.color), transparent: true, depthWrite: false, opacity: 0 }));
        sp.userData = { x: s.x + (Math.random() - 0.5) * 1.6, z: s.z + (Math.random() - 0.5) * 1.6, y: s.y, t: Math.random() * 4, sp: 0.3 + Math.random() * 0.3, sulfur: s.sulfur };
        gx.add(sp);
      }
    });
    W.group.add(gx);
  }

  // ======================= 浮基小棚 =======================
  function buildHouses(pm, cfg) {
    var seen = {}, x, y;
    for (y = 0; y < pm.h; y++) for (x = 0; x < pm.w; x++) {
      var ch = pm.ground[y * pm.w + x];
      if ((ch !== 'H' && !(ch === 'D' && cfg.kind !== 'indoor')) || seen[x + ',' + y]) continue;
      // 找出連通的 H／D 區塊
      var stack = [[x, y]], cells = [], minX = x, maxX = x, minY = y, maxY = y, door = null;
      seen[x + ',' + y] = 1;
      while (stack.length) {
        var c = stack.pop(); cells.push(c);
        var cc = pm.ground[c[1] * pm.w + c[0]];
        if (cc === 'D') door = c;
        minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + ',' + ny;
          if (seen[k]) return; var nc = tileAt(pm, nx, ny);
          if (nc === 'H' || nc === 'D') { seen[k] = 1; stack.push([nx, ny]); }
        });
      }
      if (cells.length < 2) continue;
      house(minX, minY, maxX, maxY, door);
    }
  }
  function house(x0, y0, x1, y1, door) {
    var w = x1 - x0 + 1, d = y1 - y0 + 1, cx = x0 + w / 2, cz = y0 + d / 2;
    var g = new THREE.Group();
    var base = W.groundHeight(cx, cz);
    g.position.set(cx, base, cz);
    var lift = 0.32;
    // 浮基：菌絲氈平台，下面是彎曲的根腳
    var plat = M.mesh(new THREE.BoxGeometry(w - 0.1, 0.16, d - 0.1), M.mat('#6a5040', { map: T.bark() }));
    plat.position.y = lift; plat.receiveShadow = true; g.add(plat);
    var legs = Math.max(4, Math.round((w + d) / 1.5));
    for (var i = 0; i < legs; i++) {
      var a = i / legs * Math.PI * 2, lx = Math.cos(a) * (w / 2 - 0.25), lz = Math.sin(a) * (d / 2 - 0.25);
      var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(lx * 0.8, lift, lz * 0.8), new THREE.Vector3(lx * 1.02, lift * 0.5, lz * 1.02), new THREE.Vector3(lx * 1.18, -0.05, lz * 1.18)]);
      g.add(M.mesh(new THREE.TubeGeometry(curve, 5, 0.06, 5, false), M.mat('#6a4a38', { map: T.bark() })));
    }
    // 膜牆：骨紙白的菌絲氈，四角略圓
    var wallH = 1.25;
    var walls = M.mesh(new THREE.CylinderGeometry(1, 1, wallH, 24, 1, true), M.mat('#d8ccb3', { map: T.vellum(), side: THREE.DoubleSide, rough: 0.95 }));
    walls.scale.set((w - 0.5) / 2 * 1.06, 1, (d - 0.5) / 2 * 1.06); walls.position.y = lift + wallH / 2 + 0.08; g.add(walls);
    // 牆上的導管肋條
    for (var r = 0; r < 8; r++) {
      var ra = r / 8 * Math.PI * 2;
      var rib = M.mesh(M.geo('rib', function () { var x = new THREE.CylinderGeometry(0.035, 0.045, 1.4, 5); return x; }), M.mat('#7a5a44', { map: T.bark() }));
      rib.position.set(Math.cos(ra) * (w - 0.5) / 2 * 1.08, lift + 0.75, Math.sin(ra) * (d - 0.5) / 2 * 1.08); g.add(rib);
    }
    // 屋頂：靛藍葉片疊成的穹頂
    var roofM = M.mat('#34457a', { rough: 0.85, map: T.leaf() }), roofM2 = M.mat('#4a5a9a', { rough: 0.85, map: T.leaf() });
    var roof = M.mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofM);
    roof.scale.set(w / 2 * 1.18, 1.05, d / 2 * 1.22); roof.position.y = lift + wallH + 0.05; g.add(roof);
    var roof2 = M.mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), roofM2);
    roof2.scale.set(w / 2 * 0.8, 0.95, d / 2 * 0.82); roof2.position.y = lift + wallH + 0.32; g.add(roof2);
    var crown = M.mesh(M.geo('crown', function () { return new THREE.SphereGeometry(0.12, 8, 6); }), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.4 }), false);
    crown.position.y = lift + wallH + 1.2; g.add(crown);
    // 門：朝向 D 格那一側
    if (door) {
      var dx = door[0] + 0.5 - cx, dz = door[1] + 0.5 - cz;
      var ang = Math.atan2(dx, dz);
      var dg = new THREE.Group(); dg.rotation.y = ang; g.add(dg);
      var rz = (d - 0.5) / 2 * 1.06 + 0.02;
      var hole = M.mesh(M.geo('doorhole', function () { var x = new THREE.PlaneGeometry(0.62, 0.95); return x; }), M.mat('#140e10', { rough: 1 }), false);
      hole.position.set(0, lift + 0.55, rz); dg.add(hole);
      var frame = M.mesh(M.geo('doorframe', function () { return new THREE.TorusGeometry(0.36, 0.05, 6, 14, Math.PI); }), M.mat('#98613C', { map: T.bark() }));
      frame.position.set(0, lift + 0.95, rz + 0.02); dg.add(frame);
      var lamp = M.mesh(M.geo('lamp', function () { var x = new THREE.SphereGeometry(0.07, 8, 6); x.scale(1, 1.4, 1); return x; }), M.mat('#ffd9a0', { emissive: '#e0a050', ei: 1.8 }), false);
      lamp.position.set(0.45, lift + 1.0, rz + 0.1); dg.add(lamp);
      var lg = M.glowSprite('#ffc070', 0.9, 0.6); lg.position.copy(lamp.position); dg.add(lg);
      var wp = new THREE.Vector3(0.45, lift + 1.0, rz + 0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).add(g.position);
      W.lightSources.push({ x: wp.x, y: wp.y, z: wp.z, color: '#ffc070', intensity: 1.4, dist: 4, warm: true });
      // 門前的踏階
      var step = M.mesh(M.geo('step', function () { return new THREE.BoxGeometry(0.7, 0.12, 0.35); }), M.mat('#8a7a68', { map: T.rock() }));
      step.position.set(0, 0.12, rz + 0.2); dg.add(step);
    }
    W.group.add(g);
  }

  // ======================= 室內 =======================
  function buildIndoor(pm, cfg) {
    var wallM = M.mat('#cfc2a6', { map: T.vellum(), rough: 0.95 }), trim = M.mat('#6a4a38', { map: T.bark() });
    var geo = M.geo('inwall', function () { var g = new THREE.BoxGeometry(1, 1.1, 1); g.translate(0, 0.55, 0); return g; });
    var count = 0, x, y;
    for (y = 0; y < pm.h; y++) for (x = 0; x < pm.w; x++) if (pm.ground[y * pm.w + x] === '|') count++;
    var im = new THREE.InstancedMesh(geo, wallM, count), dummy = new THREE.Object3D(), i = 0;
    for (y = 0; y < pm.h; y++) for (x = 0; x < pm.w; x++) {
      if (pm.ground[y * pm.w + x] !== '|') continue;
      var front = y === pm.h - 1 || (y < pm.h - 1 && pm.ground[(y + 1) * pm.w + x] !== '|' && y > pm.h - 4);
      dummy.position.set(x + 0.5, 0, y + 0.5); dummy.scale.set(1, front ? 0.35 : 1, 1); dummy.updateMatrix(); im.setMatrixAt(i++, dummy.matrix);
    }
    im.castShadow = true; im.receiveShadow = true; W.group.add(im);
    // 地板：木紋的菌絲氈
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(pm.w, pm.h), M.mat('#6e5844', { map: T.bark(), rough: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(pm.w / 2, 0.005, pm.h / 2); floor.receiveShadow = true;
    floor.material.map.repeat && floor.material.map.repeat.set(1, 1);
    // 地板已在地形中（屋內地板色），不另外加平面
    // 每間房一盞吊燈
    var rooms = [];
    for (x = 1; x < pm.w - 1; x++) if (pm.ground[2 * pm.w + x] !== '|' && pm.ground[2 * pm.w + x - 1] === '|') rooms.push(x);
    rooms.forEach(function (rx) {
      var lx = rx + 4, lz = pm.h / 2 - 0.5;
      var lamp = M.mesh(M.geo('hang-lamp', function () { var g = new THREE.SphereGeometry(0.16, 10, 8); g.scale(1, 1.3, 1); return g; }), M.mat('#ffe0b0', { emissive: '#e0a050', ei: 2 }), false);
      lamp.position.set(lx, 2.2, lz); W.group.add(lamp);
      var cord = M.mesh(M.geo('cord', function () { return new THREE.CylinderGeometry(0.01, 0.01, 1.2, 4); }), trim, false); cord.position.set(lx, 2.9, lz); W.group.add(cord);
      W.lightSources.push({ x: lx, y: 2.0, z: lz, color: '#ffc890', intensity: 3.2, dist: 8, warm: true, always: true });
    });
  }

  // ======================= 脈橋 =======================
  function buildBridges(pm, cfg) {
    var cells = [], x, y;
    for (y = 0; y < pm.h; y++) for (x = 0; x < pm.w; x++) if (terrainCh(pm, cfg, x, y) === '=') cells.push([x, y]);
    if (!cells.length) return;
    var tc = function (x2, y2) { return terrainCh(pm, cfg, x2, y2); };
    // 橋面：每格一塊根板，用實例化
    var deck = new THREE.BoxGeometry(1.02, 0.18, 1.02); deck.translate(0, -0.09, 0);
    var dm = new THREE.InstancedMesh(deck, new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.bark(), roughness: 0.85 }), cells.length);
    var dummy = new THREE.Object3D(), col = new THREE.Color();
    cells.forEach(function (c, i) {
      var top = L.baseHeight(cfg, c[1] + 0.5) + 0.06;
      dummy.position.set(c[0] + 0.5, top, c[1] + 0.5); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      dm.setMatrixAt(i, dummy.matrix);
      var hv = V.util.hash2(c[0], c[1], 4); col.set(hv < 0.33 ? '#5e4a40' : hv < 0.66 ? '#4e4450' : '#665040'); if (V.util.hash2(c[0], c[1], 8) < 0.25) col.set('#34466a'); dm.setColorAt(i, col);
    });
    dm.receiveShadow = true; dm.castShadow = true; W.group.add(dm);
    // 橋腹：垂下的根束與拱
    var rootM = M.mat('#5a4030', { map: T.bark() }), tipM = M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.4 });
    var depth = cfg.chasm ? 4.5 : 0.9;
    cells.forEach(function (c) {
      var r = V.util.hash2(c[0], c[1], 9);
      var edge = tc(c[0], c[1] - 1) !== '=' || tc(c[0], c[1] + 1) !== '=';
      if (!edge && r > 0.35) return;
      var top = L.baseHeight(cfg, c[1] + 0.5);
      var n = edge ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var len = depth * (0.4 + V.util.hash2(c[0], c[1], k + 2) * 0.8);
        var rt = M.mesh(M.geo('br-root', function () { var g = new THREE.CylinderGeometry(0.06, 0.02, 1, 5); g.translate(0, -0.5, 0); return g; }), rootM, false);
        rt.scale.set(1, len, 1); rt.position.set(c[0] + 0.2 + V.util.hash2(c[0], k, 3) * 0.6, top - 0.1, c[1] + 0.2 + V.util.hash2(k, c[1], 5) * 0.6);
        rt.rotation.z = (V.util.hash2(c[0], c[1], k) - 0.5) * 0.3;
        W.group.add(rt);
        if (cfg.chasm || r < 0.2) { var tp = M.mesh(M.geo('br-tip', function () { return new THREE.SphereGeometry(0.04, 5, 4); }), tipM, false); tp.position.set(rt.position.x, top - 0.1 - len, rt.position.z); W.group.add(tp); }
      }
    });
    // 欄杆：橋緣的根繩
    if (cfg.chasm) {
      var rail = M.mat('#7a5a44', { map: T.bark() });
      cells.forEach(function (c) {
        [[0, -1], [0, 1]].forEach(function (d) {
          if (tc(c[0], c[1] + d[1]) === '=') return;
          var post = M.mesh(M.geo('br-post', function () { var g = new THREE.CylinderGeometry(0.05, 0.07, 0.75, 5); g.translate(0, 0.37, 0); return g; }), rail);
          var top = L.baseHeight(cfg, c[1] + 0.5) + 0.06;
          post.position.set(c[0] + 0.5, top, c[1] + 0.5 + d[1] * 0.45); W.group.add(post);
          var rope = M.mesh(M.geo('br-rope', function () { var g = new THREE.CylinderGeometry(0.025, 0.025, 1.02, 4); g.rotateZ(Math.PI / 2); return g; }), rail, false);
          rope.position.set(c[0] + 0.5, top + 0.68, c[1] + 0.5 + d[1] * 0.45); W.group.add(rope);
        });
      });
      // 對岸的巨大根拱（在谷中，給深度感）
      for (var a = 0; a < 5; a++) {
        var ax = 6 + a * 9, curve = new THREE.CatmullRomCurve3([new THREE.Vector3(ax, -9, -6), new THREE.Vector3(ax + 1, -2, -2), new THREE.Vector3(ax + 2, -0.6, pm.h / 2), new THREE.Vector3(ax + 1, -2, pm.h + 2), new THREE.Vector3(ax, -9, pm.h + 6)]);
        var arch = M.mesh(new THREE.TubeGeometry(curve, 24, 0.55, 8, false), rootM); W.group.add(arch);
      }
    }
  }

  // ======================= 霧面片 =======================
  function buildMist(pm, cfg) {
    if (cfg.kind === 'indoor') return;
    var gx = W.mistGroup = new THREE.Group(), tex = T.mist();
    var n = cfg.kind === 'cave' ? 10 : 22;
    for (var i = 0; i < n; i++) {
      var sp = new THREE.Mesh(M.geo('mistplane', function () { var g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }),
        new THREE.MeshBasicMaterial({ map: tex, color: cfg.kind === 'cave' ? 0x3a6a70 : 0xbfe3dc, transparent: true, depthWrite: false, opacity: 0.22 }));
      var x = Math.random() * pm.w, z = Math.random() * pm.h;
      sp.position.set(x, W.groundHeight(x, z) + 0.3 + Math.random() * 0.6, z);
      var s = 5 + Math.random() * 6; sp.scale.set(s, 1, s * 0.7); sp.userData = { v: 0.15 + Math.random() * 0.25, ph: Math.random() * 6 };
      sp.renderOrder = 4; gx.add(sp);
    }
    if (cfg.chasm) {   // 谷中的霧層
      for (var j = 0; j < 8; j++) {
        var cm = new THREE.Mesh(M.geo('mistplane', null), new THREE.MeshBasicMaterial({ map: tex, color: 0xbfe3dc, transparent: true, depthWrite: false, opacity: 0.3 }));
        cm.position.set(Math.random() * pm.w, -3 - Math.random() * 3, Math.random() * pm.h); var s2 = 14 + Math.random() * 10; cm.scale.set(s2, 1, s2); cm.userData = { v: 0.2, ph: j };
        gx.add(cm);
      }
    }
    W.group.add(gx);
  }

  // ======================= 色調、光線 =======================
  function setTone(tone, cfg) {
    var sc = T.skyColors[tone] || T.skyColors.day;
    var sky = W.sky.material.uniforms;
    sky.top.value.set(sc.top); sky.mid.value.set(sc.mid); sky.low.value.set(sc.low); sky.sunCol.value.set(sc.sun);
    sky.hillCol.value.set(tone === 'wither' ? '#4a4440' : '#1a2238');
    sky.hills.value = cfg.kind === 'outdoor' ? 1 : 0;
    W.sky.visible = cfg.kind === 'outdoor';
    var bg = cfg.kind === 'outdoor' ? null : new THREE.Color(sc.top);
    W.scene.background = bg;
    var sun = cfg.sun || { az: 105, el: 18 };
    var az = sun.az * Math.PI / 180, el = sun.el * Math.PI / 180;
    W.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    sky.sunDir.value.copy(W.sunDir);
    var fogCol = new THREE.Color(sc.fog);
    if (cfg.kind === 'outdoor') {
      W.sun.visible = true;
      W.sun.color.set(tone === 'dusk' ? '#ff9a70' : tone === 'wither' ? '#ffe0b0' : '#ffb27a');
      W.sun.intensity = tone === 'dusk' ? 1.4 : tone === 'wither' ? 2.6 : 2.8;
      W.hemi.color.set(tone === 'wither' ? '#9a9a9a' : '#6a90b8'); W.hemi.groundColor.set('#3a2a28'); W.hemi.intensity = tone === 'dusk' ? 0.7 : 1.35;
      W.amb.intensity = 0.2;
      W.scene.fog = new THREE.FogExp2(fogCol, cfg.chasm ? 0.018 : 0.022);
    } else if (cfg.kind === 'cave') {
      W.sun.visible = true; W.sun.color.set('#5a7a9a'); W.sun.intensity = 0.35;
      W.sunDir = new THREE.Vector3(0.3, 1, 0.4).normalize();
      W.hemi.color.set('#6a90a8'); W.hemi.groundColor.set('#2a2230'); W.hemi.intensity = 1.25;
      W.amb.intensity = 0.35;
      W.scene.fog = new THREE.FogExp2(fogCol, 0.04);
    } else {
      W.sun.visible = true; W.sun.color.set('#ffd8b0'); W.sun.intensity = 0.5; W.sunDir = new THREE.Vector3(-0.3, 1, 0.5).normalize();
      W.hemi.color.set('#ffe0c0'); W.hemi.groundColor.set('#3a2a20'); W.hemi.intensity = 0.7;
      W.amb.intensity = 0.25;
      W.scene.fog = new THREE.Fog(fogCol, 30, 60);
    }
    if (W.waterMat) { W.waterMat.uniforms.sky.value.set(cfg.kind === 'cave' ? '#2a4a50' : sc.low); W.waterMat.uniforms.fogColor.value.copy(fogCol); }
    W.spores.material.uniforms.color.value.set(tone === 'wither' ? '#d9cf9b' : '#9fe9e2');
    W.fogColor = fogCol;
  }

  // ======================= 每幀 =======================
  W.update = function (dt, focus, camera) {
    W.time += dt;
    var t = W.time;
    W.sky.material.uniforms.time.value = t;
    W.sky.position.copy(camera.position);
    if (W.waterMat) { W.waterMat.uniforms.time.value = t; W.waterMat.uniforms.fancy.value = V.quality.level === 'high' ? 1 : 0; }
    if (W.chasmMat) W.chasmMat.uniforms.time.value = t;
    var su = W.spores.material.uniforms;
    su.time.value = t; su.center.value.set(focus.x, focus.y, focus.z); su.scale.value = V.r3d.h * 0.5;
    // 太陽與陰影框跟著焦點
    W.sunTarget.position.copy(focus);
    W.sun.position.copy(focus).addScaledVector(W.sunDir, 30);
    var sc = W.sun.shadow.camera, R2 = W.cfg && W.cfg.kind === 'indoor' ? 14 : 16;
    if (sc.right !== R2) { sc.left = -R2; sc.right = R2; sc.top = R2; sc.bottom = -R2; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix(); W.sun.shadow.bias = -0.0008; W.sun.shadow.normalBias = 0.03; }
    // 動畫物件
    for (var i = 0; i < W.animated.length; i++) {
      var a = W.animated[i];
      if (a.kind === 'pulse') a.obj.material.opacity = 0.4 + Math.sin(t * 1.7 + a.ph) * 0.18;
      else if (a.kind === 'flicker') a.obj.material.opacity = 0.5 + Math.sin(t * 13 + a.ph) * 0.08 + Math.sin(t * 7.3) * 0.08;
      else if (a.kind === 'tree') a.obj.rotation.z = Math.sin(t * 0.6 + a.ph) * 0.012;
    }
    // 蒸氣
    if (W.steamGroup) W.steamGroup.children.forEach(function (sp) {
      var u = sp.userData; u.t += dt * u.sp;
      var k = u.t % 1;
      sp.position.set(u.x + Math.sin(u.t * 3) * 0.2, u.y + 0.1 + k * (u.sulfur ? 1.4 : 2.2), u.z);
      var s = 0.6 + k * (u.sulfur ? 1.2 : 2.2); sp.scale.set(s, s, s);
      sp.material.opacity = Math.sin(k * Math.PI) * (u.sulfur ? 0.35 : 0.42);
    });
    if (W.mistGroup && W.mistGroup.visible) W.mistGroup.children.forEach(function (m) {
      m.position.x += m.userData.v * dt; if (m.position.x > W.pm.w + 6) m.position.x = -6;
      m.material.opacity = 0.16 + Math.sin(t * 0.3 + m.userData.ph) * 0.07;
    });
    // 點光源：取離焦點最近的幾個光源
    var maxL = Math.min(V.quality.p().lights, W.points.length);
    if (maxL && (!W._lt || t - W._lt > 0.4)) {
      W._lt = t;
      var list = W.lightSources.slice().sort(function (p, q) { return ((p.x - focus.x) * (p.x - focus.x) + (p.z - focus.z) * (p.z - focus.z)) - ((q.x - focus.x) * (q.x - focus.x) + (q.z - focus.z) * (q.z - focus.z)) - (p.always ? 1000 : 0) + (q.always ? 1000 : 0); });
      W.points.forEach(function (pl, j) {
        var s = list[j];
        if (!s || j >= maxL) { pl.intensity = 0; return; }
        pl.position.set(s.x, s.y, s.z); pl.color.set(s.color); pl.intensity = s.intensity * (W.cfg.kind === 'outdoor' && !s.warm ? 0.7 : 1.2); pl.distance = s.dist;
      });
    }
  };
})();
