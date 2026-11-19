/*
 * 序章〈味變〉：橋腹導管洞上層、下層（舊接口）的名稱、實體與水位 patches（地形在 maps-tiles.js）。
 * 下層活瓣謎題（M0-14）：西池深＝!valve_jia_open 或 valve_yi_open；東池深＝valve_jia_open 且 !valve_yi_open 且 !east_pedal。
 * 按活瓣後以 warp 回同一張地圖重新載入，水位圖塊即更新。
 */
(function (V) {
  'use strict';
  var D = V.data;
  var LOWER = 'map.miststep.conduit_lower', UPPER = 'map.miststep.conduit_upper';

  // ======================= 上層 =======================
  var up = D.maps[UPPER];
  up.name = '橋腹導管洞・上層'; up.subtitle = '初泉環・霧階';
  up.zone = 'miststep'; up.tone = 'cave'; up.ambience = 'cave';
  up.patches = [
    { cond: '!flag.prologue.valve_upper_open', x: 14, y: 18, ground: ['WWWWWWW', 'WWWWWWW', 'WWW WWW', 'WWWWWWW', 'WWWWWWW'] }
  ];
  up.onEnter = [{ cond: '!flag.prologue.upper_seen', actions: [['flag', 'flag.prologue.upper_seen'], ['dialogue', 'dlg.p0.m0_13_enter']] }];
  up.entities = [
    { type: 'warp', id: 'out', x: 1, y: 2, to: 'map.miststep.bridge', tx: 36, ty: 11, dir: 'up' },
    { type: 'encounter', id: 'sponge', encounter: 'enc.p0.collapsed_sponge', x: 8, y: 2, size: 20, hideOnDone: true,
      before: ['〔旁白〕廊道上方垂下來一大團灰藍色的東西，像一只洩了氣的皮囊，堵住了半條路。是橋的儲水共生體——橋腹靠它存水，旱的時候放，潮的時候收。',
        '〔旁白〕它排空了一半。孔洞一張一縮，縮的時候會抽一下。', '珂潾：橋的水囊。排空之後會先塌，塌了就很難再鼓回來。', '珂潾：還在抽。表示還沒塌完。'] },
    // 岔口甲
    { type: 'object', id: 'root_a_east', kind: 'hidden', x: 12, y: 1, solid: true, name: '東支管口的根管叢', dialogue: 'dlg.p0.fork_a_east' },
    { type: 'object', id: 'root_a_south', kind: 'hidden', x: 9, y: 3, solid: true, name: '南支管口的根管叢', dialogue: 'dlg.p0.fork_a_south' },
    { type: 'trigger', id: 'east_end', x: 25, y: 2, lines: ['〔旁白〕東支管走到底是一面長合的舊壁。管壁裡亮點還有六七個，水在走。不是這邊。'] },
    { type: 'encounter', id: 'clot3', encounter: 'enc.p0.drawmite_clot', x: 27, y: 2, size: 16, hideOnDone: true,
      before: ['〔旁白〕壁角的一個小支口被一團死汲蟲糊住了，後面壓著一只舊寶匣。'],
      override: { name: '汲蟲淤塞（三符型）', sequence: '腥焦腥', rewards: { exp: 18, items: { 'item.sample.drawmite_husk': 1 }, dims: {}, conn: { miststep: 1 } },
        isolate: { exp: 6, conn: { miststep: -2 }, dims: { fen: 1 }, text: '珂潾夾住小支口，收口。' },
        intro: '小支口上糊著一團灰白的死汲蟲。水從牠們中間擠過來，帶著一股死水的腥。',
        stableText: '小支口通了。後面那只舊寶匣露出來，匣角被水泡得發白。' } },
    { type: 'object', id: 'chest_east', kind: 'chest', x: 29, y: 2, name: '舊寶匣', items: { 'item.sample.spring_crystal': 2, 'item.med.pool_sugar': 1 } },
    // 岔口乙
    { type: 'object', id: 'root_b_west', kind: 'hidden', x: 6, y: 7, solid: true, name: '西支根管叢', dialogue: 'dlg.p0.fork_b_west' },
    { type: 'object', id: 'root_b_mid', kind: 'hidden', x: 17, y: 7, solid: true, name: '中支根管叢', dialogue: 'dlg.p0.fork_b_mid' },
    { type: 'object', id: 'root_b_east', kind: 'hidden', x: 29, y: 7, solid: true, name: '東支根管叢', dialogue: 'dlg.p0.fork_b_east' },
    { type: 'object', id: 'g_sap', kind: 'gather', x: 7, y: 9, name: '鐘管草汁（根管滴液）', items: { 'item.sample.bellpipe_sap': 2 }, flags: ['folio.f004.c2'], text: ['〔旁白〕洞頂根管的滴液。'] },
    { type: 'trigger', id: 'west_room', x: 3, y: 10, lines: ['〔旁白〕一間長著發光花的小室。管壁裡亮點五六個，水還在走。不是這邊——不過牆縫裡有東西可以採。'] },
    { type: 'object', id: 'g_sac', kind: 'gather', x: 4, y: 14, name: '池糖囊', items: { 'item.sample.sugar_sac': 2 }, text: ['〔旁白〕牆縫裡長著一叢池糖囊。'] },
    { type: 'object', id: 'chest_west', kind: 'chest', x: 6, y: 12, name: '寶匣', items: { 'item.use.palate_rinse': 1, 'item.med.emberash': 1 } },
    // 中支：死潮、上層活瓣、淹水階梯
    { type: 'encounter', id: 'dead_tide', encounter: 'enc.p0.mid_dead_tide', x: 17, y: 12, size: 24, hideOnDone: true,
      before: ['〔旁白〕中支管走到這裡，管壁裡一個亮點都沒有了。',
        '〔旁白〕前面的管腔被一整團東西塞滿：灰白的、黏的，夾著礦渣——不是幾百隻，是幾萬隻死汲蟲，一層壓一層，壓成了一道牆。水從牆縫裡一滴一滴擠出來。洞頂垂下來的根管，就是對著這道牆在喘。',
        '珂潾：栓塞點。', '珂潾：站裡管口那一團，是從這裡漂過去的。', '珂潾：亮點：零。', '珂潾：……不對。這裡是牠們「堆」的地方。死的地方還在更裡面。'] },
    { type: 'object', id: 'valve', kind: 'valve', x: 16, y: 15, name: '上層活瓣', solid: true, dialogue: 'dlg.p0.valve_upper',
      mark: ['flag.prologue.embolus_cleared', '!flag.prologue.valve_upper_open'] },
    { type: 'warp', id: 'stairs', x: 17, y: 20, to: LOWER, tx: 2, ty: 4, dir: 'right' },
    // 東支空管
    { type: 'object', id: 'membrane', kind: 'membrane', x: 29, y: 9, name: '東支空管的痂膜', cond: '!flag.prologue.k_cut', dialogue: 'dlg.p0.membrane',
      mark: 'flag.prologue.embolus_isolated' },
    { type: 'warp', id: 'slope', x: 29, y: 25, to: LOWER, tx: 2, ty: 2, dir: 'right' }
  ];

  // ======================= 下層（舊接口）=======================
  var lo = D.maps[LOWER];
  lo.name = '橋腹導管洞・下層'; lo.subtitle = '舊接口';
  lo.zone = 'miststep'; lo.tone = 'cave'; lo.ambience = 'cave';
  lo.particles = { spores: 6, mist: 3 };
  lo.patches = [
    { cond: { any: ['!flag.prologue.valve_jia_open', 'flag.prologue.valve_yi_open'] }, x: 6, y: 3, ground: ['WWWWWWW', 'WWWWWWW', 'WWWWWWW', 'WWWWWWW', 'WWWWWWW', 'WWWWWWW'] },
    { cond: ['flag.prologue.valve_jia_open', '!flag.prologue.valve_yi_open', '!flag.prologue.east_pedal'], x: 22, y: 3, ground: ['WWWWWWW', 'WWWWWWW', 'WWWWWWW', 'WWWWWWW', 'WWWWWWW'] }
  ];
  lo.onEnter = [{ cond: '!flag.prologue.lower_seen', actions: [['flag', 'flag.prologue.lower_seen'], ['dialogue', 'dlg.p0.m0_14_enter']] }];
  lo.entities = [
    { type: 'warp', id: 'up_stairs', x: 1, y: 4, to: UPPER, tx: 17, ty: 19, dir: 'up',
      requires: 'flag.prologue.valve_upper_open', lockedText: ['〔旁白〕上去的階梯還淹在水裡。'] },
    { type: 'warp', id: 'up_slope', x: 1, y: 2, to: UPPER, tx: 29, ty: 24, dir: 'up' },
    { type: 'object', id: 'valve_jia', kind: 'valve', x: 3, y: 1, solid: true, name: '活瓣甲', dialogue: 'dlg.p0.valve_jia' },
    { type: 'object', id: 'chest_alcove', kind: 'chest', x: 8, y: 1, name: '舊藥匣',
      text: ['〔旁白〕凹室裡有一只舊藥匣，匣蓋上的礦塵被人擦過一道。'], items: { 'item.med.suran_trace': 2, 'item.use.palate_rinse': 2 } },
    // 中島
    { type: 'object', id: 'g_crystal', kind: 'gather', x: 15, y: 2, name: '礦泉結晶', items: { 'item.sample.spring_crystal': 2 }, text: ['〔旁白〕中島邊緣的晶簇。'] },
    { type: 'object', id: 'shrine', kind: 'shrine', x: 18, y: 2, name: '舊種源龕', dialogue: 'dlg.p0.old_shrine' },
    { type: 'object', id: 'gauge', kind: 'gauge', x: 14, y: 4, name: '舊水位尺', dialogue: 'dlg.p0.old_gauge' },
    { type: 'object', id: 'altar', kind: 'altar', x: 18, y: 5, name: '舊味診盤', dialogue: 'dlg.p0.old_altar' },
    { type: 'object', id: 'g_sap', kind: 'gather', x: 14, y: 7, name: '鐘管草汁・滴水處', items: { 'item.sample.bellpipe_sap': 2, 'item.sample.clean_water': 3 }, flags: ['folio.f004.c2'],
      text: ['〔旁白〕根管的滴液，旁邊的洞頂有一處細滴，接得到淨水。'] },
    { type: 'object', id: 'valve_yi', kind: 'valve', x: 17, y: 7, solid: true, name: '活瓣乙', dialogue: 'dlg.p0.valve_yi' },
    { type: 'object', id: 'g_thorn', kind: 'gather', x: 20, y: 7, name: '野生三葉縫葉', items: { 'item.sample.suture_thornleaf': 1 }, text: ['〔旁白〕一株野生的三葉縫葉，刺緣那一圈。'] },
    // 東通道
    { type: 'trigger', id: 'pedal', x: 29, y: 4, cond: '!flag.prologue.east_pedal', actions: [['flag', 'flag.prologue.east_pedal'], ['sfx', 'splash'], ['toast', '腳下的單向小瓣開了：東池放淺。']] },
    { type: 'encounter', id: 'scab', encounter: 'enc.p0.sulfur_scab', x: 31, y: 4, size: 18, hideOnDone: true,
      before: ['〔旁白〕東通道的壁上有一道結了一半的痂。痂口是黃白色的，邊緣發黑，每隔一陣就鼓一下，漏出一口熱的、臭蛋味的氣。通道被這口氣薰得走不過去。',
        '珂潾：硫。這次不淡。', '〔旁白〕珂潾把掌套完全封上，退後一步，用取樣管隔著一臂的距離接了一點凝在壁上的水珠。',
        '珂潾：痂是管子自己結的——不對。這個位置，這個形狀。', '珂潾：是被夾過的。有人在這裡下過夾子，痂是順著夾痕長的。'] },
    { type: 'trigger', id: 'trim', x: 33, y: 4, cond: '!flag.prologue.found_trim_marks', dialogue: 'dlg.p0.m0_14_trim' },
    { type: 'object', id: 'obs_trim', kind: 'observe', x: 33, y: 4, name: '修剪痕', dialogue: 'dlg.p0.m0_14_trim' },
    // 舊接口前廳
    { type: 'trigger', id: 'boss_in', x: 34, y: 12, cond: ['flag.prologue.slowarch_recognized', '!flag.prologue.boss_done'], cutscene: 'cs.p0.m0_15' },
    { type: 'encounter', id: 'boss', encounter: 'enc.p0.boss_slowarch', x: 18, y: 17, size: 28, dir: 'left',
      onResult: { stabilized: [['flag', 'flag.prologue.boss_done']], isolated: [['flag', 'flag.prologue.boss_done']] } },
    { type: 'object', id: 'g_sac2', kind: 'gather', x: 28, y: 13, name: '池糖囊（牆縫）', items: { 'item.sample.sugar_sac': 1 }, text: ['〔旁白〕牆縫裡還活著的一叢池糖囊。'] },
    { type: 'object', id: 'g_crystal2', kind: 'gather', x: 16, y: 21, name: '礦泉結晶', items: { 'item.sample.spring_crystal': 2 }, text: ['〔旁白〕前廳地上的晶簇。'] },
    { type: 'trigger', id: 'wall', x: 9, y: 16, cond: 'flag.prologue.boss_done',
      lines: ['〔旁白〕牠頂了三個月的那面牆。骨白色的硬化斷面上，被肩胛磨出了一個凹；凹的底下裂了一道縫，夠一個人側身過去。'] },
    { type: 'object', id: 'seal', kind: 'membrane', x: 8, y: 16, name: '封死管段', cond: '!flag.prologue.boss_done', text: ['〔旁白〕骨白色的硬化斷面，把舊接口整個封在後面。'] },
    { type: 'trigger', id: 'niche', x: 3, y: 16, cond: 'flag.prologue.boss_done', cutscene: 'cs.p0.m0_16' }
  ];
})(window.VELLORA);
