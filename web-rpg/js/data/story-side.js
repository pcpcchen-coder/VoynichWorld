/*
 * 序章〈味變〉支線 S0-1～S0-5（§8）。委託人的分支入口在 story-residents.js 的 dlg.p0.npc.*。
 */
(function (V) {
  'use strict';
  var D = V.data, G = D.dialogues;
  var TIDE = 'quest.side.p0_tide_marks', FILTER = 'quest.side.p0_filter_spots', SHRINE = 'quest.side.p0_shrine_slot',
    SOFT = 'quest.side.p0_soft_ground', BARTER = 'quest.side.p0_barter_gloves';

  // ======================= 任務定義 =======================
  D.quests[TIDE] = { name: '潮汐曆不等人', type: 'side', desc: '汐伯要在今天珂月落下前抄齊三把水位尺的讀數，他走不開。',
    stages: [{ id: 's1', text: '讀階梯泉二階水位尺、活土原邊尺，回報汐伯。' }],
    rewards: { exp: 20, items: { 'item.currency.sugar_tally': 3, 'item.key.tide_slip': 1 }, flags: { 'flag.prologue.side_tide_done': true } } };
  D.quests[FILTER] = { name: '濾幕上的灰點', type: 'side', desc: '中間那幅濾幕上有幾塊刷不掉的灰點，是黏住不走的病孢團。',
    stages: [{ id: 's1', text: '查看濾幕中幅的灰點：治它，或割掉這一塊膜。' }] };
  D.quests[SHRINE] = { name: '龕裡少一格', type: 'side', desc: '種源龕第七格的一只種莢乾縮了，樅爺手抖，滴不準。',
    stages: [{ id: 's1', text: '帶一份池糖液給樅爺，替第七格的種莢回潤。' }],
    rewards: { exp: 15, items: { 'item.currency.sugar_tally': 2 }, flags: { 'flag.prologue.shrine_slot_filled': true } } };
  D.quests[SOFT] = { name: '別踩那一塊', type: 'side', desc: '礫去活土原撿礦泉結晶，走進了今年才出現的乾裂區，站在一塊硬殼上不敢動。',
    stages: [{ id: 's1', text: '到活土原乾裂區，依還長著草的落腳點走到礫身邊，帶他回來。' }],
    rewards: { exp: 15, items: { 'item.sample.spring_crystal': 3 }, flags: { 'flag.prologue.li_rescued': true } } };
  D.quests[BARTER] = { name: '三支籤換不到的東西', type: 'side', desc: '絡看出珂潾的左掌套有針孔——味會漏。補它要一片半透膜，膜在梭手上，梭不收池糖籤。',
    stages: [
      { id: 's1', text: '問北口的梭要半透膜片。' },
      { id: 's2', text: '到湯棚請蓴嬸封一罐池況湯（需要池糖囊 ×1）。' },
      { id: 's3', text: '把封罐的池況湯交給梭。' },
      { id: 's4', text: '把半透膜片交給絡。' }
    ],
    rewards: { exp: 20, items: { 'item.key.sealed_gloves': 1 }, flags: { 'flag.prologue.got_sealed_gloves': true } } };

  // ======================= S0-1 潮汐曆不等人 =======================
  G['dlg.p0.s0_1_offer'] = {
    start: 'a',
    nodes: { a: {
      text: ['汐伯：潮汐曆每旬要對三把尺：站裡這把、階梯泉二階那把、活土原邊上那把。', '汐伯：三把都要在珂月落下以前讀。我一走開，這把就沒人盯。', '汐伯：妳不是愛記嗎。替我記兩個數。'],
      choices: [
        { text: '「好。平常應該是多少？」', lines: ['汐伯：二階比站裡高兩刻，原邊比站裡低一刻。幾十年都這樣。水往低處走，高低差就是水在走的證據。', '汐伯：所以我其實知道答案。九刻、七刻、六刻。妳去讀，只是讓曆上有人簽名。'],
          actions: [['quest', TIDE, 's1']], next: null },
        { text: '「現在沒空。」', lines: ['汐伯：潮不等人。妳有空的時候，潮不一定有空。'], next: null }
      ] } }
  };
  G['dlg.p0.gauge_terrace'] = {
    start: 'hub',
    nodes: {
      hub: { branch: [{ cond: ['quest:' + TIDE + '=active', '!flag.prologue.tide_read_terrace'], next: 'read' }], next: 'look' },
      look: { text: ['〔旁白〕二階水位尺。靛泥描的刻度很新。讀數：七刻二分。'], next: null },
      read: { text: ['〔旁白〕二階水位尺。靛泥描的刻度很新。讀數：七刻二分。', '珂潾：七刻二分。', '珂潾：汐伯說這裡該是九刻。'], actions: [['flag', 'flag.prologue.tide_read_terrace']], next: null }
    }
  };
  G['dlg.p0.gauge_soilflat'] = {
    start: 'hub',
    nodes: {
      hub: { branch: [{ cond: ['quest:' + TIDE + '=active', '!flag.prologue.tide_read_soilflat'], next: 'read' }], next: 'look' },
      look: { text: ['〔旁白〕活土原邊尺，半截埋在回彈的土裡。讀數：七刻。'], next: null },
      read: { text: ['〔旁白〕活土原邊尺，半截埋在回彈的土裡。讀數：七刻。', '珂潾：七刻。這裡該是六刻。',
        '〔若 flag.prologue.tide_read_terrace〕珂潾：七刻二分、七刻一分、七刻。三把尺幾乎一樣高。'], actions: [['flag', 'flag.prologue.tide_read_soilflat']], next: null }
    }
  };
  G['dlg.p0.s0_1_report'] = {
    lines: ['汐伯：念。', '珂潾：二階七刻二分。原邊七刻。', '汐伯：……再念一次。', '珂潾：二階七刻二分。站裡七刻一分。原邊七刻。',
      '〔旁白〕汐伯第一次把眼睛從尺上移開。', '汐伯：一樣高？', '汐伯：三把尺一樣高是靜潮才有的事。今天不是靜潮。稜月還滿著。',
      '珂潾：高低差是水在走的證據。沒有高低差——', '汐伯：——就是水沒在走。',
      '汐伯：這個我不寫「讀錯」。妳沒讀錯。我寫「三尺同」，旁邊畫一個圈。我這本曆上，上一個圈是我師傅畫的。',
      '〔若 flag.prologue.drawmites_dying〕汐伯：下午蟲就浮起來了。尺早上就說了，是我沒去讀。'],
    actions: [['quest', TIDE, 'done']]
  };

  // ======================= S0-2 濾幕上的灰點 =======================
  G['dlg.p0.s0_2_offer'] = {
    start: 'a',
    nodes: { a: {
      text: ['紗：中間那幅，妳自己看。灰的，一塊一塊，像發霉可是不是霉。我刷了兩天，越刷越大。', '紗：照規矩，刷不掉就割。割掉那一塊，換新膜，三天長合。', '紗：可是今天風從東北來，割了就是在站的鼻子上開一個洞。三天。'],
      choices: [
        { text: '「我先嚐嚐看是什麼。」', actions: [['quest', FILTER, 's1']], next: null },
        { text: '「晚點。」', next: null }
      ] } }
  };
  G['dlg.p0.s0_2_spots'] = {
    start: 'a',
    nodes: { a: {
      text: ['〔旁白〕濾幕中幅。三塊掌心大的灰斑，表面有一層細絨，風一吹就揚起一點粉。膜在灰斑底下變薄了。', '珂潾：病孢團。黏住了，還活著，還在往膜裡長。', '珂潾：兩個做法。治它，慢，要靠近，會吸到。割掉，快，幕上少一塊。'],
      choices: [
        { text: '治它（遭遇）', actions: [['engage', 'spore']], next: null },
        { text: '割掉這一塊', actions: [['dialogue', 'dlg.p0.s0_2_cut']], next: null },
        { text: '先不要', next: null }
      ] } }
  };
  G['dlg.p0.s0_2_repaired'] = {
    lines: ['紗：掉了。……妳做了什麼？', '珂潾：先苦後鹹。它一直在放「有東西咬我」的訊號，所以越刷越黏；先讓它不怕，再把它底下的礦味中和掉，它就鬆手了。',
      '紗：我刷了兩天。兩天。妳兩口水。',
      '〔若 flag:last_mistreats>=1〕珂潾：三口。有一口我嚐錯了。',
      '〔若 flag:last_mistreats=0〕珂潾：兩口水，兩份藥。妳刷的那兩天也算，它被妳刷薄了。',
      '紗：（把一條面巾塞過來）拿去。我織的，比站裡發的密。別跟人說是我給的，他們會來排隊。'],
    actions: [['flag', 'flag.prologue.filter_repaired'], ['exp', 15], ['give', 'item.use.mist_veil', 1], ['give', 'item.currency.sugar_tally', 2], ['give', 'item.sample.sick_spore', 1],
      ['dim', 'axis.sow', 1], ['conn', 'miststep', 1], ['quest', FILTER, 'done']]
  };
  var CUT_LINES = ['紗：（遞過幕刀）沿著灰的外面一指割。不要捨不得，留一點它就長回來。',
    '〔旁白〕珂潾沿灰斑外緣割了一個方口。三塊灰斑連著膜一起落進紗準備好的灰罐。幕上開了一個兩掌寬的洞，風直接灌進來。',
    '紗：好了。乾淨了。', '紗：……洞我今晚補。補上去的膜要三天才長合，這三天，粗的細的都會從這裡進來一點。',
    '〔旁白〕下風處的湯棚，棚口的布簾被風掀起來，一小股青灰色的霧鑽了進去。棚裡傳來蓴嬸的咳嗽聲。',
    '蓴嬸（棚內）：咳——誰把風放進來了！我的湯！', '珂潾：下風第一座是湯棚。', '紗：對。所以我才說，是在鼻子上開洞。'];
  G['dlg.p0.s0_2_cut'] = {
    lines: CUT_LINES,
    actions: [['flag', 'flag.prologue.filter_cut'], ['exp', 8], ['give', 'item.currency.sugar_tally', 2], ['dim', 'axis.burn', 1], ['conn', 'miststep', -1], ['quest', FILTER, 'done']]
  };
  G['dlg.p0.s0_2_collapse'] = {
    lines: ['紗：退後！——算了，割。這下要割一整幅。'].concat(CUT_LINES.slice(1)),
    actions: [['flag', 'flag.prologue.filter_cut'], ['flag', 'flag.prologue.filter_cut_whole'], ['exp', 8], ['give', 'item.currency.sugar_tally', 2], ['dim', 'axis.burn', 1], ['conn', 'miststep', -2], ['quest', FILTER, 'done']]
  };

  // ======================= S0-3 龕裡少一格 =======================
  G['dlg.p0.s0_3_offer'] = {
    start: 'a',
    nodes: { a: {
      text: ['樅爺：第七格。池糖囊的整套：囊體、葉托、還有它那一小團菌。蠟裂了一道，裡面乾了一半。', '樅爺：要滴糖液回潤。一滴，兩滴，不能三滴。我這手——（他把手舉起來，在抖）滴下去就是一瓢。', '樅爺：妳們記脈院的手穩。'],
      choices: [
        { text: '「我來。要什麼？」', lines: ['樅爺：池糖液一份。味診台調得出來。'], actions: [['quest', SHRINE, 's1']], next: null },
        { text: '「晚點。」', next: null }
      ] } }
  };
  G['dlg.p0.s0_3_fill'] = {
    start: 'a',
    nodes: { a: {
      text: ['〔旁白〕珂潾沖了手，把第七格的種莢請出來，放在龕前的淺盤裡。蠟縫裡看得見囊體縮成了一團。', '〔旁白〕一滴。等十個數。兩滴。', '〔旁白〕囊體慢慢鼓起來一點，那一小團菌的顏色從灰轉回了很淡的青。',
        { actions: [['take', 'item.med.pool_sugar', 1]] },
        '樅爺：活了。三樣都在。少一樣它就只是一顆乾果子。', '樅爺：這一格以前借出去過。兩年前吧，還是三年。一個記脈院的人，問我借一格放東西。', '珂潾：誰？',
        '樅爺：名字我記不住。印我記得。蠟上三點，像水濺的。', '〔旁白〕珂潾的手停在淺盤上。', '珂潾：……放了什麼？',
        '樅爺：一只封蠟的匣。放了一夜，隔天又拿走了。那個人說，放在龕裡太安全了，要放到「更會被找到的地方」。', '樅爺：我說龕就是給人找的。那個人笑，說：「龕是給知道要找的人找的。」',
        { actions: [['flag', 'flag.prologue.heard_auri_shrine_story']] },
        '樅爺：這只莢回潤了，照規矩可以分一份出去。梭這趟往靛丘走。妳說，分不分？'],
      choices: [
        { text: '「分一份給梭帶走。」', lines: ['珂潾：分。同一套配方放兩個地方，一個地方出事，還有另一個。', '樅爺：離了這裡的水，它那團菌不一定肯活。', '珂潾：不一定。所以不是全給，是分一份。'],
          actions: [['dim', 'axis.record', 1], ['flag', 'flag.prologue.shrine_seed_split'], ['quest', SHRINE, 'done']], next: null },
        { text: '「留在霧階。」', lines: ['珂潾：留。它是這一池的東西，在這裡才三樣齊全。要重新種，也是種在這裡。', '樅爺：好。那這一格就不借了。'],
          actions: [['dim', 'axis.sow', 1], ['flag', 'flag.prologue.shrine_seed_kept'], ['quest', SHRINE, 'done']], next: null }
      ] } }
  };

  // ======================= S0-4 別踩那一塊 =======================
  G['dlg.p0.s0_4_offer'] = {
    start: 'a',
    nodes: { a: {
      text: ['芽芽：哥哥去撿亮亮的石頭。他說一下就回來。', '芽芽：他的一下已經很久了。'],
      choices: [
        { text: '「他往哪邊去？」', lines: ['芽芽：東邊。有很多裂裂的地方。蒲嬤說不可以去，所以他叫我不要講。', '芽芽：我現在講了。'], actions: [['quest', SOFT, 's1']], next: null },
        { text: '「等一下再說。」', next: null }
      ] } }
  };
  G['dlg.p0.s0_4_edge'] = [
    '礫：（從乾裂區中間喊）珂潾姐！不要過來！會陷！', '礫：我進來的時候是硬的！回頭就不硬了！',
    '〔旁白〕乾裂區。活土在這裡失去了回彈，表面翹成一片一片骨白色的殼。有些殼底下還連著活的土，有些底下已經空了。',
    '珂潾：礫，站著別動。告訴我你腳下是什麼顏色。', '礫：白的。很亮。', '珂潾：亮的是空殼。你旁邊有沒有長草的地方？', '礫：有。小小的一叢。',
    '珂潾：草還活著，表示底下的土還在喝水。有草的地方可以踩，一次一個人。', { tutorial: 'T-12' }
  ];
  G['dlg.p0.s0_4_li'] = {
    lines: ['礫：我只是想撿三顆。這裡的結晶比階梯泉的大。', '珂潾：因為這裡的土在把礦吐出來。它喝不到水，就把鹹的東西往外推。', '礫：所以結晶大是壞事？',
      '珂潾：我不知道是不是壞事。我知道的是：結晶變大，土變脆，兩件事同時發生。', '礫：這樣可以寫成答案嗎？', '珂潾：可以寫成「同時發生」。不可以寫成「因為」。', '礫：……記脈者好麻煩。',
      '珂潾：走我走過的草。離我一步。不要並肩——兩個人站同一塊，土撐不住。'],
    actions: [['cutscene', 'cs.p0.s0_4_back']]
  };
  D.cutscenes['cs.p0.s0_4_back'] = [
    ['fade', 'out', 500],
    ['warp', 'map.miststep.soilflat', 22, 12, 'down'],
    ['fade', 'in', 400],
    ['say', '礫：（把口袋裡的結晶全掏出來）給妳。我不要了。'],
    ['say', '珂潾：留一顆。記得它是在哪裡撿的、那天土是什麼樣子。這樣它才算樣本，不算石頭。'],
    ['say', '礫：那另外三顆給妳。'],
    ['quest', SOFT, 'done']
  ];

  // ======================= S0-5 三支籤換不到的東西 =======================
  G['dlg.p0.s0_5_offer'] = {
    start: 'a',
    nodes: { a: {
      text: ['絡：（不看臉，看手）左手。食指根。', '珂潾：什麼？', '絡：妳的掌套漏了。針尖大。妳剛才走過來，我聞得到妳早上嚐過什麼。鹹的，後面還有東西。',
        '絡：這不禮貌。不是妳不禮貌，是掌套不禮貌。一個人嚐到什麼，是那個人的事，不該讓整條小徑都知道。', '絡：進了有毒的地方，那個孔就不只是不禮貌了。'],
      choices: [
        { text: '「能補嗎？」', lines: ['絡：能。要一片半透膜，外環來的那種。我這裡沒有了。北口那個護送的有。'], actions: [['quest', BARTER, 's1']], next: null },
        { text: '「先這樣。」', lines: ['絡：妳的手，妳決定。'], next: null }
      ] } }
  };
  G['dlg.p0.s0_5_suo_patch'] = {
    lines: ['梭：有。兩片，本來要帶到靛丘的。可以讓一片。', '珂潾：三支籤？', '梭：（笑）籤出了霧階，就是三根竹片。我往下一站走，下一站不認霧階的籤。',
      '梭：我要的是下一站用得上的東西。消息。', '梭：妳們站的湯。蓴嬸那鍋，嚐一口就知道霧階今天的水怎麼樣。封一罐給我，我帶到岔池站，那邊的池守會拿兩天的吃住來換。',
      { actions: [['quest', BARTER, 's2']] },
      '梭：對了，說到岔池站——上個霧季，焚脈派的人去過。帶著隔離索，量了三天。', '梭：他們很客氣。量完，東邊三座棚就在線外面了。我是聽那邊的龕守說的，沒親眼看。',
      '珂潾：線畫了之後呢？', '梭：線外面的人搬進線裡面。池子沒辦法搬。'],
    actions: [['flag', 'flag.prologue.heard_burner_rumor']]
  };
  G['dlg.p0.s0_5_chun'] = {
    start: 'a',
    nodes: {
      a: { text: ['蓴嬸：封一罐？可以。可是今天這鍋我自己都不滿意，太鹹，水的問題，不是我的問題。', '蓴嬸：要一顆池糖囊把它圓回來。熟的，飽的。我的用完了。'],
        next: 'chk' },
      chk: { branch: [{ cond: 'item:item.sample.sugar_sac', next: 'have' }], next: 'none' },
      have: {
        text: ['珂潾：我有。', '〔旁白〕蓴嬸把糖囊在鍋邊一磕，整顆滑進湯裡，攪了三圈，嚐一口，點頭。', '蓴嬸：這才是今天的湯。鹹是真的鹹，我不遮它；我只是讓人喝得下去。', '蓴嬸：（封好一只小陶罐）拿去。跟那個外環的說，罐子要還。'],
        actions: [['take', 'item.sample.sugar_sac', 1], ['give', 'item.quest.sealed_soup', 1], ['quest', BARTER, 's3']], next: null },
      none: { text: ['蓴嬸：階梯泉二階就有一叢。挑外緣熟的。'], actions: [['toast', '需要池糖囊 ×1']], next: null }
    }
  };
  G['dlg.p0.s0_5_suo_soup'] = {
    lines: ['梭：（開罐，聞，蓋上）鹹，尾巴有一點別的。我嚐不出是什麼，岔池站的池守嚐得出來。', '梭：成交。'],
    actions: [['take', 'item.quest.sealed_soup', 1], ['give', 'item.quest.membrane_patch', 1], ['quest', BARTER, 's4']]
  };
  G['dlg.p0.s0_5_luo'] = {
    lines: ['〔旁白〕絡把珂潾的左掌套翻過來，用一根骨針挑開食指根的接縫，襯進膜片，抹了癒合膠，壓了三十個數。', '絡：好了。戴上，握拳。', '絡：現在我聞不到妳了。這樣才對。',
      '絡：扣到最緊的時候，外面的東西進不來，妳的東西也出不去。可是妳也嚐不到了——所以只在該扣的時候扣。', '珂潾：一顆糖囊，換一罐湯，換一片膜，換一個針孔。',
      '絡：沒有人吃虧。每個人都拿到自己用得上的。籤只是我們站裡懶得每次都這樣算。'],
    actions: [['take', 'item.quest.membrane_patch', 1], ['quest', BARTER, 'done'],
      ['lines', ['〔旁白〕（取得「無孔掌套」：防護的回合，受到的體力傷害與感官灌入由減半改為只剩三成。）']]]
  };
})(window.VELLORA);
