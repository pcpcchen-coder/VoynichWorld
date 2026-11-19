/*
 * 序章〈味變〉：階梯泉（下三階）、活土原、脈橋的名稱與實體（地形在 maps-tiles.js）。
 */
(function (V) {
  'use strict';
  var D = V.data;

  // 乾裂活土：每一格 x（排除 skip）放一個踩踏觸發，踩上去滑回邊緣並體力 −2（§5.4、S0-4）
  function crackTriggers(mapId, x0, y0, x1, y1, back, skip) {
    var g = D.maps[mapId].ground, out = [];
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (g[y].charAt(x) !== 'x') continue;
      if (skip && skip.some(function (p) { return p[0] === x && p[1] === y; })) continue;
      out.push({ type: 'trigger', id: 'crack_' + x + '_' + y, x: x, y: y, once: false,
        actions: [['hurt', 2], ['sfx', 'rumble'], ['toast', '殼塌了一角——滑回邊緣（體力 −2）'], ['warp', mapId, back[0], back[1], back[2] || 'left']] });
    }
    return out;
  }

  // ======================= 階梯泉（下三階）=======================
  var te = D.maps['map.miststep.terrace'];
  te.name = '階梯泉'; te.subtitle = '下三階';
  te.zone = 'miststep'; te.tone = 'dawn'; te.ambience = 'village';
  te.particles = { spores: 10, mist: 7 };
  te.onEnter = [{ cond: '!flag.prologue.terrace_seen', actions: [['flag', 'flag.prologue.terrace_seen'], ['dialogue', 'dlg.p0.m0_08_enter']] }];
  te.entities = [
    { type: 'warp', id: 'south', x: 19, y: 31, to: 'map.miststep.station', tx: 19, ty: 1, dir: 'down' },
    { type: 'object', id: 'north', kind: 'hidden', x: 19, y: 0, name: '往上階的路', text: ['〔旁白〕再上去的霧太厚，也還不是今天。'] },
    // 一階
    { type: 'encounter', id: 'seep', encounter: 'enc.p0.salt_crust_seep', x: 19, y: 22, size: 18, hideOnDone: true,
      before: ['〔旁白〕一階的棧道中間結了一塊銅鏽色的殼，有臉盆大。殼底下原本是活土的一處滲口——活土靠這種小口把多的水吐回池裡。現在口被自己吐出來的礦封住了一半，殼縫滲出來的水是渾的。',
        '珂潾：滲口結殼。暖湧的時候會有。', '珂潾：……蒲嬤這句沒說錯。', '珂潾：先嚐。不要因為它看起來像鹹，就當它只有鹹。'],
      onResult: { stabilized: [['lines', ['珂潾：先鹹，後澀。礦把口封住，口後面那一小塊就喝不到水。', '珂潾：治了鹹不治澀，殼掉了它也張不開。兩個都要。']]], isolated: [] } },
    { type: 'object', id: 'g_crystal1', kind: 'gather', x: 4, y: 21, name: '礦泉結晶', items: { 'item.sample.spring_crystal': 2 }, text: ['〔旁白〕池階邊緣的細小晶簇。'] },
    { type: 'object', id: 'g_sap1', kind: 'gather', x: 27, y: 25, name: '鐘管草汁', items: { 'item.sample.bellpipe_sap': 2 }, flags: ['folio.f004.c2'], text: ['〔旁白〕鐘管草的根管滴口，接下乳白的汁液。'] },
    { type: 'object', id: 'chest1', kind: 'chest', x: 34, y: 23, name: '寶匣', items: { 'item.med.emberash': 1, 'item.currency.sugar_tally': 2 } },
    // 二階
    { type: 'object', id: 'obs_sac', kind: 'observe', x: 3, y: 12, name: '健康的池糖囊叢', dialogue: 'dlg.p0.m0_08_obs', flags: ['folio.f005.c1'] },
    { type: 'object', id: 'g_sac', kind: 'gather', x: 9, y: 11, name: '池糖囊', items: { 'item.sample.sugar_sac': 2 }, flags: ['folio.f005.c2'],
      text: ['〔旁白〕珂潾挑了叢外緣一顆熟透的囊，用取樣刀在蒂上轉了半圈。斷口自己收了。'] },
    { type: 'encounter', id: 'sac', encounter: 'enc.p0.shrivelled_sugar_sac', x: 5, y: 14, size: 16,
      before: ['〔旁白〕叢的邊緣有一株不一樣。它的囊癟了一半，皮起了皺，像放了三天的果子。可是最裡面那一顆還是飽的。', '珂潾：外面的癟了，裡面的還飽。', '珂潾：三顆分開嚐。不要嚐了第一顆就當三顆都一樣。'] },
    { type: 'object', id: 'gauge2', kind: 'gauge', x: 31, y: 10, name: '二階水位尺', dialogue: 'dlg.p0.gauge_terrace',
      mark: ['quest:quest.side.p0_tide_marks=active', '!flag.prologue.tide_read_terrace'] },
    { type: 'object', id: 'g_crystal2', kind: 'gather', x: 28, y: 15, name: '礦泉結晶', items: { 'item.sample.spring_crystal': 2 }, text: ['〔旁白〕池階邊緣的細小晶簇。'] },
    { type: 'object', id: 'chest2', kind: 'chest', x: 33, y: 14, name: '寶匣', items: { 'item.use.palate_rinse': 1, 'item.use.spring_cake': 1 } },
    // 三階
    { type: 'trigger', id: 'view', x: 8, y: 3, cond: '!folio.f161.c2', dialogue: 'dlg.p0.m0_09_view' },
    { type: 'object', id: 'obs_view', kind: 'observe', x: 8, y: 3, name: '三階泉源望台', dialogue: 'dlg.p0.m0_09_view' },
    { type: 'encounter', id: 'source', encounter: 'enc.p0.spring_source_sample', x: 19, y: 4, size: 14, dialogue: 'dlg.p0.m0_09_stone',
      mark: '!flag.prologue.tasted_spring_source', onResult: { read: [['dialogue', 'dlg.p0.m0_09_after']] } },
    { type: 'object', id: 'g_crystal3', kind: 'gather', x: 29, y: 2, name: '礦泉結晶（大）', items: { 'item.sample.spring_crystal': 3 }, text: ['〔旁白〕三階泉源口邊上的一大簇晶。'] }
  ].concat(crackTriggers('map.miststep.terrace', 27, 18, 33, 24, [27, 21, 'left']));

  // ======================= 活土原 =======================
  var sf = D.maps['map.miststep.soilflat'];
  sf.name = '活土原'; sf.subtitle = '初泉環・霧階';
  sf.zone = 'miststep'; sf.tone = 'day'; sf.ambience = 'village';
  sf.particles = { spores: 14, mist: 2 };
  sf.onEnter = [
    { cond: ['quest:quest.main.p0_taste_shift>=s5', '!flag.prologue.soilflat_p2_seen'], actions: [['flag', 'flag.prologue.soilflat_p2_seen'], ['tone', 'dusk'], ['dialogue', 'dlg.p0.m0_11_enter']] }
  ];
  sf.entities = [
    { type: 'warp', id: 'west', x: 0, y: 8, to: 'map.miststep.station', tx: 38, ty: 12, dir: 'left' },
    { type: 'warp', id: 'east', x: 43, y: 22, to: 'map.miststep.bridge', tx: 1, ty: 10, dir: 'right',
      requires: 'flag.prologue.bridge_open', lockedText: ['篙：（看了一眼橋）橋今天不過人。霧季，橋面滑。'] },
    { type: 'encounter', id: 'bellpipe', encounter: 'enc.p0.droning_bellpipe', x: 14, y: 8, size: 20, cond: 'flag.prologue.drawmites_dying', hideOnDone: true,
      before: ['〔旁白〕小徑兩旁的鐘管草擠到了路中央。根管在滲液，一股一股的，把棧板泡得發滑。聲音就是從這裡來的：一個音，壓在胸口上。',
        '珂潾：音高比早上低了——', '珂潾：一片指甲。', '珂潾：聆叔的單位是對的。'] },
    { type: 'npc', id: 'gao', actor: 'npc.gao', x: 41, y: 22, dir: 'left', cond: '!flag.prologue.bridge_open', dialogue: 'dlg.p0.npc.gao',
      mark: ['quest:quest.main.p0_taste_shift@s5'] },
    { type: 'npc', id: 'gao2', actor: 'npc.gao', x: 40, y: 20, dir: 'down', cond: 'flag.prologue.bridge_open', dialogue: 'dlg.p0.npc.gao' },
    { type: 'npc', id: 'xu', actor: 'npc.xu', x: 2, y: 6, dir: 'down', cond: ['flag.prologue.puma_forbade_bridge', '!flag.prologue.got_auri_leaf'], dialogue: 'dlg.p0.npc.xu' },
    { type: 'object', id: 'gauge3', kind: 'gauge', x: 3, y: 16, name: '活土原邊尺', dialogue: 'dlg.p0.gauge_soilflat',
      mark: ['quest:quest.side.p0_tide_marks=active', '!flag.prologue.tide_read_soilflat'] },
    { type: 'object', id: 'g_sap', kind: 'gather', x: 9, y: 14, name: '鐘管草汁', items: { 'item.sample.bellpipe_sap': 2 }, flags: ['folio.f004.c2'], text: ['〔旁白〕鐘管草的根管滴口，接下乳白的汁液。'] },
    { type: 'object', id: 'g_sac', kind: 'gather', x: 4, y: 24, name: '池糖囊', items: { 'item.sample.sugar_sac': 2 }, text: ['〔旁白〕一叢池糖囊，挑外緣熟的。'] },
    { type: 'object', id: 'g_water', kind: 'gather', x: 27, y: 25, name: '淨池水（小池邊）', once: false, respawn: false, text: ['〔旁白〕小池邊的淨水。'], actions: [['give', 'item.sample.clean_water', 3]] },
    { type: 'object', id: 'chest_mid', kind: 'chest', x: 18, y: 22, name: '寶匣', items: { 'item.med.indolk': 1, 'item.currency.sugar_tally': 1 } },
    { type: 'object', id: 'chest_ne', kind: 'chest', x: 37, y: 2, name: '寶匣', items: { 'item.use.mist_veil': 1, 'item.use.palate_rinse': 1 } },
    { type: 'encounter', id: 'moths', encounter: 'enc.p0.scrambled_lampmoths', x: 36, y: 3, size: 18, cond: 'flag.prologue.drawmites_dying' },
    { type: 'encounter', id: 'seep', encounter: 'enc.p0.salt_crust_seep', x: 33, y: 18, size: 16,
      before: ['〔旁白〕硫氣孔旁的活土結了一圈鏽色的殼。這裡沒有暖湧可以怪。'] },
    // S0-4 別踩那一塊
    { type: 'npc', id: 'li', actor: 'npc.li', x: 27, y: 10, dir: 'left', fixedDir: true,
      cond: ['quest:quest.side.p0_soft_ground=active', '!flag.prologue.li_rescued'], dialogue: 'dlg.p0.s0_4_li' },
    { type: 'trigger', id: 'crack_edge', x: 23, y: 9, w: 1, h: 5, cond: ['quest:quest.side.p0_soft_ground=active', '!flag.prologue.li_rescued'], dialogue: 'dlg.p0.s0_4_edge' },
    { type: 'object', id: 'g_crack', kind: 'gather', x: 27, y: 11, name: '礦泉結晶', cond: 'flag.prologue.li_rescued', respawn: false,
      items: { 'item.sample.spring_crystal': 3 }, text: ['〔旁白〕乾裂區中央的結晶，比階梯泉的大。'] }
  ].concat(crackTriggers('map.miststep.soilflat', 23, 5, 33, 15, [22, 11, 'left'], [[27, 10], [27, 11]]));

  // ======================= 脈橋 =======================
  var br = D.maps['map.miststep.bridge'];
  br.name = '脈橋'; br.subtitle = '初泉環・霧階';
  br.zone = 'miststep'; br.tone = 'dusk'; br.ambience = 'village';
  br.particles = { spores: 18, mist: 5 };
  br.onEnter = [{ cond: '!flag.prologue.bridge_seen', actions: [['flag', 'flag.prologue.bridge_seen'], ['dialogue', 'dlg.p0.m0_12_enter']] }];
  br.entities = [
    { type: 'warp', id: 'west', x: 0, y: 10, to: 'map.miststep.soilflat', tx: 42, ty: 22, dir: 'left' },
    { type: 'object', id: 'east', kind: 'hidden', x: 47, y: 10, name: '對岸', text: ['〔旁白〕對岸的霧今天不讓人過。'] },
    { type: 'trigger', id: 'center', x: 24, y: 10, cond: '!folio.f161.c3', dialogue: 'dlg.p0.m0_12_center' },
    { type: 'object', id: 'obs_center', kind: 'observe', x: 24, y: 10, name: '橋心', dialogue: 'dlg.p0.m0_12_center' },
    { type: 'object', id: 'boards', kind: 'membrane', x: 24, y: 8, name: '橋心的舊維修口', dialogue: 'dlg.p0.m0_12_boards' },
    { type: 'object', id: 'hatch', kind: 'hatch', x: 36, y: 12, name: '側腹維修口', dialogue: 'dlg.p0.m0_12_hatch', mark: '!flag.prologue.entered_conduit' },
    { type: 'object', id: 'g_sap', kind: 'gather', x: 44, y: 6, name: '鐘管草汁', items: { 'item.sample.bellpipe_sap': 2 }, flags: ['folio.f004.c2'], text: ['〔旁白〕鐘管草的根管滴口，接下乳白的汁液。'] },
    { type: 'object', id: 'g_water', kind: 'gather', x: 3, y: 13, name: '淨池水', once: false, respawn: false, text: ['〔旁白〕水道邊的淨水。'], actions: [['give', 'item.sample.clean_water', 3]] },
    { type: 'object', id: 'chest', kind: 'chest', x: 44, y: 14, name: '寶匣', items: { 'item.use.spring_cake': 2, 'item.med.suran_trace': 1 } }
  ];
})(window.VELLORA);
