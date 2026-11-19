/*
 * 嚐味診療（遭遇系統）。規格見 docs/00-master-outline.md §2.1–2.2。
 * 資料驅動：對象的味序、失衡、行為表、獎勵皆來自 data.encounters。
 * 結束方式：stabilized 穩定／isolated 隔離／retreated 撤離／evacuated 力竭撤離。沒有擊殺。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game, S = V.sprites;
  var B = V.battle = {};
  B.st = null;

  var RULE = B.RULE = {
    tasteHighLoad: 8, tasteLowLoad: 20, noisyAt: 70, falseChance: 0.35,
    residueChance: 0.5, residueTaint: 0.6, clearCost: 10, guardFactor: 0.4,
    wrongImbalance: 12, sweetImbalance: 15, isolateConn: -8, stableConn: 4
  };

  function passive(key) {
    var n = 0;
    Gm.s.skills.forEach(function (id) { var sk = V.data.skills[id]; if (sk && sk.passive && sk.passive[key]) n += sk.passive[key]; });
    return n;
  }
  function commandSkills() {
    return Gm.s.skills.map(function (id) { var sk = V.data.skills[id]; return sk && sk.command ? { id: id, sk: sk } : null; }).filter(Boolean);
  }
  function otherGlyph(g) {
    var pool = V.GLYPH_ORDER.filter(function (x) { return x !== g; });
    return pool[Math.floor(U.rand() * pool.length)];
  }
  function pause(ms) { return U.wait(ms); }

  // ======================= 進入遭遇 =======================
  B.start = async function (id, opts) {
    opts = opts || {};
    var def = V.data.encounters[id];
    if (!def) { console.warn('找不到遭遇', id); return 'retreated'; }
    var seqSrc = def.sequences ? def.sequences[Math.floor(U.rand() * def.sequences.length)] : def.sequence;
    if (typeof seqSrc === 'string') seqSrc = seqSrc.split('');
    var st = B.st = {
      id: id, def: def, opts: opts,
      seq: seqSrc.map(function (g) { return { g: g, known: null, reliable: true, stale: false }; }),
      startLen: seqSrc.length,
      imbalance: def.imbalance != null ? def.imbalance : 60,
      turn: 0, guard: false, residue: null, log: [], intent: null, stun: false,
      cooldown: {}, used: {}, result: null, menu: 'busy', frame: 0, animT: 0,
      zone: opts.zone || (V.field.map && V.field.map.def.zone) || null
    };
    st.perGlyph = Math.max(6, Math.round(st.imbalance / Math.max(1, st.startLen)));
    Gm.s.stats.encounters++;
    build(st);
    await UI.fade('out', 220, '#0b0a0e');
    UI.push(st.modal);
    V.audio.ambience(def.ambience || 'cave');
    render();
    await UI.fade('in', 260);
    log(def.intro || (def.name + '擋在前方。'), 'sys');
    if (def.tutorial && !Gm.s.seen['tut:' + def.tutorial]) {
      Gm.s.seen['tut:' + def.tutorial] = true;
      var tut = V.data.tutorials[def.tutorial];
      if (tut) await UI.pages(tut.title, tut.pages, { skippable: true });
    }
    // ---- 回合迴圈 ----
    while (!st.result) {
      st.turn++; st.guard = false; st.stun = false;
      pickIntent();
      render();
      var cmd = await prompt();
      await resolve(cmd);
      if (!st.result && !st.stun) await creatureAct();
      if (!st.result) await endRound();
    }
    var result = st.result;
    await finish(result);
    await UI.fade('out', 220, '#0b0a0e');
    UI.pop(st.modal);
    B.st = null;
    if (V.field.map) V.audio.ambience(V.field.map.def.ambience || 'village');
    await UI.fade('in', 260);
    if (result === 'evacuated' && !opts.noEvacWarp) await Gm.evacuate('體力耗盡，再撐下去會出事。');
    return result;
  };

  // ======================= 畫面 =======================
  function build(st) {
    var def = st.def;
    var el = UI.el('div', 'battle bg-' + (def.bg || 'cave'),
      '<div class="b-top">' +
      '<div class="b-stage"><canvas class="b-creature" width="48" height="48"></canvas><div class="b-fx"></div></div>' +
      '<div class="b-info panel">' +
      '<div class="b-namerow"><span class="b-name"></span><button type="button" class="btn ghost b-help" data-id="help">味符對照</button></div>' +
      '<div class="b-mood"></div>' +
      '<div class="b-meter"><span>失衡</span><div class="bar imb"><i></i></div><span class="b-imbtxt"></span></div>' +
      '<div class="b-intent"></div></div></div>' +
      '<div class="b-seqwrap panel"><div class="b-seqhead"><span>味序</span><small>依到達順序，由左至右；處置只作用在最前面的味符</small></div>' +
      '<div class="b-seq"></div><div class="b-seqnote"></div></div>' +
      '<div class="b-bottom">' +
      '<div class="b-player panel"></div>' +
      '<div class="b-cmdwrap panel"><div class="b-cmdtitle"></div><div class="b-cmd"></div></div>' +
      '<div class="b-log panel" aria-live="polite"></div></div>' +
      '<div class="b-result" hidden></div>');
    st.el = el;
    st.q = function (sel) { return el.querySelector(sel); };
    st.list = new UI.List(st.q('.b-cmd'), {
      cols: 2,
      onChoose: function (it) { onChoose(it); },
      onCancel: function () { if (st.menu !== 'main' && st.menu !== 'busy') showMain(); },
      onMove: function (it) { st.q('.b-cmdtitle').textContent = it && it.hint ? it.hint : (st.menuTitle || ''); }
    });
    st.q('.b-help').addEventListener('click', function () { V.audio.unlock(); if (st.menu !== 'busy') B.help(); });
    st.modal = {
      kind: 'battle', el: el,
      update: function (dt) {
        st.animT += dt;
        var f = Math.floor(st.animT * 2.2) % 2;
        if (f !== st.frame) { st.frame = f; drawCreature(); }
        if (st.menu !== 'busy') st.list.update();
      }
    };
    drawCreature();
  }
  function drawCreature() {
    var st = B.st; if (!st) return;
    var cv = st.q('.b-creature'), ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    var spec = st.def.sprite || {};
    if (st.result === 'stabilized') { spec = U.clone(spec); spec.wild = 0; spec.vein = '#73D6D0'; if (spec.calmBody) spec.body = spec.calmBody; }
    ctx.drawImage(S.creature(spec, 48, st.frame), 0, 0);
  }
  function moodText(st) {
    var moods = st.def.moods || [];
    for (var i = 0; i < moods.length; i++) if (st.imbalance >= (moods[i].gte || 0)) return moods[i].text;
    return st.imbalance >= 70 ? '周圍的空氣又緊又燙，牠隨時會失控。' : st.imbalance >= 35 ? '牠繃著，但還聽得進水聲。' : '牠的呼吸慢了下來。';
  }
  function imbWord(v) { return v >= 80 ? '瀕臨失控' : v >= 55 ? '劇烈' : v >= 30 ? '不穩' : v > 0 ? '趨緩' : '平穩'; }

  function render() {
    var st = B.st; if (!st) return;
    var s = Gm.s;
    st.q('.b-name').textContent = st.def.name;
    st.q('.b-mood').textContent = moodText(st);
    st.q('.bar.imb i').style.width = U.clamp(st.imbalance, 0, 100) + '%';
    st.q('.b-imbtxt').textContent = imbWord(st.imbalance);
    st.q('.b-intent').innerHTML = st.intent && st.intent.tell ? '<b>徵兆</b>' + U.esc(st.intent.tell) : '<b>徵兆</b>看不出牠下一步要做什麼。';
    // 味序
    var html = '';
    st.seq.forEach(function (g, i) {
      var cls = (i === 0 ? 'front ' : '') + (g.known ? 'known ' : 'unknown ') + (g.fresh ? 'fresh ' : '') + (g.stale ? 'stale ' : '') + (g.known && !g.reliable ? 'shaky ' : '');
      var note = g.known ? (g.stale ? '已重排？' : (!g.reliable ? '可能失真' : '')) : '';
      html += '<div class="b-slot">' + (i === 0 ? '<span class="b-front">最前</span>' : '<span class="b-front ghost">' + (i + 1) + '</span>') +
        UI.glyph(g.known, cls, note) + '</div>';
      g.fresh = false;
    });
    if (!st.seq.length) html = '<div class="b-clear">味序已清空</div>';
    st.q('.b-seq').innerHTML = html;
    var pct = Gm.loadPct(), notes = [];
    if (st.residue) notes.push('<span class="chip warn">味覺殘留：' + st.residue + '（下次讀值的首位可能被污染）</span>');
    if (pct >= 100) notes.push('<span class="chip bad">感官滿載：這回合無法嚐味</span>');
    else if (pct >= RULE.noisyAt) notes.push('<span class="chip warn">感官負荷過高：讀值可能出現假味符</span>');
    st.q('.b-seqnote').innerHTML = notes.join('');
    // 珂潾
    st.q('.b-player').innerHTML =
      '<div class="bp-name">' + U.esc(s.partyName) + '<small>Lv ' + s.level + '</small>' + (st.guard ? '<span class="chip ok">防護中</span>' : '') + '</div>' +
      '<div class="bp-row"><span>體力</span>' + UI.bar('hp' + (s.stamina / Gm.maxStamina() < 0.3 ? ' low' : ''), s.stamina, Gm.maxStamina()) + '<em>' + Math.ceil(s.stamina) + '/' + Gm.maxStamina() + '</em></div>' +
      '<div class="bp-row"><span>負荷</span>' + UI.bar('load' + (pct >= RULE.noisyAt ? ' hot' : ''), s.load, Gm.maxLoad(), '<u style="left:' + RULE.noisyAt + '%"></u>') + '<em>' + pct + '%</em></div>';
    // 紀錄
    var lg = st.log.slice(-6).map(function (l, i, arr) { return '<p class="' + l.cls + (i === arr.length - 1 ? ' new' : '') + '">' + U.esc(l.t) + '</p>'; }).join('');
    var le = st.q('.b-log'); le.innerHTML = lg; le.scrollTop = le.scrollHeight;
  }
  function log(t, cls) { var st = B.st; st.log.push({ t: t, cls: cls || '' }); if (st.log.length > 40) st.log.shift(); render(); }
  function fx(cls, ms) {
    var st = B.st, el = st.el;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    V.timers.add(ms || 600, function () { el.classList.remove(cls); });
  }
  function drop(color) {
    var st = B.st, d = UI.el('span', 'b-drop'); d.style.background = color;
    st.q('.b-fx').appendChild(d);
    V.timers.add(800, function () { if (d.parentNode) d.parentNode.removeChild(d); });
  }

  // ======================= 指令選單 =======================
  function prompt() {
    var st = B.st;
    return new Promise(function (res) { st.resolveCmd = res; showMain(); });
  }
  function submit(cmd) {
    var st = B.st;
    st.menu = 'busy'; st.list.set([]); st.q('.b-cmdtitle').textContent = '';
    st.el.classList.add('busy');
    var r = st.resolveCmd; st.resolveCmd = null; if (r) r(cmd);
  }
  B.exec = function (cmd) { if (B.st && B.st.resolveCmd) { submit(cmd); return true; } return false; };

  function medicines() {
    return Object.keys(Gm.s.items).filter(function (id) { var it = V.data.items[id]; return it && it.cat === 'medicine' && it.treats; });
  }
  function usables() {
    return Object.keys(Gm.s.items).filter(function (id) { var it = V.data.items[id]; return it && it.use && it.usable !== 'field'; });
  }
  function showMain() {
    var st = B.st, s = Gm.s;
    st.menu = 'main'; st.menuTitle = '第 ' + st.turn + ' 回合　要怎麼做？';
    st.el.classList.remove('busy');
    var full = Gm.loadPct() >= 100;
    var items = [
      { id: 'taste', label: '嚐味', hint: full ? '感官滿載，這回合無法嚐味。' : '取樣稀釋，讀出味序。', disabled: full },
      { id: 'treat', label: '處置', hint: medicines().length ? '對最前面的味符用藥。對症則消除，不對症會反噬。' : '手邊沒有處置藥。', disabled: !medicines().length },
      { id: 'clear', label: '清淤', hint: '徒手清除汲蟲淤堵（對「腥」）。體力 −' + RULE.clearCost + '。', disabled: s.stamina <= RULE.clearCost },
      { id: 'guard', label: '防護', hint: '封掌套：本回合所受傷害與訊號大幅降低。' }
    ];
    commandSkills().forEach(function (c) {
      var cd = st.cooldown[c.id] || 0, cost = (c.sk.command.cost || {}).stamina || 0;
      items.push({ id: 'skill:' + c.id, label: c.sk.name, hint: c.sk.desc + (cd ? '（還需 ' + cd + ' 回合）' : ''), disabled: cd > 0 || s.stamina <= cost });
    });
    items.push({ id: 'item', label: '物品', hint: usables().length ? '使用消耗品。' : '沒有可用的消耗品。', disabled: !usables().length });
    if (!st.def.noIsolate) items.push({ id: 'isolate', label: '隔離／切除', cls: 'danger', hint: '封住接口，立刻結束。失去樣本，連通度下降。' });
    if (!st.def.noRetreat) items.push({ id: 'retreat', label: '撤離', hint: '退開，改天再來。對象維持現狀。' });
    st.list.opts.cols = 2;
    st.list.set(items);
    st.q('.b-cmdtitle').textContent = st.menuTitle;
  }
  function showTaste() {
    var st = B.st;
    st.menu = 'taste'; st.menuTitle = '嚐味：選擇稀釋度';
    var hi = 1 + passive('tasteHigh'), lo = passive('tasteLow');
    st.list.opts.cols = 1;
    st.list.set([
      { id: 'taste:high', label: '高稀釋', sub: '讀出前 ' + hi + ' 個味符・負荷 +' + RULE.tasteHighLoad + '%', hint: '穩，但一次只讀得少。' },
      { id: 'taste:low', label: '低稀釋', sub: '讀出前 ' + (2 + lo) + '–' + (3 + lo) + ' 個・負荷 +' + RULE.tasteLowLoad + '%・可能留下味覺殘留', hint: '讀得多，代價是舌頭。' },
      { id: 'back', label: '返回' }]);
    st.q('.b-cmdtitle').textContent = st.menuTitle;
  }
  function showTreat() {
    var st = B.st;
    st.menu = 'treat'; st.menuTitle = '處置：選擇藥劑（作用於最前面的味符）';
    st.list.opts.cols = 1;
    var items = medicines().map(function (id) {
      var it = V.data.items[id];
      return { id: 'treat:' + id, label: U.esc(it.name), right: '×' + Gm.count(id), sub: '對「' + it.treats + '」', icon: V.gfx.icon(it.icon), hint: it.desc || '' };
    });
    items.push({ id: 'back', label: '返回' });
    st.list.set(items);
    st.q('.b-cmdtitle').textContent = st.menuTitle;
  }
  function showItems() {
    var st = B.st;
    st.menu = 'item'; st.menuTitle = '物品';
    st.list.opts.cols = 1;
    var items = usables().map(function (id) {
      var it = V.data.items[id];
      return { id: 'use:' + id, label: U.esc(it.name), right: '×' + Gm.count(id), sub: U.esc(it.desc || ''), icon: V.gfx.icon(it.icon) };
    });
    items.push({ id: 'back', label: '返回' });
    st.list.set(items);
    st.q('.b-cmdtitle').textContent = st.menuTitle;
  }
  async function onChoose(it) {
    var st = B.st, id = it.id;
    if (id === 'back') return showMain();
    if (id === 'taste') return showTaste();
    if (id === 'treat') return showTreat();
    if (id === 'item') return showItems();
    if (id === 'isolate') {
      st.menu = 'busy';
      var ok = await UI.confirm('隔離會封死這段接口：對象不再擴散，但妳拿不到樣本，這一帶的連通度會下降。這個決定收不回來。', '封住', '再想想');
      if (ok) return submit({ cmd: 'isolate' });
      return showMain();
    }
    if (id === 'retreat') {
      st.menu = 'busy';
      var ok2 = await UI.confirm('要先退開嗎？對象會留在原地。', '撤離', '留下');
      if (ok2) return submit({ cmd: 'retreat' });
      return showMain();
    }
    if (id === 'clear' || id === 'guard') return submit({ cmd: id });
    var p = id.split(':');
    if (p[0] === 'taste') return submit({ cmd: 'taste', low: p[1] === 'low' });
    if (p[0] === 'treat') return submit({ cmd: 'treat', item: p[1] });
    if (p[0] === 'use') return submit({ cmd: 'use', item: p[1] });
    if (p[0] === 'skill') return submit({ cmd: 'skill', skill: p[1] });
  }

  B.help = function () {
    var meds = {};
    Object.keys(V.data.items).forEach(function (id) { var it = V.data.items[id]; if (it.cat === 'medicine' && it.treats) meds[it.treats] = it.name; });
    var rows = V.GLYPH_ORDER.map(function (g) {
      var d = V.GLYPHS[g];
      return '<tr><td>' + UI.glyph(g, 'known small') + '</td><td>' + d.desc + '</td><td><b>' + (g === '腥' ? '清淤' : g === '甜' ? '不處置' : (meds[g] || d.treat)) + '</b></td></tr>';
    }).join('');
    return UI.pages('味符對照', [{ title: '味符・病理・對症', html: '<table class="glyph-table"><tr><th>味符</th><th>代表</th><th>對症</th></tr>' + rows + '</table><p class="fine">甜是健康的糖流：讀出它之後不要處置，它會自己流過。</p>' }], { skippable: true });
  };

  // ======================= 指令結算 =======================
  async function resolve(cmd) {
    var st = B.st, s = Gm.s;
    switch (cmd.cmd) {
      case 'taste': await doTaste(cmd.low); break;
      case 'treat': await doTreat(cmd.item); break;
      case 'clear': await doClear(); break;
      case 'guard':
        st.guard = true; V.audio.play('guard'); Gm.addLoad(-4);
        log('珂潾封緊掌套，收攏感官。'); fx('fx-guard', 500); await pause(450); break;
      case 'use': {
        var it = V.data.items[cmd.item], u = it.use || {};
        Gm.take(cmd.item, 1, true);
        if (u.stamina) s.stamina = U.clamp(s.stamina + u.stamina, 0, Gm.maxStamina());
        if (u.load) Gm.addLoad(u.load);
        if (u.clearResidue) st.residue = null;
        V.audio.play('heal'); log('使用了' + it.name + '。' + (u.text || '')); await pause(450);
        break;
      }
      case 'skill': {
        var sk = V.data.skills[cmd.skill], c = sk.command || {};
        if (c.cost && c.cost.stamina) s.stamina = Math.max(1, s.stamina - c.cost.stamina);
        if (c.cooldown) st.cooldown[cmd.skill] = c.cooldown + 1;
        V.audio.play('guard'); fx('fx-guard', 500);
        log(c.text || ('珂潾使出' + sk.name + '。'));
        if (c.effect === 'stun') st.stun = true;
        if (c.effect === 'calm') st.imbalance = Math.max(0, st.imbalance - (c.power || 10));
        if (c.effect === 'rinse') { Gm.addLoad(-(c.power || 15)); st.residue = null; }
        await pause(500);
        break;
      }
      case 'isolate':
        V.audio.play('isolate'); fx('fx-isolate', 1200);
        log(st.def.isolateText || '珂潾夾住接口，封死管段。訊號一截一截地暗下去。', 'bad');
        await pause(1200); st.result = 'isolated'; break;
      case 'retreat':
        log('珂潾一步一步退開，沒有轉身。'); await pause(500); st.result = 'retreated'; break;
    }
    if (!st.result && !st.seq.length) st.result = 'stabilized';
    render();
  }

  async function doTaste(low) {
    var st = B.st;
    var n = low ? U.randInt(2, 3) + passive('tasteLow') : 1 + passive('tasteHigh');
    n = Math.min(n, st.seq.length);
    var noisy = Gm.loadPct() >= RULE.noisyAt;
    var residue = st.residue; st.residue = null;
    log(low ? '珂潾讓低稀釋的樣本滑過整片舌面。' : '珂潾把樣本稀釋，點在舌尖。');
    await pause(250);
    var read = [];
    for (var i = 0; i < n; i++) {
      var g = st.seq[i], shown = g.g, reliable = true;
      if (i === 0 && residue) { reliable = false; if (residue !== g.g && U.rand() < RULE.residueTaint) shown = residue; }
      if (noisy) { reliable = false; if (U.rand() < RULE.falseChance) shown = otherGlyph(g.g); }
      g.known = shown; g.reliable = reliable; g.stale = false; g.fresh = true;
      read.push(shown + (reliable ? '' : '？'));
      V.audio.play('taste', { glyph: shown });
      render(); await pause(420);
    }
    Gm.addLoad(low ? RULE.tasteLowLoad : RULE.tasteHighLoad);
    log('讀出：' + read.join(' → ') + (noisy ? '　（舌頭發麻，不敢確定）' : residue ? '　（上一口的味道還黏在舌根）' : ''), 'read');
    if (low && n > 0 && U.rand() < RULE.residueChance) {
      st.residue = st.seq[n - 1].g;
      log('濃度太高——「' + st.residue + '」味留在舌根散不掉。', 'warn');
    }
    await pause(250);
  }

  async function doTreat(itemId) {
    var st = B.st, s = Gm.s, it = V.data.items[itemId];
    Gm.take(itemId, 1, true);
    var front = st.seq[0];
    drop((V.GLYPHS[it.treats] || {}).color || '#73D6D0');
    log('珂潾滴下' + it.name + '。'); V.audio.play('treat');
    await pause(650);
    if (front.g === it.treats) {
      st.seq.shift(); st.imbalance = Math.max(0, st.imbalance - st.perGlyph);
      fx('fx-good', 700);
      log(it.treatText || ('對症。「' + front.g + '」味散開了。'), 'good');
    } else if (front.g === '甜') {
      st.imbalance = Math.min(100, st.imbalance + RULE.sweetImbalance);
      if (st.zone) Gm.addConn(st.zone, -2);
      front.known = '甜'; front.reliable = true; front.fresh = true;
      V.audio.play('backfire'); fx('fx-bad', 700);
      log('那是健康的糖流——藥把它也中和了。對象痛得整個縮起來。', 'bad');
    } else {
      st.imbalance = Math.min(100, st.imbalance + RULE.wrongImbalance);
      var dmg = U.randInt(4, 8);
      s.stamina = Math.max(0, s.stamina - dmg);
      if (front.known === it.treats) { front.known = null; front.reliable = true; }
      V.audio.play('backfire'); fx('fx-bad', 700);
      log('不對症！藥劑激起反噬，逆流的汁液濺上手臂（體力 −' + dmg + '）。最前面的不是「' + it.treats + '」。', 'bad');
    }
    await pause(600);
    await overflowCheck();
    checkDown();
  }

  async function doClear() {
    var st = B.st, s = Gm.s;
    s.stamina = Math.max(1, s.stamina - RULE.clearCost);
    var front = st.seq[0];
    log('珂潾把手伸進接口，摸索淤堵（體力 −' + RULE.clearCost + '）。'); V.audio.play('splash');
    await pause(550);
    if (front.g === '腥') {
      st.seq.shift(); st.imbalance = Math.max(0, st.imbalance - st.perGlyph);
      fx('fx-good', 700); V.audio.play('treat');
      log('掏出一團已經不動的汲蟲。管路重新吸了一口氣，「腥」味退了。', 'good');
    } else {
      st.imbalance = Math.min(100, st.imbalance + 5);
      if (front.known === '腥') { front.known = null; front.reliable = true; }
      log('這裡沒有淤堵可清。白費了力氣，對象更緊繃了。', 'bad'); fx('fx-bad', 500);
    }
    await pause(500);
    await overflowCheck();
  }

  async function overflowCheck() {
    var st = B.st;
    if (st.imbalance < 100 || !st.seq.length) return;
    var pool = st.def.growPool || ['苦', '焦'];
    if (st.seq.length < 7) st.seq.push({ g: pool[Math.floor(U.rand() * pool.length)], known: null, reliable: true });
    st.imbalance = 78;
    V.audio.play('rumble'); fx('fx-bad', 900);
    log('失衡滿溢——對象整個痙攣，味序尾端又長出新的病味。', 'bad');
    await pause(700);
  }
  function checkDown() {
    var st = B.st, s = Gm.s;
    if (s.stamina <= 0) {
      if (st.def.noEvac) { s.stamina = 1; return; }
      st.result = 'evacuated';
    }
  }

  // ======================= 對象行動 =======================
  function behOk(b, st) {
    var w = b.when; if (!w) return true;
    if (w.imbalanceGte != null && st.imbalance < w.imbalanceGte) return false;
    if (w.imbalanceLt != null && st.imbalance >= w.imbalanceLt) return false;
    if (w.front && U.toArray(w.front).indexOf(st.seq[0] ? st.seq[0].g : '') < 0) return false;
    if (w.turnGte != null && st.turn < w.turnGte) return false;
    if (w.every && st.turn % w.every !== 0) return false;
    if (w.lenGte != null && st.seq.length < w.lenGte) return false;
    if (w.lenLt != null && st.seq.length >= w.lenLt) return false;
    if (w.once && st.used[b.id]) return false;
    return true;
  }
  function pickIntent() {
    var st = B.st;
    var list = (st.def.behaviors || []).filter(function (b) {
      if (!behOk(b, st)) return false;
      if (b.type === 'grow' && st.seq.length >= (b.max || 7)) return false;
      if (b.type === 'reorder' && st.seq.length < 2) return false;
      return true;
    });
    st.intent = list.length ? U.weighted(list) : { type: 'idle', text: '對象只是喘著。' };
  }
  async function creatureAct() {
    var st = B.st, s = Gm.s, b = st.intent;
    if (!b) return;
    if (b.id) st.used[b.id] = true;
    var k = (1 + st.imbalance / 200) * (st.guard ? RULE.guardFactor - passive('guard') : 1);
    k = Math.max(0.1, k);
    switch (b.type) {
      case 'attack': {
        var dmg = Math.max(1, Math.round(U.range(b.power || [5, 8]) * k));
        s.stamina = Math.max(0, s.stamina - dmg);
        V.audio.play('hit'); fx('fx-hurt', 500);
        log((b.text || '對象猛然抽動。') + '（體力 −' + dmg + (st.guard ? '，防護擋下大半' : '') + '）', 'hurt');
        break;
      }
      case 'load': {
        var ld = Math.max(1, Math.round(U.range(b.power || [8, 12]) * k));
        Gm.addLoad(ld);
        V.audio.play('hiss'); fx('fx-load', 500);
        log((b.text || '一股強訊號灌進感官。') + '（感官負荷 +' + ld + '%' + (st.guard ? '，防護擋下大半' : '') + '）', 'hurt');
        break;
      }
      case 'reorder': {
        var before = st.seq.map(function (g) { return g.g; }).join('');
        for (var t = 0; t < 6; t++) { U.shuffle(st.seq); if (st.seq.map(function (g) { return g.g; }).join('') !== before) break; }
        st.seq.forEach(function (g) { if (g.known) g.stale = true; });
        st.seq.forEach(function (g) { g.known = null; g.stale = false; });
        V.audio.play('warp'); fx('fx-shuffle', 700);
        log((b.text || '對象體內的流向亂了。') + '味序被打亂——先前的讀值全部作廢。', 'warn');
        break;
      }
      case 'grow': {
        var g = b.glyph || (b.pool ? b.pool[Math.floor(U.rand() * b.pool.length)] : '苦');
        var pos = b.at === 'front' ? 0 : (b.at === 'end' ? st.seq.length : U.randInt(Math.min(1, st.seq.length), st.seq.length));
        st.seq.splice(pos, 0, { g: g, known: null, reliable: true, fresh: true });
        st.imbalance = Math.min(100, st.imbalance + 8);
        V.audio.play('rumble'); fx('fx-shuffle', 700);
        log((b.text || '病灶擴散。') + '味序裡多了一個還沒讀過的味符。', 'warn');
        break;
      }
      case 'surge':
        st.imbalance = Math.min(100, st.imbalance + U.range(b.power || 8));
        log(b.text || '對象的失衡加劇了。', 'warn'); break;
      case 'settle':
        st.imbalance = Math.max(0, st.imbalance - U.range(b.power || 5));
        log(b.text || '對象稍微鬆了下來。'); break;
      default:
        log(b.text || '對象只是喘著。');
    }
    await pause(650);
    checkDown();
    render();
  }
  async function endRound() {
    var st = B.st, s = Gm.s;
    Object.keys(st.cooldown).forEach(function (k) { if (st.cooldown[k] > 0) st.cooldown[k]--; });
    // 已讀出的甜味在最前面：健康的糖流自己流過
    while (st.seq.length && st.seq[0].g === '甜' && st.seq[0].known === '甜') {
      st.seq.shift();
      s.stamina = Math.min(Gm.maxStamina(), s.stamina + 3);
      V.audio.play('chime'); fx('fx-good', 600);
      log('「甜」是健康的糖流。珂潾沒有動它，讓它自己流過去。', 'good');
      await pause(500);
    }
    if (!st.seq.length) st.result = 'stabilized';
  }

  // ======================= 結束 =======================
  async function finish(result) {
    var st = B.st, s = Gm.s, def = st.def, rw = def.rewards || {};
    var title, lines = [], cls = result;
    if (result === 'stabilized') {
      s.stats.stabilized++;
      drawCreature(); st.el.classList.add('calm'); V.audio.play('heal');
      title = '穩定';
      lines.push(def.stableText || '味序清空了。牠的呼吸重新跟上水聲。');
      var exp = rw.exp != null ? rw.exp : 20;
      lines.push('見識 +' + exp);
      Object.keys(rw.items || {}).forEach(function (id) { Gm.give(id, rw.items[id], true); lines.push('取得 ' + V.data.items[id].name + ' ×' + rw.items[id]); });
      Object.keys(rw.flags || {}).forEach(function (f) { Gm.setFlag(f, rw.flags[f]); });
      Gm.addDim('bo', 1);
      Object.keys(rw.dims || {}).forEach(function (d) { Gm.addDim(d, rw.dims[d]); });
      if (rw.conn) Object.keys(rw.conn).forEach(function (z) { Gm.addConn(z, rw.conn[z]); });
      else if (st.zone) Gm.addConn(st.zone, RULE.stableConn);
      lines.push('這一帶的水路，接得更牢了一點。');
      Gm.addExp(exp);
    } else if (result === 'isolated') {
      s.stats.isolated++;
      title = '已隔離';
      var iso = def.isolate || {};
      lines.push(iso.text || '管段封死了。這裡不會再擴散，也不會再回答。');
      var e2 = iso.exp != null ? iso.exp : Math.floor((rw.exp != null ? rw.exp : 20) / 3);
      if (e2) lines.push('見識 +' + e2);
      lines.push('沒有取得樣本。這一帶的連通度下降了。');
      Gm.addDim('fen', 1);
      Object.keys(iso.dims || {}).forEach(function (d) { Gm.addDim(d, iso.dims[d]); });
      if (iso.conn) Object.keys(iso.conn).forEach(function (z) { Gm.addConn(z, iso.conn[z]); });
      else if (st.zone) Gm.addConn(st.zone, RULE.isolateConn);
      Object.keys(iso.flags || {}).forEach(function (f) { Gm.setFlag(f, iso.flags[f]); });
      Gm.addExp(e2);
    } else if (result === 'retreated') {
      s.stats.retreated++;
      title = '撤離'; lines.push('珂潾退到安全的距離。對象還在原地，味序沒有變。');
    } else {
      title = '力竭'; lines.push('手在抖，舌頭也嚐不出東西了。不能再撐。');
    }
    var box = st.q('.b-result');
    box.hidden = false;
    box.innerHTML = '<div class="panel b-resbox ' + cls + '"><h2>' + title + '</h2>' + lines.map(function (l) { return '<p>' + U.esc(l) + '</p>'; }).join('') +
      '<button type="button" class="btn" data-id="result-ok">繼續</button></div>';
    await new Promise(function (res) {
      var m = { kind: 'result', update: function () { if (V.input.pressed('confirm') || V.input.pressed('cancel')) { UI.pop(m); res(); } } };
      box.querySelector('button').onclick = function () { V.input.press('confirm'); };
      UI.push(m);
    });
  }
})();
