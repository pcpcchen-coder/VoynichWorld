/*
 * 程式生成的 3D 造型：人物（珂潾與居民）、互動物件（種源龕、味診台、水位尺……）。
 * 人物外觀直接讀 2D 版的 sprite 規格（hair／skin／cloth／accent／style／hood／naiad），
 * 所以資料檔不需要為 3D 版另外寫外觀。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE;
  var M = V.models3d = {};
  var geoCache = {}, matCache = {};

  // 快取的幾何與材質標記為 shared：換地圖或換遭遇時不釋放
  M.geo = function (key, make) { if (!geoCache[key]) { geoCache[key] = make(); geoCache[key].userData.shared = true; } return geoCache[key]; };
  // 釋放一個群組自己擁有的幾何與材質（跳過 shared；貼圖由 tex3d 快取，不釋放）
  M.disposeOwned = function (root) {
    root.traverse(function (o) {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      [].concat(o.material || []).forEach(function (m) { if (!m.userData.shared) m.dispose(); });
    });
  };
  // 材質快取：同色同參數共用
  M.mat = function (color, o) {
    o = o || {};
    var key = color + '|' + JSON.stringify(o);
    if (matCache[key]) return matCache[key];
    var p = { color: new THREE.Color(color), roughness: o.rough != null ? o.rough : 0.82, metalness: o.metal || 0 };
    if (o.emissive) { p.emissive = new THREE.Color(o.emissive); p.emissiveIntensity = o.ei != null ? o.ei : 1; }
    if (o.opacity != null) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = o.depthWrite != null ? o.depthWrite : false; }
    if (o.map) p.map = o.map;
    if (o.side) p.side = o.side;
    if (o.flat) p.flatShading = true;
    var m = new THREE.MeshStandardMaterial(p); m.userData.shared = true;
    return (matCache[key] = m);
  };
  M.basic = function (color, o) {
    o = o || {};
    var key = 'b' + color + '|' + JSON.stringify(o);
    if (matCache[key]) return matCache[key];
    var p = { color: new THREE.Color(color) };
    if (o.opacity != null) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = false; }
    if (o.add) { p.blending = THREE.AdditiveBlending; p.transparent = true; p.depthWrite = false; }
    if (o.map) p.map = o.map;
    if (o.side) p.side = o.side;
    if (o.fog === false) p.fog = false;
    var mb = new THREE.MeshBasicMaterial(p); mb.userData.shared = true;
    return (matCache[key] = mb);
  };
  function mesh(g, m, shadow) { var x = new THREE.Mesh(g, m); if (shadow !== false) { x.castShadow = true; } return x; }
  M.mesh = mesh;

  // 柔光光暈（加法混合的平面精靈）
  M.glowSprite = function (color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: V.tex3d.glow(), color: new THREE.Color(color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: opacity != null ? opacity : 0.9 }));
    s.scale.set(size, size, size);
    return s;
  };
  // 腳下的圓形陰影
  M.blob = function (r, a) {
    var key = 'blob';
    var mtl = matCache[key] || (matCache[key] = new THREE.MeshBasicMaterial({ map: V.tex3d.glow(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })); mtl.userData.shared = true;
    var m = new THREE.Mesh(M.geo('blobplane', function () { var g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }), mtl);
    m.scale.set(r * 2, 1, r * 2); m.renderOrder = 1;
    if (a != null) { m.material = mtl.clone(); m.material.opacity = a; }
    return m;
  };

  function lighten(hex, k) { var c = new THREE.Color(hex); c.lerp(new THREE.Color(1, 1, 1), k); return '#' + c.getHexString(); }
  function darken(hex, k) { var c = new THREE.Color(hex); c.multiplyScalar(1 - k); return '#' + c.getHexString(); }
  M.lighten = lighten; M.darken = darken;

  // 把 group 的直屬網格（排除 except、透明、發光者）合併成一個使用頂點色的網格
  var vcMat = null;
  function compact(group, except) {
    var list = group.children.filter(function (o) {
      return o.isMesh && except.indexOf(o) < 0 && !o.material.transparent && !(o.material.emissiveIntensity > 0 && o.material.emissive && o.material.emissive.getHex() !== 0) && o.geometry.attributes.uv;
    });
    if (list.length < 2) return;
    var geos = list.map(function (o) {
      o.updateMatrix();
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      Object.keys(g.attributes).forEach(function (a) { if (['position', 'normal', 'uv'].indexOf(a) < 0) g.deleteAttribute(a); });
      g.clearGroups(); g.applyMatrix4(o.matrix);
      var n = g.attributes.position.count, col = new Float32Array(n * 3), c = o.material.color;
      for (var i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    var merged = THREE.mergeGeometries(geos, false);
    geos.forEach(function (g) { g.dispose(); });
    if (!merged) return;
    if (!vcMat) { vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, map: V.tex3d.vellum() }); vcMat.userData.shared = true; }
    var m = new THREE.Mesh(merged, vcMat); m.castShadow = true;
    list.forEach(function (o) { group.remove(o); });
    group.add(m);
  }

  // ======================= 人物 =======================
  // 長袍輪廓（自下而上：裙襬 → 腰 → 胸 → 肩 → 頸）
  function robeGeo(tall) {
    return M.geo('robe' + (tall ? 't' : ''), function () {
      var k = tall ? 1.06 : 1;
      var pts = [[0.001, 0.14], [0.235, 0.14], [0.215, 0.24], [0.175, 0.42], [0.148, 0.56], [0.16, 0.68], [0.168, 0.78], [0.14, 0.86], [0.07, 0.9], [0.001, 0.905]];
      var g = new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1] * k); }), 18);
      return g;
    });
  }
  M.character = function (spec, opts) {
    spec = spec || {}; opts = opts || {};
    var tall = spec.style === 'tall';
    var k = tall ? 1.06 : 1;
    var skin = spec.skin || '#d8b08a', cloth = spec.cloth || '#D8CCB3', hair = spec.hair || '#1e2440', accent = spec.accent || '#2B7D79';
    var naiad = !!spec.naiad;
    var root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    var skinMat = naiad ? M.mat('#e8f2ef', { opacity: 0.82, emissive: '#2B7D79', ei: 0.35, rough: 0.3, depthWrite: true }) : M.mat(skin, { rough: 0.7 });
    var clothMat = M.mat(cloth, { map: V.tex3d.vellum(), rough: 0.9 });
    var darkCloth = M.mat(darken(cloth, 0.35), { rough: 0.9 });
    // 腿（藏在袍下，走路時露出靴子）
    var legG = M.geo('leg', function () { var g = new THREE.CapsuleGeometry(0.055, 0.26, 4, 8); g.translate(0, -0.18, 0); return g; });
    var bootMat = M.mat(spec.boots || darken(cloth, 0.55), { rough: 0.8 });
    var legL = mesh(legG, bootMat), legR = mesh(legG, bootMat);
    legL.position.set(-0.08, 0.4 * k, 0); legR.position.set(0.08, 0.4 * k, 0);
    body.add(legL, legR);
    var robe = mesh(robeGeo(tall), clothMat); body.add(robe);
    // 腰帶與斜背的採樣包
    var sash = mesh(M.geo('sash', function () { var g = new THREE.TorusGeometry(0.152, 0.022, 6, 20); g.rotateX(Math.PI / 2); return g; }), M.mat(accent, { rough: 0.6 }));
    sash.position.y = 0.56 * k; body.add(sash);
    var strap = mesh(M.geo('strap', function () { var g = new THREE.TorusGeometry(0.2, 0.014, 4, 22, Math.PI * 1.1); return g; }), M.mat(darken(accent, 0.3)));
    strap.position.set(0, 0.62 * k, 0); strap.rotation.set(0, Math.PI / 2, 0.75); body.add(strap);
    if (opts.player || spec.satchel) {
      var bag = mesh(M.geo('bag', function () { return new THREE.BoxGeometry(0.13, 0.12, 0.07); }), M.mat('#98613C', { rough: 0.7 }));
      bag.position.set(0.17, 0.5 * k, -0.04); bag.rotation.z = 0.15; body.add(bag);
      var vial = mesh(M.geo('vial', function () { return new THREE.CapsuleGeometry(0.022, 0.06, 4, 8); }), M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.4, rough: 0.2 }), false);
      vial.position.set(-0.15, 0.53 * k, 0.07); vial.rotation.z = 0.3; body.add(vial);
    }
    // 頭
    var headY = 1.03 * k;
    var head = new THREE.Group(); head.position.y = headY; body.add(head);
    var skull = mesh(M.geo('head', function () { var g = new THREE.SphereGeometry(0.13, 18, 14); g.scale(1, 1.08, 1); return g; }), skinMat);
    head.add(skull);
    var neck = mesh(M.geo('neck', function () { return new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8); }), skinMat);
    neck.position.y = -0.12; head.add(neck);
    var eyeM = M.mat('#141018', { rough: 0.3 });
    var eyeG = M.geo('eye', function () { return new THREE.SphereGeometry(0.016, 8, 6); });
    var eL = mesh(eyeG, eyeM, false), eR = mesh(eyeG, eyeM, false);
    eL.position.set(-0.045, 0.0, 0.118); eR.position.set(0.045, 0.0, 0.118); head.add(eL, eR);
    if (naiad) {
      // 潾者：藻脈
      var vein = M.mat('#73D6D0', { emissive: '#73D6D0', ei: 1.2, rough: 0.4 });
      for (var vi = 0; vi < 3; vi++) {
        var v = mesh(M.geo('vein' + vi, function () { return new THREE.TorusGeometry(0.133, 0.006, 4, 24, Math.PI * 0.8); }), vein, false);
        v.rotation.set(0.4 + vi * 0.5, vi * 1.1, 0); head.add(v);
      }
    }
    // 頭髮
    var hairMat = M.mat(spec.style === 'hood' ? (spec.hood || darken(cloth, 0.2)) : hair, { rough: spec.style === 'hood' ? 0.95 : 0.6 });
    var cap = mesh(M.geo('haircap', function () { return new THREE.SphereGeometry(0.142, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55); }), M.mat(hair, { rough: 0.6 }));
    cap.position.y = 0.012; cap.rotation.x = -0.25; head.add(cap);
    if (spec.style === 'bob' || !spec.style) {
      var bob = mesh(M.geo('bob', function () { var g = new THREE.SphereGeometry(0.152, 18, 12, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.2, Math.PI * 0.42); return g; }), M.mat(hair, { rough: 0.6, side: THREE.DoubleSide }));
      bob.rotation.y = Math.PI; bob.position.y = -0.01; head.add(bob);
    } else if (spec.style === 'bun') {
      var bun = mesh(M.geo('bun', function () { return new THREE.SphereGeometry(0.07, 12, 10); }), M.mat(hair, { rough: 0.6 }));
      bun.position.set(0, 0.09, -0.1); head.add(bun);
      var pin = mesh(M.geo('pin', function () { return new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5); }), M.mat(accent));
      pin.position.set(0, 0.1, -0.1); pin.rotation.z = 1.2; head.add(pin);
    } else if (spec.style === 'tall') {
      var knot = mesh(M.geo('knot', function () { var g = new THREE.CapsuleGeometry(0.045, 0.09, 4, 8); return g; }), M.mat(hair, { rough: 0.6 }));
      knot.position.set(0, 0.15, -0.03); knot.rotation.x = -0.3; head.add(knot);
    } else if (spec.style === 'hood') {
      var hood = mesh(M.geo('hood', function () {
        var g = new THREE.SphereGeometry(0.168, 18, 14, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.7); g.scale(1, 1.12, 1.05); return g;
      }), M.mat(spec.hood || darken(cloth, 0.2), { rough: 0.95, side: THREE.DoubleSide }));
      hood.position.set(0, 0.0, -0.01); head.add(hood);
      var tip = mesh(M.geo('hoodtip', function () { var g = new THREE.ConeGeometry(0.07, 0.16, 8); g.rotateX(-1.9); return g; }), hood.material);
      tip.position.set(0, 0.1, -0.16); head.add(tip);
      var mantle = mesh(M.geo('mantle', function () { return new THREE.CylinderGeometry(0.16, 0.24, 0.16, 16, 1, true); }), M.mat(spec.hood || darken(cloth, 0.2), { rough: 0.95, side: THREE.DoubleSide }));
      mantle.position.y = 0.8 * k; body.add(mantle);
    }
    // 手臂（袖＋手）
    var armG = M.geo('arm', function () { var g = new THREE.CapsuleGeometry(0.045, 0.26, 4, 8); g.translate(0, -0.16, 0); return g; });
    var handG = M.geo('hand', function () { return new THREE.SphereGeometry(0.04, 8, 6); });
    function arm(side) {
      var g = new THREE.Group(); g.position.set(side * 0.175, 0.84 * k, 0);
      var a = mesh(armG, clothMat); g.add(a);
      var cuff = mesh(M.geo('cuff', function () { return new THREE.TorusGeometry(0.045, 0.014, 5, 10); }), M.mat(accent)); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.3; g.add(cuff);
      var h = mesh(handG, skinMat); h.position.y = -0.34; g.add(h);
      if (opts.player) {   // 織脈者的掌紋（脈光）
        var palm = mesh(M.geo('palm', function () { return new THREE.SphereGeometry(0.018, 6, 4); }), M.mat('#73D6D0', { emissive: '#73D6D0', ei: 1.5 }), false);
        palm.position.set(0, -0.35, 0.03); g.add(palm);
      }
      g.rotation.z = side * 0.08;
      body.add(g); return g;
    }
    var armL = arm(-1), armR = arm(1);
    // 同一個關節底下的不透明、不發光部件併成一個頂點色網格（每人約 7 次繪製，原本約 18 次）
    compact(body, [legL, legR]); compact(head, []); compact(armL, []); compact(armR, []);
    root.traverse(function (o) { if (o.isMesh) o.receiveShadow = false; });
    var shadow = M.blob(0.3); shadow.position.y = 0.02; root.add(shadow);

    var phase = Math.random() * 6, breathe = Math.random() * 6;
    var ch = {
      root: root, body: body, head: head, legL: legL, legR: legR, armL: armL, armR: armR, shadow: shadow, height: 1.25 * k,
      // moving: 0–1（速度比例）
      update: function (dt, moving, t) {
        breathe += dt;
        if (moving > 0.05) {
          phase += dt * (6 + moving * 5);
          var s = Math.sin(phase), amp = 0.25 + moving * 0.35;
          legL.rotation.x = s * amp; legR.rotation.x = -s * amp;
          armL.rotation.x = -s * amp * 0.8; armR.rotation.x = s * amp * 0.8;
          body.position.y = Math.abs(Math.cos(phase)) * 0.035 * moving;
          body.rotation.x = 0.06 * moving;
          head.rotation.y *= 0.8;
        } else {
          var d = Math.min(1, dt * 10);
          legL.rotation.x += (0 - legL.rotation.x) * d; legR.rotation.x += (0 - legR.rotation.x) * d;
          armL.rotation.x += (Math.sin(breathe * 1.3) * 0.04 - armL.rotation.x) * d; armR.rotation.x += (-Math.sin(breathe * 1.3) * 0.04 - armR.rotation.x) * d;
          body.position.y += (0 - body.position.y) * d; body.rotation.x += (0 - body.rotation.x) * d;
          body.scale.set(1 + Math.sin(breathe * 1.6) * 0.01, 1, 1 + Math.sin(breathe * 1.6) * 0.01);
          head.rotation.y = Math.sin(breathe * 0.37) * 0.18;
          head.rotation.x = Math.sin(breathe * 0.5) * 0.05;
        }
      }
    };
    return ch;
  };

  // ======================= 互動物件 =======================
  // 回傳 { root, glow(可選：未使用時的提示光), update(dt,t,used) }
  M.prop = function (kind, def) {
    var g = new THREE.Group(), glow = null, light = null, anim = null;
    var bone = M.mat('#D8CCB3', { map: V.tex3d.vellum() }), copper = M.mat('#98613C', { map: V.tex3d.bark(), rough: 0.75 }), teal = M.mat('#2B7D79', { rough: 0.5 });
    var lum = M.mat('#bff1ea', { emissive: '#73D6D0', ei: 1.6, rough: 0.3 });
    switch (kind) {
      case 'shrine': {
        // 種源龕：導管根拱起的壁龕，中間懸著發光的種莢
        var arch = mesh(M.geo('shrine-arch', function () { return new THREE.TorusGeometry(0.42, 0.09, 8, 20, Math.PI); }), copper);
        arch.position.y = 0.05; g.add(arch);
        var base = mesh(M.geo('shrine-base', function () { return new THREE.CylinderGeometry(0.34, 0.42, 0.18, 14); }), M.mat('#6a5a4a', { map: V.tex3d.rock() }));
        base.position.y = 0.09; g.add(base);
        var stem = mesh(M.geo('shrine-stem', function () { return new THREE.CylinderGeometry(0.03, 0.05, 0.3, 6); }), copper); stem.position.y = 0.32; g.add(stem);
        var pod = mesh(M.geo('shrine-pod', function () { var x = new THREE.SphereGeometry(0.12, 14, 10); x.scale(0.85, 1.25, 0.85); return x; }), lum, false);
        pod.position.y = 0.56; g.add(pod);
        for (var i = 0; i < 5; i++) {
          var leaf = mesh(M.geo('shrine-leaf', function () { var x = new THREE.SphereGeometry(0.09, 8, 6); x.scale(0.4, 1, 0.12); x.translate(0, 0.08, 0); return x; }), teal);
          leaf.position.y = 0.46; leaf.rotation.set(0.7, i * 1.256, 0); g.add(leaf);
        }
        glow = M.glowSprite('#73D6D0', 1.6, 0.85); glow.position.y = 0.56; g.add(glow);
        light = { color: 0x73D6D0, intensity: 2.2, dist: 5, y: 0.7 };
        anim = function (dt, t) { pod.position.y = 0.56 + Math.sin(t * 1.4) * 0.03; glow.material.opacity = 0.65 + Math.sin(t * 2) * 0.2; };
        break;
      }
      case 'altar': {
        var top = mesh(M.geo('altar-top', function () { return new THREE.CylinderGeometry(0.42, 0.38, 0.08, 16); }), M.mat('#8a7a68', { map: V.tex3d.rock() }));
        top.position.y = 0.55; g.add(top);
        for (var l = 0; l < 3; l++) {
          var leg = mesh(M.geo('altar-leg', function () { var x = new THREE.CylinderGeometry(0.035, 0.06, 0.55, 6); x.translate(0, 0.27, 0); return x; }), copper);
          leg.position.set(Math.cos(l * 2.09) * 0.26, 0, Math.sin(l * 2.09) * 0.26); leg.rotation.z = Math.cos(l * 2.09) * 0.12; g.add(leg);
        }
        var colors = ['#c58a52', '#8fc9a3', '#e07a3f', '#c9b993', '#73D6D0'];
        for (var v = 0; v < 5; v++) {
          var vl = mesh(M.geo('altar-vial', function () { return new THREE.CylinderGeometry(0.035, 0.04, 0.14, 8); }), M.mat(colors[v], { emissive: colors[v], ei: 0.5, rough: 0.25, opacity: 0.85, depthWrite: true }));
          vl.position.set(-0.22 + v * 0.11, 0.66, -0.12 + (v % 2) * 0.05); g.add(vl);
        }
        var bowl = mesh(M.geo('altar-bowl', function () { return new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); }), bone);
        bowl.position.set(0.12, 0.72, 0.12); bowl.rotation.x = Math.PI; g.add(bowl);
        glow = M.glowSprite('#e0a070', 0.9, 0.45); glow.position.set(0, 0.75, 0); g.add(glow);
        break;
      }
      case 'gauge': {
        var pole = mesh(M.geo('gauge-pole', function () { var x = new THREE.BoxGeometry(0.08, 1.5, 0.08); x.translate(0, 0.55, 0); return x; }), bone);
        g.add(pole);
        for (var m = 0; m < 8; m++) {
          var tick = mesh(M.geo('gauge-tick', function () { return new THREE.BoxGeometry(m % 2 ? 0.12 : 0.18, 0.018, 0.09); }), M.mat(m < 3 ? '#A64232' : '#172A46'), false);
          tick.position.set(0.05, -0.05 + m * 0.16, 0); g.add(tick);
        }
        var capG = mesh(M.geo('gauge-cap', function () { return new THREE.ConeGeometry(0.08, 0.14, 6); }), copper); capG.position.y = 1.36; g.add(capG);
        break;
      }
      case 'filter': case 'filterpatch': {
        var postG = M.geo('filter-post', function () { var x = new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6); x.translate(0, 0.65, 0); return x; });
        var p1 = mesh(postG, copper), p2 = mesh(postG, copper); p1.position.x = -0.42; p2.position.x = 0.42; g.add(p1, p2);
        var bar = mesh(M.geo('filter-bar', function () { return new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6); }), copper); bar.rotation.z = Math.PI / 2; bar.position.y = 1.22; g.add(bar);
        var memb = mesh(M.geo('filter-memb', function () { return new THREE.PlaneGeometry(0.8, 0.95, 4, 4); }), M.mat('#d8ccb3', { opacity: 0.62, side: THREE.DoubleSide, map: V.tex3d.vellum() }), false);
        memb.position.y = 0.7; g.add(memb);
        if (kind === 'filterpatch') {
          var patch = mesh(M.geo('filter-patch', function () { return new THREE.PlaneGeometry(0.3, 0.26); }), M.mat('#98613C', { side: THREE.DoubleSide }), false);
          patch.position.set(0.1, 0.6, 0.01); g.add(patch);
        } else {
          for (var sp = 0; sp < 7; sp++) {
            var dot = mesh(M.geo('filter-dot', function () { return new THREE.SphereGeometry(0.03, 6, 4); }), M.mat('#8a8a6a', { emissive: '#5a6a46', ei: 0.4 }), false);
            dot.position.set(-0.3 + Math.random() * 0.6, 0.35 + Math.random() * 0.7, 0.02); g.add(dot);
          }
        }
        anim = function (dt, t) { memb.rotation.y = Math.sin(t * 0.9) * 0.08; };
        break;
      }
      case 'bed': {
        var mat2 = mesh(M.geo('bed-mat', function () { return new THREE.BoxGeometry(0.8, 0.14, 0.95); }), M.mat('#7a6a8a', { map: V.tex3d.vellum() }));
        mat2.position.y = 0.07; g.add(mat2);
        var pil = mesh(M.geo('bed-pil', function () { var x = new THREE.SphereGeometry(0.16, 10, 8); x.scale(1.4, 0.5, 0.8); return x; }), bone); pil.position.set(0, 0.18, -0.32); g.add(pil);
        break;
      }
      case 'gather': {
        // 採集點：一叢帶脈光的苔與小葉
        for (var h = 0; h < 7; h++) {
          var lf = mesh(M.geo('gather-leaf', function () { var x = new THREE.SphereGeometry(0.12, 8, 6); x.scale(0.35, 1, 0.12); x.translate(0, 0.1, 0); return x; }), M.mat('#3a6a6a', { emissive: '#1a4a48', ei: 0.4 }));
          lf.rotation.set(0.5 + Math.random() * 0.4, h * 0.9, 0); lf.position.set(Math.cos(h) * 0.08, 0, Math.sin(h) * 0.08); g.add(lf);
        }
        var bud = mesh(M.geo('gather-bud', function () { return new THREE.SphereGeometry(0.05, 8, 6); }), lum, false); bud.position.y = 0.22; g.add(bud);
        glow = M.glowSprite('#9fe9e2', 0.7, 0.7); glow.position.y = 0.25; g.add(glow);
        anim = function (dt, t, used) { bud.visible = !used; g.scale.setScalar(used ? 0.6 : 1); };
        break;
      }
      case 'observe': {
        var cairn = mesh(M.geo('obs-cairn', function () { var x = new THREE.DodecahedronGeometry(0.12, 0); x.scale(1.3, 0.6, 1); return x; }), M.mat('#7a7068', { flat: true }));
        cairn.position.y = 0.06; g.add(cairn);
        var spark = M.glowSprite('#fff3c8', 0.55, 0.95); spark.position.y = 0.55; g.add(spark);
        var ring = mesh(M.geo('obs-ring', function () { var x = new THREE.RingGeometry(0.28, 0.33, 24); x.rotateX(-Math.PI / 2); return x; }), M.basic('#73D6D0', { add: true }), false);
        ring.position.y = 0.03; g.add(ring);
        glow = spark;
        anim = function (dt, t, used) {
          spark.visible = ring.visible = !used;
          spark.position.y = 0.5 + Math.sin(t * 2.2) * 0.08; ring.scale.setScalar(1 + ((t * 0.7) % 1) * 0.6); ring.material.opacity = 1 - ((t * 0.7) % 1);
        };
        break;
      }
      case 'chest': {
        var pod2 = mesh(M.geo('chest', function () { var x = new THREE.SphereGeometry(0.26, 12, 8); x.scale(1.2, 0.75, 0.9); x.translate(0, 0.18, 0); return x; }), M.mat('#6a5a3a', { map: V.tex3d.bark() }));
        g.add(pod2);
        break;
      }
      case 'sign': {
        var post = mesh(M.geo('sign-post', function () { var x = new THREE.CylinderGeometry(0.04, 0.05, 1, 6); x.translate(0, 0.5, 0); return x; }), copper); g.add(post);
        var board = mesh(M.geo('sign-board', function () { return new THREE.BoxGeometry(0.6, 0.36, 0.04); }), bone); board.position.y = 0.82; g.add(board);
        break;
      }
      case 'valve': {
        var pipe = mesh(M.geo('valve-pipe', function () { var x = new THREE.CylinderGeometry(0.16, 0.16, 1.0, 12); x.rotateZ(Math.PI / 2); return x; }), copper); pipe.position.y = 0.45; g.add(pipe);
        var vv = mesh(M.geo('valve-ring', function () { return new THREE.TorusGeometry(0.22, 0.07, 8, 16); }), M.mat('#c9bc9f', { rough: 0.6 })); vv.rotation.y = Math.PI / 2; vv.position.y = 0.45; g.add(vv);
        var core = mesh(M.geo('valve-core', function () { return new THREE.SphereGeometry(0.13, 12, 8); }), M.mat('#73D6D0', { emissive: '#2B7D79', ei: 0.9 })); core.position.y = 0.45; g.add(core);
        break;
      }
      case 'membrane': {
        var mb = mesh(M.geo('memb-disc', function () { var x = new THREE.CircleGeometry(0.5, 18); return x; }), M.mat('#e6dcc4', { side: THREE.DoubleSide, map: V.tex3d.vellum(), rough: 0.95 }));
        mb.position.y = 0.55; g.add(mb);
        var rim = mesh(M.geo('memb-rim', function () { return new THREE.TorusGeometry(0.5, 0.06, 6, 20); }), M.mat('#b9aa8b')); rim.position.y = 0.55; g.add(rim);
        break;
      }
      case 'hatch': {
        var hd = mesh(M.geo('hatch', function () { var x = new THREE.CylinderGeometry(0.4, 0.42, 0.08, 16); x.translate(0, 0.04, 0); return x; }), M.mat('#5a4a3a', { map: V.tex3d.bark() }));
        g.add(hd);
        var hr = mesh(M.geo('hatch-ring', function () { var x = new THREE.TorusGeometry(0.3, 0.025, 5, 16); x.rotateX(Math.PI / 2); return x; }), copper); hr.position.y = 0.09; g.add(hr);
        break;
      }
      case 'hidden': break;
      default: {
        var st = mesh(M.geo('stone', function () { return new THREE.DodecahedronGeometry(0.2, 0); }), M.mat('#8a7a68', { flat: true })); st.position.y = 0.15; g.add(st);
      }
    }
    return { root: g, glow: glow, light: light, update: function (dt, t, used) { if (anim) anim(dt, t, used); } };
  };
})();
