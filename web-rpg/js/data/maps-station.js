/*
 * 序章〈味變〉：霧階池站、站內棚屋的名稱與實體（地形在 maps-tiles.js）。
 * 進度階段：P1＝未設 drawmites_dying；P2＝已設、未設 puma_confessed；P3＝已設 puma_confessed。
 * 居民的對白都寫在 story-residents.js 的「dlg.p0.npc.*」，那裡依任務與 P1／P2／P3 分支。
 */
(function (V) {
  'use strict';
  var D = V.data;
  var P1 = '!flag.prologue.drawmites_dying';
  var P3 = 'flag.prologue.puma_confessed';
  var NOT_P3 = '!flag.prologue.puma_confessed';

  // ======================= 霧階池站 =======================
  var st = D.maps['map.miststep.station'];
  st.name = '霧階池站'; st.subtitle = '初泉環・霧階';
  st.zone = 'miststep'; st.tone = 'dawn'; st.ambience = 'village';
  st.particles = { spores: 22, mist: 4 };
  st.onEnter = [
    { cond: ['flag.prologue.tasted_spring_source', '!flag.prologue.m0_10_started'], cutscene: 'cs.p0.m0_10' }
  ];
  st.entities = [
    // ---- 出入口 ----
    { type: 'warp', id: 'north', x: 19, y: 0, to: 'map.miststep.terrace', tx: 19, ty: 30, dir: 'up', cond: NOT_P3,
      requires: 'flag.prologue.terrace_open', lockedText: ['〔旁白〕梭的貨架半擋著北口。', '蒲嬤還沒點頭。'] },
    { type: 'trigger', id: 'depart', x: 19, y: 0, once: false, cond: P3, dialogue: 'dlg.p0.m0_18_depart' },
    { type: 'warp', id: 'east', x: 39, y: 12, to: 'map.miststep.soilflat', tx: 1, ty: 8, dir: 'right' },
    { type: 'warp', id: 'door_pool', x: 5, y: 4, to: 'map.miststep.sheds', tx: 14, ty: 9, dir: 'up', sfx: 'door',
      requires: ['flag.prologue.reported_to_puma', { any: ['!flag.prologue.puma_forbade_bridge', 'flag.prologue.got_auri_leaf'] }],
      lockedText: ['〔若 !flag.prologue.reported_to_puma〕〔旁白〕池守棚的門關著。蒲嬤在池西岸。',
        '〔若 flag.prologue.puma_forbade_bridge〕〔旁白〕門從裡面扣上了。膜牆後面有一盞燈，和一個坐著不動的影子。'] },
    { type: 'warp', id: 'door_record', x: 5, y: 22, to: 'map.miststep.sheds', tx: 4, ty: 9, dir: 'up', sfx: 'door' },
    { type: 'warp', id: 'door_soup', x: 30, y: 22, to: 'map.miststep.sheds', tx: 24, ty: 9, dir: 'up', sfx: 'door' },

    // ---- 初階池取樣點 a（M0-02）----
    { type: 'encounter', id: 'pool', encounter: 'enc.p0.tutorial_first_pool', x: 20, y: 18, size: 14,
      dialogue: 'dlg.p0.m0_02', mark: '!flag.prologue.tasted_first_pool',
      onResult: { read: [['cutscene', 'cs.p0.m0_02_after']] } },

    // ---- 蒲嬤 ----
    { type: 'npc', id: 'puma', actor: 'npc.pu_ma', x: 7, y: 12, dir: 'right', cond: '!flag.prologue.reported_to_puma',
      dialogue: 'dlg.p0.npc.pu_ma_shore', mark: 'flag.prologue.tasted_first_pool' },
    { type: 'npc', id: 'puma_crowd', actor: 'npc.pu_ma', x: 7, y: 13, dir: 'right',
      cond: ['flag.prologue.tasted_spring_source', '!flag.prologue.puma_forbade_bridge'],
      lines: ['蒲嬤：暖湧的時候水熱，蟲受不了，會浮一些。每回都這樣。'] },

    // ---- 水位尺 W、汐伯 A ----
    { type: 'object', id: 'gauge', kind: 'gauge', x: 8, y: 14, name: '初階池水位尺', dialogue: 'dlg.p0.gauge',
      mark: ['quest:quest.main.p0_taste_shift@s2', 'flag.prologue.talked_xibo', '!flag.prologue.round_gauge'] },
    { type: 'npc', id: 'xibo', actor: 'npc.xi_bo', x: 7, y: 15, dir: 'right', fixedDir: true, dialogue: 'dlg.p0.npc.xi_bo',
      mark: { any: [['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.talked_xibo'],
        ['quest:quest.side.p0_tide_marks=active', 'flag.prologue.tide_read_terrace', 'flag.prologue.tide_read_soilflat']] } },

    // ---- 水位尺導管口的汲蟲淤塞 d（P2，M0-10）----
    { type: 'encounter', id: 'clot', encounter: 'enc.p0.drawmite_clot', x: 9, y: 16, size: 16, cond: 'flag.prologue.drawmites_dying',
      onResult: { stabilized: [['dialogue', 'dlg.p0.m0_10_after']], isolated: [['dialogue', 'dlg.p0.m0_10_after']] } },

    // ---- 老聆 L ----
    { type: 'npc', id: 'laoling', actor: 'npc.lao_ling', x: 8, y: 9, dir: 'down', fixedDir: true, cond: '!flag.prologue.tasted_spring_source',
      dialogue: 'dlg.p0.npc.lao_ling', mark: ['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.m0_04_seen'] },
    { type: 'npc', id: 'laoling2', actor: 'npc.lao_ling', x: 6, y: 16, dir: 'down', fixedDir: true, cond: 'flag.prologue.tasted_spring_source',
      dialogue: 'dlg.p0.npc.lao_ling' },
    { type: 'trigger', id: 'm0_04', x: 9, y: 9, w: 7, h: 2, cond: ['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.m0_04_seen'], dialogue: 'dlg.p0.m0_04' },
    { type: 'object', id: 'obs_bellpipe', kind: 'observe', x: 12, y: 9, name: '站內鐘管草', dialogue: 'dlg.p0.obs_bellpipe',
      flags: ['flag.prologue.observed_station_bellpipe', 'folio.f004.c1'] },

    // ---- 絮 D（P1，池守棚外）／M0-10 人群 ----
    { type: 'npc', id: 'xu', actor: 'npc.xu', x: 8, y: 4, dir: 'down', cond: '!flag.prologue.tasted_spring_source', dialogue: 'dlg.p0.npc.xu' },
    { type: 'npc', id: 'xu_crowd', actor: 'npc.xu', x: 6, y: 14, dir: 'right', cond: ['flag.prologue.tasted_spring_source', '!flag.prologue.puma_forbade_bridge'],
      lines: ['絮：……'] },
    { type: 'npc', id: 'yaya_crowd', actor: 'npc.yaya', x: 5, y: 13, dir: 'right', cond: ['flag.prologue.tasted_spring_source', '!flag.prologue.puma_forbade_bridge'],
      lines: ['芽芽：池子上面有小星星。不亮的小星星。'] },

    // ---- 孢子濾幕 F、紗 N、病孢團 b ----
    { type: 'object', id: 'filter_w', kind: 'filter', x: 27, y: 2, name: '孢子濾幕', dialogue: 'dlg.p0.filter',
      mark: ['quest:quest.main.p0_taste_shift@s2', 'flag.prologue.talked_sha', '!flag.prologue.round_filter'] },
    { type: 'object', id: 'filter_c', kind: 'filter', x: 30, y: 2, name: '孢子濾幕（中幅）', dialogue: 'dlg.p0.filter', cond: '!flag.prologue.filter_cut' },
    { type: 'object', id: 'filter_c2', kind: 'filterpatch', x: 30, y: 2, name: '孢子濾幕（中幅）', cond: 'flag.prologue.filter_cut',
      text: ['〔旁白〕濾幕中幅開過一個兩掌寬的方口，補上的膜還沒長合。'] },
    { type: 'object', id: 'filter_e', kind: 'filter', x: 33, y: 2, name: '孢子濾幕', dialogue: 'dlg.p0.filter' },
    { type: 'encounter', id: 'spore', encounter: 'enc.p0.sick_spore_clump', x: 30, y: 3, size: 14,
      cond: ['quest:quest.side.p0_filter_spots=active'], dialogue: 'dlg.p0.s0_2_spots',
      onResult: { stabilized: [['dialogue', 'dlg.p0.s0_2_repaired']], isolated: [['dialogue', 'dlg.p0.s0_2_cut']], collapsed: [['dialogue', 'dlg.p0.s0_2_collapse']] } },
    { type: 'npc', id: 'sha', actor: 'npc.sha', x: 28, y: 4, dir: 'down', dialogue: 'dlg.p0.npc.sha',
      mark: ['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.talked_sha'] },

    // ---- 嫁接棚、楔姨 E、五嘴 c ----
    { type: 'npc', id: 'xieyi', actor: 'npc.xie_yi', x: 24, y: 10, dir: 'down', dialogue: 'dlg.p0.npc.xie_yi',
      mark: ['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.suture_stabilized'] },
    { type: 'encounter', id: 'wuzui', encounter: 'enc.p0.quarrel_sutureleaf', x: 26, y: 9, size: 18, dialogue: 'dlg.p0.npc.xie_yi',
      onResult: { stabilized: [['dialogue', 'dlg.p0.m0_06_after']] } },
    { type: 'object', id: 'g_thorn', kind: 'gather', x: 29, y: 8, name: '縫葉刺緣葉', cond: 'flag.prologue.suture_stabilized',
      text: ['〔旁白〕嫁接棚旁的縫葉，刺緣那一圈。'], items: { 'item.sample.suture_thornleaf': 1 } },

    // ---- 味診台 M ----
    { type: 'object', id: 'altar', kind: 'altar', x: 26, y: 14, name: '味診台', dialogue: 'dlg.p0.altar',
      mark: ['item:item.sample.suture_thornleaf', '!flag.prologue.dosage_done'],
      actions: [['if', ['flag.prologue.brewed_emberash', 'flag.prologue.brewed_suran', 'flag.prologue.brewed_indolk', 'flag.prologue.brewed_pool_sugar', '!flag.prologue.first_compound_done'],
        [['dialogue', 'dlg.p0.m0_07_four']]]] },

    // ---- 種源龕 S、樅爺 C ----
    { type: 'object', id: 'shrine', kind: 'shrine', x: 17, y: 25, name: '種源龕', dialogue: 'dlg.p0.shrine',
      mark: ['quest:quest.main.p0_taste_shift@s2', 'flag.prologue.talked_congye', '!flag.prologue.round_shrine'] },
    { type: 'npc', id: 'congye', actor: 'npc.cong_ye', x: 19, y: 25, dir: 'left', dialogue: 'dlg.p0.npc.cong_ye',
      mark: { any: [['quest:quest.main.p0_taste_shift@s2', '!flag.prologue.talked_congye'],
        ['quest:quest.side.p0_shrine_slot=active', 'item:item.med.pool_sugar']] } },

    // ---- 梭 U（北口旁擺攤）----
    { type: 'npc', id: 'suo', actor: 'npc.suo', x: 21, y: 2, dir: 'down', dialogue: 'dlg.p0.npc.suo',
      mark: { any: ['quest:quest.side.p0_barter_gloves@s1', ['quest:quest.side.p0_barter_gloves@s3', 'item:item.quest.sealed_soup']] } },
    { type: 'object', id: 'board', kind: 'sign', x: 15, y: 2, name: '站口告示板', text: ['〔旁白〕站口告示板：潮汐曆摘抄與配給公告。'] },

    // ---- 孩童 Y、R ----
    { type: 'npc', id: 'yaya', actor: 'npc.yaya', x: 21, y: 26, dir: 'down', cond: [NOT_P3, { any: ['!flag.prologue.tasted_spring_source', 'flag.prologue.puma_forbade_bridge'] }],
      move: { type: 'wander', radius: 1 }, dialogue: 'dlg.p0.npc.yaya' },
    { type: 'npc', id: 'li', actor: 'npc.li', x: 23, y: 26, dir: 'down',
      cond: [NOT_P3, { any: ['!quest:quest.side.p0_soft_ground', 'flag.prologue.li_rescued'] }], dialogue: 'dlg.p0.npc.li' },

    // ---- 絡 K ----
    { type: 'npc', id: 'luo', actor: 'npc.luo', x: 35, y: 26, dir: 'left', fixedDir: true, dialogue: 'dlg.p0.npc.luo',
      mark: ['quest:quest.side.p0_barter_gloves@s4', 'item:item.quest.membrane_patch'] },

    // ---- 採集點 g ----
    { type: 'object', id: 'g_water', kind: 'gather', x: 10, y: 21, name: '淨水槽', once: false, respawn: false,
      text: ['〔旁白〕淨水槽。濾過、靜置過的池水。'], actions: [['give', 'item.sample.clean_water', 3]] },
    { type: 'object', id: 'g_crystal', kind: 'gather', x: 3, y: 27, name: '礦泉結晶', items: { 'item.sample.spring_crystal': 2 },
      text: ['〔旁白〕池階邊緣的細小晶簇。'] },
    { type: 'object', id: 'g_sap', kind: 'gather', x: 21, y: 28, name: '鐘管草汁', items: { 'item.sample.bellpipe_sap': 2 }, flags: ['folio.f004.c2'],
      text: ['〔旁白〕鐘管草的根管滴口，接下乳白的汁液。'] }
  ];

  // ======================= 站內棚屋 =======================
  var sh = D.maps['map.miststep.sheds'];
  sh.name = '站內棚屋'; sh.subtitle = '記脈棚・池守棚・湯棚';
  sh.zone = 'miststep'; sh.tone = 'indoor'; sh.ambience = 'indoor';
  sh.entities = [
    { type: 'warp', id: 'out_record', x: 4, y: 10, to: 'map.miststep.station', tx: 5, ty: 23, dir: 'down', sfx: 'door' },
    { type: 'warp', id: 'out_pool', x: 14, y: 10, to: 'map.miststep.station', tx: 5, ty: 5, dir: 'down', sfx: 'door' },
    { type: 'warp', id: 'out_soup', x: 24, y: 10, to: 'map.miststep.station', tx: 30, ty: 23, dir: 'down', sfx: 'door' },

    // ---- 記脈棚（珂潾的住處）----
    { type: 'object', id: 'bed', kind: 'bed', x: 1, y: 1, name: '珂潾的床' },
    { type: 'object', id: 'pack', kind: 'chest', x: 6, y: 1, name: '行囊匣',
      items: { 'item.use.palate_rinse': 1, 'item.use.spring_cake': 2, 'item.currency.sugar_tally': 6 } },
    { type: 'object', id: 'old_map', kind: 'hidden', x: 3, y: 0, name: '牆上的舊圖', solid: true, dialogue: 'dlg.p0.old_drawing' },

    // ---- 池守棚 ----
    { type: 'npc', id: 'puma', actor: 'npc.pu_ma', x: 13, y: 4, dir: 'down',
      cond: { any: [['flag.prologue.reported_to_puma', '!flag.prologue.tasted_spring_source'], 'flag.prologue.puma_forbade_bridge'] },
      dialogue: 'dlg.p0.npc.pu_ma',
      mark: { any: [['quest:quest.main.p0_taste_shift@s2', 'flag.prologue.observed_station_bellpipe', 'flag.prologue.round_gauge', 'flag.prologue.round_filter',
        'flag.prologue.round_shrine', 'flag.prologue.suture_stabilized', 'flag.prologue.first_compound_done'], ['flag.prologue.got_auri_leaf', NOT_P3]] } },
    { type: 'npc', id: 'xu', actor: 'npc.xu', x: 17, y: 6, dir: 'left', cond: { any: [P3, ['flag.prologue.got_auri_leaf']] }, dialogue: 'dlg.p0.npc.xu' },
    { type: 'trigger', id: 'm0_17', x: 10, y: 8, w: 9, h: 1, cond: ['flag.prologue.got_auri_leaf', NOT_P3], dialogue: 'dlg.p0.m0_17' },
    { type: 'object', id: 'tide_cal', kind: 'hidden', x: 13, y: 0, solid: true, name: '潮汐曆',
      text: ['〔旁白〕牆上的潮汐曆。三個月亮各拉各的，一道一道用靛泥記著。'] },
    { type: 'object', id: 'med_box', kind: 'chest', x: 17, y: 2, name: '蒲嬤的舊藥匣', useCond: P3,
      lockedText: ['〔旁白〕蒲嬤的舊藥匣，扣著。'], items: { 'item.med.emberash': 2, 'item.key.puma_knot': 1 } },

    // ---- 湯棚 ----
    { type: 'npc', id: 'chun', actor: 'npc.chun_shen', x: 27, y: 2, dir: 'down', fixedDir: true, dialogue: 'dlg.p0.npc.chun_shen',
      mark: ['quest:quest.side.p0_barter_gloves@s2'] },
    { type: 'npc', id: 'yaya', actor: 'npc.yaya', x: 23, y: 7, dir: 'up', cond: P3, dialogue: 'dlg.p0.npc.yaya' },
    { type: 'npc', id: 'li', actor: 'npc.li', x: 25, y: 7, dir: 'up', cond: P3, dialogue: 'dlg.p0.npc.li' }
  ];
  void P1;
})(window.VELLORA);
