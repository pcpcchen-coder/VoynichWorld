/*
 * 遭遇（嚐味診療）的 3D 場景。規則、指令與面板都是共用的 battle.js；這裡只畫診療現場：
 *   對象的 3D 模型（依失衡扭動、穩定後放鬆、脈絡轉青）、珂潾的背影、場地（池畔／野地／導管洞／脈枯）、
 *   以及處置、誤治、灌入、嚐味、架夾、隔離等事件的 3D 特效。
 * 鏡頭用 setViewOffset 讓對象落在面板留給「舞台」（.b-stage）的那一塊。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE, M = V.models3d, T = V.tex3d;
  var B3 = V.battle3d = {};
  var scene, camera, stage = null, cur = null, fxState = { hurt: 0, good: 0, load: 0, shuffle: 0, guard: 0, isolate: 0 };
  var drops = [], tastes = [], t0 = 0;

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0x8aa8c8, 0x2a2026, 0.9));
    var key = new THREE.DirectionalLight(0xffb27a, 2.4); key.position.set(4, 6, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); var sc = key.shadow.camera; sc.left = sc.bottom = -6; sc.right = sc.top = 6;
    scene.add(key); B3.key = key;
    var rim = new THREE.DirectionalLight(0x73D6D0, 1.4); rim.position.set(-4, 3, -5); scene.add(rim);
    B3.glowLight = new THREE.PointLight(0x73D6D0, 2, 6, 1.5); B3.glowLight.position.set(0, 1.2, 0); scene.add(B3.glowLight);
    B3.hurtLight = new THREE.PointLight(0xff5a40, 0, 8, 1.5); B3.hurtLight.position.set(0, 1.5, 1.5); scene.add(B3.hurtLight);
    V.on('battle:fx', onFx);
    V.on('battle:drop', onDrop);
    V.on('battle:taste', onTaste);
  }

  var BG = {
    pool: { ground: '#2c4a4c', fog: '#4a6a70', sky: '#3a2a3a', water: true, decor: 'pool' },
    wild: { ground: '#2a3050', fog: '#3a3a58', sky: '#35283a', water: false, decor: 'wild' },
    cave: { ground: '#2a2632', fog: '#0e1418', sky: '#06060a', water: false, decor: 'cave' },
    wither: { ground: '#6a5e50', fog: '#7a7064', sky: '#3b332f', water: false, decor: 'wither' }
  };

  function buildStage(st) {
    if (stage) { scene.remove(stage); M.disposeOwned(stage); }   // 換遭遇時釋放上一個舞台自己的資源
    stage = new THREE.Group(); scene.add(stage);
    var bg = BG[st.def.bg || 'cave'] || BG.cave;
    scene.background = new THREE.Color(bg.sky);
    scene.fog = new THREE.FogExp2(new THREE.Color(bg.fog), 0.022);
    // 場地：碟形的地面
    var g = new THREE.CircleGeometry(14, 48); g.rotateX(-Math.PI / 2);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) { var x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z); pos.setY(i, Math.max(0, r - 4) * 0.18 + Math.sin(x * 1.3) * Math.cos(z * 1.1) * 0.05); }
    g.computeVertexNormals();
    var ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(bg.ground), map: T.detail(), roughness: 0.95 }));
    ground.receiveShadow = true; stage.add(ground);
    // 對象腳下的脈光圈
    var ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.25, 48), M.basic('#73D6D0', { add: true }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; stage.add(ring); B3.ring = ring;
    if (bg.water) {
      var wg = new THREE.CircleGeometry(3.4, 40); wg.rotateX(-Math.PI / 2);
      var wm = new THREE.MeshStandardMaterial({ color: 0x2f8a84, emissive: 0x0f3a44, roughness: 0.15, transparent: true, opacity: 0.72 });
      var water = new THREE.Mesh(wg, wm); water.position.set(0.8, 0.02, -1.8); stage.add(water);
    }
    var rnd = V.util.rng(7);
    for (var k = 0; k < 26; k++) {
      var a = rnd() * Math.PI * 2, r2 = 4 + rnd() * 7, x2 = Math.cos(a) * r2, z2 = Math.sin(a) * r2 - 2;
      if (z2 > 2.5 && Math.abs(x2) < 4) continue;   // 鏡頭前不放
      var o;
      if (bg.decor === 'cave') {
        o = new THREE.Mesh(M.geo('b3-rock', function () { return new THREE.DodecahedronGeometry(0.8, 1); }), M.mat('#4a4250', { flat: true, map: T.rock() }));
        o.scale.set(1 + rnd(), 1.5 + rnd() * 2.5, 1 + rnd()); o.position.set(x2, 0.5, z2);
        if (k % 5 === 0) {
          var pipe = new THREE.Mesh(M.geo('b3-pipe', function () { var gg = new THREE.CylinderGeometry(0.35, 0.4, 6, 10); gg.translate(0, 3, 0); return gg; }), M.mat('#8a6048', { map: T.bark() }));
          pipe.position.set(x2 * 0.8, 0, z2 * 0.8); stage.add(pipe);
          var gl = M.glowSprite('#73D6D0', 2, 0.5); gl.position.set(x2 * 0.8, 1.6, z2 * 0.8); stage.add(gl);
        }
      } else if (bg.decor === 'wither') {
        o = new THREE.Mesh(M.geo('b3-dry', function () { return new THREE.ConeGeometry(0.1, 1.4, 4); }), M.mat('#8a7a68'));
        o.position.set(x2, 0.6, z2); o.rotation.z = (rnd() - 0.5) * 0.8;
      } else {
        o = new THREE.Mesh(M.geo('b3-bush', function () { return new THREE.IcosahedronGeometry(0.5, 1); }), M.mat(['#22305a', '#2b2f66', '#1d3a5a'][k % 3], { flat: true }));
        o.scale.set(1 + rnd(), 0.8 + rnd() * 0.6, 1 + rnd()); o.position.set(x2, 0.3, z2);
        if (k % 4 === 0) { var fl = M.glowSprite(['#73D6D0', '#9fd8ff', '#bfa8ff'][k % 3], 1.2, 0.6); fl.position.set(x2, 0.9, z2); stage.add(fl); }
      }
      o.castShadow = true; stage.add(o);
    }
    // 孢子
    var N = 160, pa = new Float32Array(N * 3);
    for (var s = 0; s < N; s++) { pa[s * 3] = (rnd() - 0.5) * 12; pa[s * 3 + 1] = rnd() * 4; pa[s * 3 + 2] = (rnd() - 0.5) * 10 - 1; }
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
    var spores = new THREE.Points(pg, new THREE.PointsMaterial({ map: T.glow(), size: 0.09, color: bg.decor === 'wither' ? 0xd9cf9b : 0x9fe9e2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    stage.add(spores); B3.spores = spores;
    // 對象
    var spec = st.def.sprite || {};
    var cr = V.creatures3d.build(st.id, spec);
    var big = spec.shape === 'beast' ? 0.8 : st.def.rank === 'mid' ? 1.05 : 1.55;
    cr.root.scale.multiplyScalar(big);
    stage.add(cr.root);
    if (spec.shape === 'beast') cr.root.rotation.y = 0.55;   // 首領斜側身，看得到拱背與背上的花園
    // 珂潾（背影，在鏡頭前方左側）
    var ps = (V.data.start && V.data.start.sprite) || {};
    var kor = M.character(ps, { player: true });
    kor.root.position.set(-1.25, 0, 2.6); kor.root.rotation.y = Math.PI + 0.35; stage.add(kor.root);
    // 防護的光膜
    var shield = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), M.basic('#73D6D0', { add: true, opacity: 0.0 }));
    shield.material = shield.material.clone(); shield.material.opacity = 0; shield.position.set(-1.25, 0.7, 2.6); stage.add(shield);
    // 封脈夾（架夾後出現）
    var clamp = new THREE.Group();
    [-1, 1].forEach(function (sd) {
      var jaw = new THREE.Mesh(new THREE.TorusGeometry(0.9 * big * 0.6, 0.06, 6, 20, Math.PI * 0.8), M.mat('#292B2C', { rough: 0.5, metal: 0.4 }));
      jaw.rotation.set(Math.PI / 2, 0, sd > 0 ? 0.3 : Math.PI + 0.3); clamp.add(jaw);
    });
    clamp.position.y = cr.focusY * big; clamp.visible = false; stage.add(clamp);
    // 隔離的膜（收口後蓋上）
    var memb = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M.mat('#292B2C', { opacity: 0.0, rough: 0.9 }));
    memb.material = memb.material.clone(); memb.scale.setScalar(cr.radius * big * 1.6 + 0.4); memb.position.y = cr.focusY * big * 0.8; stage.add(memb);
    cur = { st: st, cr: cr, big: big, kor: kor, shield: shield, clamp: clamp, memb: memb, calm: 0, iso: 0, wildBase: spec.wild != null ? spec.wild : 0.4 };
    B3.glowLight.position.set(0, cr.focusY * big + 0.4, 0.6);
    drops = []; tastes = [];
    t0 = 0;
  }

  B3.active = function () { return !!(V.battle && V.battle.st && V.battle.st.el); };
  B3.current = function () { return cur; };

  function onFx(cls) {
    if (cls === 'fx-good') fxState.good = 1;
    else if (cls === 'fx-bad' || cls === 'fx-hurt') fxState.hurt = 1;
    else if (cls === 'fx-load') fxState.load = 1;
    else if (cls === 'fx-shuffle') fxState.shuffle = 1;
    else if (cls === 'fx-guard') fxState.guard = 1;
    else if (cls === 'fx-isolate') fxState.isolate = 1;
  }
  function onDrop(color) {
    if (!cur) return;
    var s = M.glowSprite(color, 0.35, 1); s.material = s.material.clone(); s.material.color.set(color);
    var core = new THREE.Mesh(M.geo('b3-drop', function () { var g = new THREE.SphereGeometry(0.07, 8, 6); g.scale(1, 1.4, 1); return g; }), M.mat(color, { emissive: color, ei: 1.5 }));
    var g2 = new THREE.Group(); g2.add(s, core);
    g2.position.set(-0.9, 1.4, 2.2); stage.add(g2);
    drops.push({ g: g2, t: 0, from: cur.kor.root.position.clone().add(new THREE.Vector3(0.2, 1.1, 0)), to: new THREE.Vector3(0, cur.cr.focusY * cur.big, 0) });
  }
  function onTaste(glyph) {
    if (!cur) return;
    var info = V.GLYPHS[glyph] || { color: '#ffffff' };
    var s = M.glowSprite(info.color, 0.5, 1); s.material = s.material.clone();
    s.position.set(0, cur.cr.focusY * cur.big, 0); stage.add(s);
    tastes.push({ g: s, t: 0, from: s.position.clone(), to: cur.kor.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)) });
  }

  B3.render = function (dt, raw) {
    if (!scene) init();
    var B = V.battle, st = B.st;
    if (!cur || cur.st !== st) buildStage(st);
    t0 += raw;
    var t = t0, r = V.r3d.renderer;
    // 狀態 → 外觀
    var imb = Math.max(0, Math.min(100, st.imbalance));
    var done = st.result === 'stabilized' || st.result === 'read';
    var tc = done ? 1 : st.def.endOnReveal ? 0.3 : Math.max(0, (40 - imb) / 40) * 0.5;
    cur.calm += (tc - cur.calm) * Math.min(1, raw * 2);
    var wild = cur.wildBase * (0.35 + imb / 100);
    if (st.result === 'isolated') cur.iso = Math.min(1, cur.iso + raw * 0.8);
    for (var k in fxState) fxState[k] = Math.max(0, fxState[k] - raw * 1.6);
    cur.cr.update(raw, t, { wild: wild, calm: cur.calm, hurt: fxState.hurt, good: fxState.good });
    cur.cr.root.position.x = fxState.shuffle ? Math.sin(t * 40) * 0.08 * fxState.shuffle : 0;
    cur.cr.root.rotation.y = (cur.st.def.sprite && cur.st.def.sprite.shape === 'beast' ? 0.55 : 0) + fxState.shuffle * 2.5;
    cur.kor.update(raw, 0, t);
    cur.kor.armR.rotation.x = -0.6 - fxState.guard * 0.6; cur.kor.armL.rotation.x = -0.3 - fxState.guard * 0.8;
    cur.shield.material.opacity = (st.guard ? 0.12 : 0) + fxState.guard * 0.25;
    cur.clamp.visible = !!st.clamp || st.result === 'isolated';
    if (cur.clamp.visible) cur.clamp.rotation.y = t * 0.6;
    cur.memb.material.opacity = cur.iso * 0.85;
    cur.memb.scale.setScalar((cur.cr.radius * cur.big * 1.6 + 0.4) * (1.2 - cur.iso * 0.3));
    B3.ring.material.color.set(done ? '#73D6D0' : imb >= 70 ? '#A64232' : imb >= 30 ? '#D66A32' : '#73D6D0');
    B3.ring.scale.setScalar(1 + Math.sin(t * 2) * 0.03 + fxState.good * 0.3);
    B3.glowLight.intensity = 1.2 + fxState.good * 4 + cur.calm * 1.5;
    B3.glowLight.color.set(fxState.load > 0.1 ? '#a48ac0' : '#73D6D0');
    B3.hurtLight.intensity = fxState.hurt * 6;
    B3.key.castShadow = V.quality.p().shadows;
    // 藥滴與嚐味的光點
    drops = drops.filter(function (d) {
      d.t += raw / 0.6; var k2 = Math.min(1, d.t);
      d.g.position.lerpVectors(d.from, d.to, k2); d.g.position.y += Math.sin(k2 * Math.PI) * 0.9;
      if (d.t >= 1) { stage.remove(d.g); return false; } return true;
    });
    tastes = tastes.filter(function (d) {
      d.t += raw / 0.5; var k3 = Math.min(1, d.t);
      d.g.position.lerpVectors(d.from, d.to, k3); d.g.position.y += Math.sin(k3 * Math.PI) * 0.6;
      d.g.material.opacity = 1 - k3 * 0.6;
      if (d.t >= 1) { stage.remove(d.g); return false; } return true;
    });
    var sp = B3.spores.geometry.attributes.position;
    for (var i = 0; i < sp.count; i++) { var y = sp.getY(i) + raw * 0.25; if (y > 4) y = 0; sp.setY(i, y); }
    sp.needsUpdate = true;
    // 鏡頭：從珂潾右後方看向對象，讓對象落在舞台區
    var W = V.r3d.w, H = V.r3d.h;
    camera.aspect = W / H;
    var stEl = st.el && st.el.querySelector('.b-stage'), rect = stEl ? stEl.getBoundingClientRect() : null;
    // 直向：資訊欄疊在舞台上方，對象要放在資訊欄下面露出的那一塊
    var infoEl = st.el && st.el.querySelector('.b-info');
    if (rect && infoEl) {
      var ir = infoEl.getBoundingClientRect();
      if (ir.bottom > rect.top && ir.top <= rect.top + 4 && ir.left <= rect.left + 4 && ir.bottom < rect.bottom - 40) rect = { left: rect.left, top: ir.bottom, width: rect.width, height: rect.bottom - ir.bottom, bottom: rect.bottom };
    }
    var fy = cur.cr.focusY * cur.big, fit = Math.max(1.2, cur.cr.height * cur.big * 1);
    var rh = rect && rect.height > 20 ? rect.height : H * 0.6;
    // 讓對象約佔舞台高度的六成
    var d = fit / (0.6 * rh / H) / (2 * Math.tan(camera.fov * Math.PI / 360)) + 1.2;
    var sway = Math.sin(t * 0.25) * 0.15;
    camera.position.set(0.15 * d + sway, fy + d * 0.28, d);
    camera.lookAt(0, fy * 0.9, 0);
    var kz = Math.min(0.42 * d, d - 3.4), kx = -0.12 * kz - 0.45; cur.kor.root.position.set(kx, 0, kz); cur.shield.position.set(kx, 0.7, kz);
    if (rect && rect.width > 20 && rect.height > 20) {
      var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    r.render(scene, camera);
  };
  // 測試用：對象中心的螢幕座標
  B3.projectCreature = function () {
    if (!cur) return null;
    var v = new THREE.Vector3(0, cur.cr.focusY * cur.big, 0).project(camera);
    return { x: (v.x * 0.5 + 0.5) * V.r3d.w, y: (-v.y * 0.5 + 0.5) * V.r3d.h, z: v.z };
  };
})();
