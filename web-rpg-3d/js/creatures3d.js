/*
 * 遭遇對象的 3D 造型。依 2D 版的 sprite 規格（shape／body／dark／glow／accent／plant／vein／wild／calmBody）上色，
 * 部分對象（序章的 13 種）有專屬造型；其他 id 依 shape 走通用造型，所以後續章節的新對象不必先做模型也能顯示。
 * 回傳 { root, radius, height, update(dt, t, st) }；st = { wild:0–1, calm:0–1, hurt:0–1, good:0–1, clamp:bool }
 * 「怪物必須能看出原本溫馴的殘影」：失衡時扭動、脈絡轉紅；穩定後放鬆、脈絡回到青光。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE, M = V.models3d;
  var C = V.creatures3d = {};

  function std(color, o) {
    o = o || {};
    var m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: o.rough != null ? o.rough : 0.7, metalness: 0,
      emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: o.ei != null ? o.ei : 1, flatShading: !!o.flat });
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = !!o.depthWrite; }
    if (o.side) m.side = o.side;
    if (o.map) m.map = o.map;
    return m;
  }
  function mesh(g, m) { var x = new THREE.Mesh(g, m); x.castShadow = true; return x; }
  function col(c) { return new THREE.Color(c); }

  // 共用的狀態著色：body 材質由 body → calmBody、脈絡由 vein/glow → 青
  function painter(spec, bodyMats, veinMats) {
    var b0 = col(spec.body || '#6a6a6a'), b1 = col(spec.calmBody || spec.body || '#6a7a6a');
    var v0 = col(spec.vein || spec.glow || '#73D6D0'), v1 = col('#73D6D0');
    var tmp = new THREE.Color();
    return function (st) {
      var k = st.calm || 0;
      bodyMats.forEach(function (m) { tmp.copy(b0).lerp(b1, k); if (st.hurt) tmp.lerp(col('#ff6a50'), st.hurt * 0.35); m.color.copy(tmp); });
      veinMats.forEach(function (m) {
        tmp.copy(v0).lerp(v1, k); if (st.good) tmp.lerp(col('#e8fffb'), st.good * 0.6);
        m.emissive.copy(tmp); m.color.copy(tmp).multiplyScalar(0.6);
        m.emissiveIntensity = 0.8 + (st.good || 0) * 1.5 + (1 - k) * (st.wild || 0) * 0.6;
      });
    };
  }

  // ---------------- 孢團／水樣（mote） ----------------
  function mote(spec, id) {
    var root = new THREE.Group(), core = new THREE.Group(); root.add(core);
    var isWater = /pool|spring/.test(id || '');
    var shell = mesh(M.geo('mote-shell', function () { return new THREE.IcosahedronGeometry(0.42, 3); }),
      std(spec.body || '#2b6b6b', { opacity: isWater ? 0.45 : 0.7, rough: 0.15, emissive: spec.glow || '#73D6D0', ei: 0.25, depthWrite: false }));
    core.add(shell);
    var inner = mesh(M.geo('mote-inner', function () { return new THREE.IcosahedronGeometry(0.22, 2); }), std(spec.glow || '#73D6D0', { emissive: spec.glow || '#73D6D0', ei: 1.2 }));
    core.add(inner);
    var spores = [];
    for (var i = 0; i < 14; i++) {
      var s = mesh(M.geo('mote-spore', function () { return new THREE.SphereGeometry(0.035, 6, 4); }), std(spec.glow || '#73D6D0', { emissive: spec.glow || '#73D6D0', ei: 1.5 }));
      s.userData = { r: 0.3 + Math.random() * 0.35, a: Math.random() * 6.28, b: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.8 };
      core.add(s); spores.push(s);
    }
    if (isWater) {
      // 取樣用的陶碗（水樣漂在碗上方）
      var bowl = mesh(M.geo('mote-bowl', function () { var g = new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); return g; }), std('#c9bc9f', { rough: 0.8, side: THREE.DoubleSide }));
      bowl.rotation.x = Math.PI; bowl.position.y = 0.22; root.add(bowl);
    }
    var glow = M.glowSprite(spec.glow || '#73D6D0', 2.0, 0.6); core.add(glow);
    core.position.y = isWater ? 0.85 : 0.75;
    var paint = painter(spec, [shell.material], [inner.material]);
    return { root: root, radius: 0.5, height: 1.3, focusY: core.position.y,
      update: function (dt, t, st) {
        var w = (st.wild || 0) * (1 - (st.calm || 0));
        core.position.y = (isWater ? 0.85 : 0.75) + Math.sin(t * 1.3) * 0.06;
        core.rotation.y += dt * (0.3 + w * 2);
        shell.scale.setScalar(1 + Math.sin(t * 2.1) * 0.03 + w * Math.sin(t * 13) * 0.05);
        spores.forEach(function (s) {
          var u = s.userData; u.a += dt * u.sp * (1 + w * 3); u.b += dt * u.sp * 0.7;
          s.position.set(Math.cos(u.a) * u.r, Math.sin(u.b) * u.r * 0.8, Math.sin(u.a) * u.r);
        });
        glow.material.opacity = 0.45 + Math.sin(t * 2) * 0.12 + (st.good || 0) * 0.4;
        paint(st);
      } };
  }

  // ---------------- 植物形（縫葉、鹹殼滲口、池糖囊、鐘管草、儲水共生體、痂口） ----------------
  function plant(spec, id) {
    var root = new THREE.Group();
    var bodyM = std(spec.body || '#4f7a5a', { rough: 0.75, map: V.tex3d.bark() });
    var darkM = std(spec.dark || '#1d2a24', { rough: 0.9 });
    var plantM = std(spec.plant || spec.body || '#5f9a78', { rough: 0.7 });
    var veinM = std(spec.glow || '#73D6D0', { emissive: spec.glow || '#73D6D0', ei: 1 });
    var accM = std(spec.accent || '#8fc9a3', { rough: 0.6 });
    var parts = [], mouths = [], tubes = [];
    var height = 1.2, radius = 0.6, focusY = 0.6;
    // 根盤：植物的根都是「接口」
    var rootDisk = new THREE.Group(); root.add(rootDisk);
    for (var r = 0; r < 6; r++) {
      var rt = mesh(M.geo('pl-root', function () { var g = new THREE.CylinderGeometry(0.025, 0.05, 0.6, 5); g.rotateZ(Math.PI / 2); g.translate(0.3, 0, 0); return g; }), darkM);
      rt.rotation.y = r * 1.05 + 0.3; rt.rotation.z = -0.15; rt.position.y = 0.04; rootDisk.add(rt);
      var nub = mesh(M.geo('pl-nub', function () { return new THREE.SphereGeometry(0.045, 6, 5); }), veinM);
      nub.position.set(Math.cos(-(r * 1.05 + 0.3)) * 0.6, 0.0, Math.sin(-(r * 1.05 + 0.3)) * 0.6); rootDisk.add(nub);
    }
    if (/sutureleaf|leaf/.test(id) || spec.accent === '#8fc9a3') {
      // 縫葉「五嘴」：五片帶縫合線的葉，各有一張開合的嘴
      var stem = mesh(M.geo('sl-stem', function () { var g = new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8); g.translate(0, 0.35, 0); return g; }), bodyM);
      root.add(stem);
      for (var i = 0; i < 5; i++) {
        var arm = new THREE.Group(); arm.position.y = 0.55; arm.rotation.y = i * 1.2566; root.add(arm);
        var leaf = mesh(M.geo('sl-leaf', function () { var g = new THREE.SphereGeometry(0.28, 10, 8); g.scale(0.55, 0.16, 1); g.translate(0, 0, 0.3); return g; }), plantM);
        leaf.rotation.x = -0.5; arm.add(leaf);
        var seam = mesh(M.geo('sl-seam', function () { var g = new THREE.BoxGeometry(0.012, 0.012, 0.5); g.translate(0, 0.045, 0.3); return g; }), veinM);
        seam.rotation.x = -0.5; arm.add(seam);
        var mouth = new THREE.Group(); mouth.position.set(0, 0.32, 0.5); arm.add(mouth);
        var lipU = mesh(M.geo('sl-lip', function () { var g = new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); return g; }), accM);
        var lipD = lipU.clone(); lipD.rotation.x = Math.PI; mouth.add(lipU, lipD);
        mouths.push({ g: mouth, u: lipU, d: lipD, ph: i * 1.3 });
        parts.push(arm);
      }
      height = 1.0; focusY = 0.6;
    } else if (/shell|crust|saltshell/.test(id) || spec.glow === '#c58a52') {
      // 鹹殼滲口：結鹽殼的丘，中間一個滲出鏽色汁液的口
      var mound = mesh(M.geo('sh-mound', function () { var g = new THREE.SphereGeometry(0.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.7, 1); return g; }), bodyM);
      root.add(mound);
      for (var c = 0; c < 9; c++) {
        var cr = mesh(M.geo('sh-crystal', function () { return new THREE.OctahedronGeometry(0.12, 0); }), std('#e6dcc4', { rough: 0.3, flat: true }));
        var a = c * 0.7; cr.position.set(Math.cos(a) * 0.4, 0.25 + (c % 3) * 0.06, Math.sin(a) * 0.4); cr.scale.set(0.6, 1.4, 0.6); cr.rotation.z = Math.cos(a) * 0.4; root.add(cr);
      }
      var vent = mesh(M.geo('sh-vent', function () { return new THREE.TorusGeometry(0.16, 0.06, 8, 14); }), accM); vent.rotation.x = Math.PI / 2; vent.position.y = 0.42; root.add(vent);
      var ooze = mesh(M.geo('sh-ooze', function () { return new THREE.SphereGeometry(0.12, 10, 8); }), veinM); ooze.position.y = 0.42; root.add(ooze);
      mouths.push({ g: ooze, pulse: true, ph: 0 });
      height = 0.9; focusY = 0.45;
    } else if (/sac|sugar/.test(id) || spec.glow === '#9fd8e3') {
      // 池糖囊：半透明的囊，內有糖液
      var sac = mesh(M.geo('sac', function () { var g = new THREE.SphereGeometry(0.45, 18, 14); g.scale(1, 1.15, 1); g.translate(0, 0.5, 0); return g; }), std(spec.body || '#3a5a7a', { opacity: 0.55, rough: 0.2, emissive: spec.glow, ei: 0.2 }));
      root.add(sac); parts.push(sac);
      var syrup = mesh(M.geo('sac-syrup', function () { var g = new THREE.SphereGeometry(0.3, 14, 10); g.translate(0, 0.42, 0); return g; }), veinM); root.add(syrup);
      for (var w = 0; w < 4; w++) {
        var wr = mesh(M.geo('sac-wrinkle', function () { return new THREE.TorusGeometry(0.4, 0.02, 4, 20, Math.PI); }), darkM);
        wr.position.y = 0.5; wr.rotation.set(Math.PI / 2, 0, w * 0.8); root.add(wr);
      }
      mouths.push({ g: syrup, pulse: true, ph: 0 });
      height = 1.1; focusY = 0.55;
    } else if (/bell|tube|chime/.test(id) || spec.glow === '#73D6D0' && spec.plant === '#98613C') {
      // 鐘管草：一叢高的管，管口像鐘
      for (var b = 0; b < 7; b++) {
        var tg = new THREE.Group(); var ang = b * 0.9, rad = b ? 0.2 + (b % 3) * 0.1 : 0;
        tg.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad); root.add(tg);
        var hh = 0.8 + (b * 37 % 5) * 0.15;
        var tube = mesh(M.geo('bt-tube' + (b % 5), function () { var g = new THREE.CylinderGeometry(0.04, 0.06, hh, 7); g.translate(0, hh / 2, 0); return g; }), bodyM); tg.add(tube);
        var bell = mesh(M.geo('bt-bell', function () { var g = new THREE.CylinderGeometry(0.11, 0.04, 0.16, 10, 1, true); return g; }), std(spec.accent || '#c58a52', { side: THREE.DoubleSide }));
        bell.position.y = hh; tg.add(bell);
        var lit = mesh(M.geo('bt-lit', function () { return new THREE.SphereGeometry(0.04, 6, 5); }), veinM); lit.position.y = hh + 0.02; tg.add(lit);
        tubes.push({ g: tg, ph: b * 0.8 });
      }
      height = 1.5; focusY = 0.8;
    } else if (/sponge|store|reservoir|cistern/.test(id) || spec.glow === '#9fb8e0') {
      // 塌陷的儲水共生體：幾個塌下去的水囊與菌絲網
      for (var q = 0; q < 4; q++) {
        var bl = mesh(M.geo('st-bulb', function () { var g = new THREE.SphereGeometry(0.3, 12, 10); g.scale(1, 0.7, 1); return g; }), std(spec.body || '#4a5a7a', { opacity: 0.75, rough: 0.3, depthWrite: true }));
        bl.position.set(Math.cos(q * 1.57) * 0.32, 0.22 + (q % 2) * 0.08, Math.sin(q * 1.57) * 0.32); root.add(bl); parts.push(bl);
      }
      var net = mesh(M.geo('st-net', function () { var g = new THREE.IcosahedronGeometry(0.55, 1); return g; }), std(spec.accent || '#6d86a8', { opacity: 0.35, rough: 0.9 }));
      net.material.wireframe = true; net.position.y = 0.3; root.add(net);
      var heart = mesh(M.geo('st-heart', function () { return new THREE.SphereGeometry(0.14, 10, 8); }), veinM); heart.position.y = 0.45; root.add(heart);
      mouths.push({ g: heart, pulse: true, ph: 0 });
      height = 1.0; focusY = 0.45;
    } else {
      // 滲硫的痂口：硬化痂殼上的裂口（其他未知植物型也用這個）
      var scab = mesh(M.geo('sc-scab', function () { var g = new THREE.DodecahedronGeometry(0.5, 1); g.scale(1.2, 0.55, 1); return g; }), std(spec.body || '#c9b06a', { rough: 0.95, flat: true }));
      scab.position.y = 0.2; root.add(scab);
      var crack = mesh(M.geo('sc-crack', function () { var g = new THREE.TorusGeometry(0.2, 0.05, 6, 12); return g; }), accM); crack.rotation.x = Math.PI / 2; crack.position.y = 0.45; root.add(crack);
      var hot = mesh(M.geo('sc-hot', function () { return new THREE.SphereGeometry(0.13, 10, 8); }), veinM); hot.position.y = 0.45; root.add(hot);
      mouths.push({ g: hot, pulse: true, ph: 0 });
      height = 0.9; focusY = 0.45;
    }
    var paint = painter(spec, [bodyM], [veinM]);
    return { root: root, radius: radius, height: height, focusY: focusY,
      update: function (dt, t, st) {
        var w = (st.wild || 0) * (1 - (st.calm || 0));
        mouths.forEach(function (m) {
          if (m.pulse) { m.g.scale.setScalar(1 + Math.sin(t * (2 + w * 6) + m.ph) * (0.08 + w * 0.12)); return; }
          var open = Math.max(0, Math.sin(t * (1.5 + w * 5) + m.ph)) * (0.25 + w * 0.6);
          m.u.rotation.x = -open; m.d.rotation.x = Math.PI + open;
        });
        parts.forEach(function (p, i) { p.rotation.z = Math.sin(t * (1 + w * 5) + i) * (0.03 + w * 0.12); });
        tubes.forEach(function (tb) { tb.g.rotation.z = Math.sin(t * (1.1 + w * 4) + tb.ph) * (0.05 + w * 0.15); tb.g.rotation.x = Math.cos(t * 0.9 + tb.ph) * 0.04; });
        root.rotation.y = Math.sin(t * 0.3) * 0.1 + (w > 0.3 ? Math.sin(t * 17) * w * 0.03 : 0);
        paint(st);
      } };
  }

  // ---------------- 群聚形（汲蟲淤塞、燈蛾群、死潮） ----------------
  function swarm(spec, id, big) {
    var root = new THREE.Group();
    var bodyM = std(spec.body || '#8a8a80', { rough: 0.6 });
    var veinM = std(spec.glow || '#5a6a66', { emissive: spec.glow || '#5a6a66', ei: 1 });
    var moth = /moth|lamp/.test(id) || spec.glow === '#ffe9a0';
    var n = big ? 70 : (moth ? 26 : 40), bugs = [];
    var R = big ? 1.1 : 0.55;
    var bugG = moth ? M.geo('moth', function () { var g = new THREE.PlaneGeometry(0.16, 0.1); return g; }) : M.geo('mite', function () { var g = new THREE.CapsuleGeometry(0.04, 0.1, 3, 6); g.rotateZ(Math.PI / 2); return g; });
    var bugM = moth ? std(spec.body || '#c9b06a', { side: THREE.DoubleSide, emissive: spec.glow, ei: 0.8, opacity: 0.9, depthWrite: true }) : bodyM;
    for (var i = 0; i < n; i++) {
      var b = mesh(bugG, bugM);
      b.userData = { a: Math.random() * 6.28, h: Math.random(), r: R * (0.3 + Math.random() * 0.7), sp: 0.5 + Math.random() * 1.2, ph: Math.random() * 6 };
      root.add(b); bugs.push(b);
    }
    var clot = null;
    if (!moth) {
      clot = mesh(M.geo(big ? 'clot-big' : 'clot', function () { var g = new THREE.IcosahedronGeometry(big ? 0.9 : 0.42, 2); g.scale(1.2, 0.6, 1); return g; }), std(spec.dark || '#2a2a26', { rough: 1, flat: true }));
      clot.position.y = big ? 0.45 : 0.22; root.add(clot);
      if (big) {   // 死潮：管壁裡卡住的一大團，中間有一點還在跳的青光
        var pipeRing = mesh(M.geo('clot-ring', function () { return new THREE.TorusGeometry(1.25, 0.18, 8, 24); }), std('#98613C', { map: V.tex3d.bark() }));
        pipeRing.position.y = 0.9; root.add(pipeRing);
      }
    }
    var heart = mesh(M.geo('sw-heart', function () { return new THREE.SphereGeometry(0.1, 8, 6); }), veinM); heart.position.y = big ? 0.6 : 0.3; root.add(heart);
    var glow = M.glowSprite(spec.glow || '#73D6D0', big ? 2.4 : 1.2, 0.5); glow.position.y = heart.position.y; root.add(glow);
    var paint = painter(spec, [bodyM], [veinM]);
    return { root: root, radius: R, height: big ? 2 : 1.2, focusY: big ? 0.9 : 0.5,
      update: function (dt, t, st) {
        var w = (st.wild || 0) * (1 - (st.calm || 0)), calm = st.calm || 0;
        bugs.forEach(function (b) {
          var u = b.userData; u.a += dt * u.sp * (0.6 + w * 2.5);
          var r = u.r * (1 - calm * 0.3);
          if (moth) {
            b.position.set(Math.cos(u.a) * r, 0.5 + u.h * 0.9 + Math.sin(t * 3 + u.ph) * 0.12, Math.sin(u.a) * r);
            b.rotation.set(Math.sin(t * 20 + u.ph) * 0.8, -u.a, 0);
          } else {
            b.position.set(Math.cos(u.a) * r, (big ? 0.2 : 0.08) + u.h * (big ? 0.7 : 0.3) * (1 - calm * 0.5), Math.sin(u.a) * r);
            b.rotation.y = -u.a;
          }
        });
        if (clot) clot.scale.setScalar(1 + Math.sin(t * (1.5 + w * 4)) * 0.03);
        heart.scale.setScalar(0.8 + Math.max(0, Math.sin(t * 3)) * 0.4 + (st.good || 0) * 0.6);
        glow.material.opacity = 0.35 + (st.good || 0) * 0.5 + calm * 0.3;
        paint(st);
      } };
  }

  // ---------------- 獸形（慢拱：拱背獸，背上長著一座小花園） ----------------
  function beast(spec) {
    var root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    var bodyM = std(spec.body || '#6a4a4a', { rough: 0.8, map: V.tex3d.bark() });
    var darkM = std(spec.dark || '#2a1618', { rough: 0.9 });
    var accM = std(spec.accent || '#98613C', { rough: 0.7 });
    var veinM = std(spec.vein || spec.glow || '#A64232', { emissive: spec.vein || spec.glow || '#A64232', ei: 1 });
    var plantM = std(spec.plant || '#7a3a2a', { rough: 0.8 });
    var S = 1.5;   // 首領：比珂潾大很多
    var torso = mesh(M.geo('bst-torso', function () { var g = new THREE.SphereGeometry(0.6, 20, 14); g.scale(1.5, 1.0, 0.95); return g; }), bodyM);
    torso.position.y = 0.95; body.add(torso);
    // 拱背的骨板
    for (var p = 0; p < 7; p++) {
      var plate = mesh(M.geo('bst-plate', function () { var g = new THREE.SphereGeometry(0.22, 8, 6); g.scale(1, 0.35, 1.3); return g; }), accM);
      var a = -1.0 + p * 0.33; plate.position.set(Math.sin(a) * 0.82, 0.95 + Math.cos(a) * 0.58, 0); plate.rotation.z = -a; body.add(plate);
    }
    // 背上的花園
    var garden = new THREE.Group(); garden.position.set(0, 1.55, 0); body.add(garden);
    for (var f = 0; f < 9; f++) {
      var gh = 0.2 + Math.random() * 0.35;
      var st2 = mesh(M.geo('bst-stalk' + (f % 3), function () { var g = new THREE.CylinderGeometry(0.02, 0.03, gh, 5); g.translate(0, gh / 2, 0); return g; }), plantM);
      st2.position.set((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.5); st2.rotation.z = (Math.random() - 0.5) * 0.6; garden.add(st2);
      var bud = mesh(M.geo('bst-bud', function () { var g = new THREE.SphereGeometry(0.07, 8, 6); g.scale(1, 0.7, 1); return g; }), f % 3 ? plantM : veinM);
      bud.position.copy(st2.position); bud.position.y = gh; garden.add(bud);
    }
    // 頭（低垂、溫順的長臉），嘴邊的鬚
    var head = new THREE.Group(); head.position.set(0.95, 0.85, 0); body.add(head);
    var skull = mesh(M.geo('bst-head', function () { var g = new THREE.SphereGeometry(0.3, 14, 10); g.scale(1.35, 0.85, 0.85); return g; }), bodyM);
    skull.position.x = 0.15; head.add(skull);
    var snout = mesh(M.geo('bst-snout', function () { var g = new THREE.SphereGeometry(0.16, 10, 8); g.scale(1.2, 0.8, 0.9); return g; }), accM);
    snout.position.set(0.48, -0.08, 0); head.add(snout);
    var eyeM = std('#f2e6c8', { emissive: spec.glow || '#A64232', ei: 0.9 });
    [-1, 1].forEach(function (s) {
      var eye = mesh(M.geo('bst-eye', function () { return new THREE.SphereGeometry(0.045, 8, 6); }), eyeM); eye.position.set(0.3, 0.07, s * 0.2); head.add(eye);
      var tusk = mesh(M.geo('bst-tusk', function () { var g = new THREE.ConeGeometry(0.035, 0.22, 6); g.rotateZ(Math.PI * 0.75); return g; }), std('#e6dcc4')); tusk.position.set(0.5, -0.17, s * 0.12); head.add(tusk);
    });
    // 腿
    var legs = [];
    [[0.55, 0.32], [0.55, -0.32], [-0.55, 0.32], [-0.55, -0.32]].forEach(function (lp, i) {
      var lg = new THREE.Group(); lg.position.set(lp[0], 0.7, lp[1]); body.add(lg);
      var thigh = mesh(M.geo('bst-leg', function () { var g = new THREE.CapsuleGeometry(0.13, 0.42, 4, 8); g.translate(0, -0.33, 0); return g; }), bodyM);
      lg.add(thigh);
      var foot = mesh(M.geo('bst-foot', function () { var g = new THREE.CylinderGeometry(0.12, 0.15, 0.1, 8); return g; }), darkM); foot.position.y = -0.66; lg.add(foot);
      legs.push({ g: lg, ph: i * 1.6 });
    });
    // 腹側的脈紋（失衡時是硫病紅，穩定後回到青）
    var veins = [];
    for (var vv = 0; vv < 5; vv++) {
      var vn = mesh(M.geo('bst-vein', function () { return new THREE.TorusGeometry(0.62, 0.018, 4, 26, Math.PI * 0.9); }), veinM);
      vn.position.set(-0.4 + vv * 0.2, 0.95, 0); vn.rotation.set(0, Math.PI / 2, 0.2 * (vv - 2)); vn.scale.set(1, 1.05, 0.98); body.add(vn); veins.push(vn);
    }
    var tail = mesh(M.geo('bst-tail', function () { var g = new THREE.ConeGeometry(0.12, 0.6, 8); g.rotateZ(Math.PI / 2); g.translate(-0.3, 0, 0); return g; }), bodyM);
    tail.position.set(-0.9, 1.0, 0); body.add(tail);
    root.scale.setScalar(S);
    body.rotation.y = -Math.PI / 2;   // 臉朝 +z（朝向珂潾）
    var paint = painter(spec, [bodyM], [veinM]);
    return { root: root, radius: 1.4, height: 2.8, focusY: 1.5,
      update: function (dt, t, st) {
        var w = (st.wild || 0) * (1 - (st.calm || 0));
        var br = Math.sin(t * (0.9 + w * 1.5));
        torso.scale.set(1 + br * 0.025, 1 + br * 0.04, 1 + br * 0.025);
        head.rotation.z = -0.15 + Math.sin(t * 0.7) * 0.06 + w * Math.sin(t * 9) * 0.06 - (st.calm || 0) * 0.15;
        head.rotation.y = Math.sin(t * 0.5) * 0.12;
        legs.forEach(function (l) { l.g.rotation.z = w * Math.sin(t * 5 + l.ph) * 0.12; });
        tail.rotation.y = Math.sin(t * 1.3) * 0.3;
        garden.rotation.y = Math.sin(t * 0.4) * 0.05;
        body.position.y = w * Math.abs(Math.sin(t * 6)) * 0.03;
        paint(st);
      } };
  }

  // 依遭遇 id 與 sprite 規格選造型
  C.build = function (encId, spec) {
    spec = spec || {}; encId = encId || '';
    var id = encId.toLowerCase();
    var shape = spec.shape || 'mote';
    var c;
    if (shape === 'beast') c = beast(spec);
    else if (shape === 'swarm') c = swarm(spec, id, /mid|dead|tide|clog|death/.test(id) || spec.wild >= 0.75);
    else if (shape === 'plant') c = plant(spec, id);
    else c = mote(spec, id);
    c.root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return c;
  };
})();
