/*
 * 嚐味診療（遭遇系統）。規格見 docs/00-master-outline.md §2.1–2.2 與 docs/script/ch00-prologue.md §4.2。
 * 資料驅動：對象的味序、失衡、行為表、特殊規則、事件台詞、獎勵皆來自 data.encounters。
 * 結束方式：stabilized 穩定／isolated 隔離／collapsed 失穩／retreated 撤離／evacuated 力竭撤離／read 讀完（只嚐不治型）。
 * 沒有擊殺：介面與文字一律使用「穩定、隔離、撤離、失穩」。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, UI = V.ui, Gm = V.game, S = V.sprites;
  var B = V.battle = {};
  B.st = null;

  // 預設數值（序章 §4.2）；可由 data.meta.battleRules 覆寫任一項
  var DEFAULT_RULE = {
    tasteHighLoad: 4,        // 高稀釋：感官負荷 +4（點數）
    tasteLowLoad: 10,        // 低稀釋：感官負荷 +10
    residueChance: 0.3,      // 低稀釋留下味覺殘留的機率
    noisyAt: 70,             // 負荷 ≥ 上限 70%：讀值可能失真
    falseChance: 0.25,       // 失真時，該次嚐味其中一個讀值為假的機率
    treatImbalance: 10,      // 對症：失衡 −10
    misImbalance: 15,        // 誤治：失衡 +15（各對象可用 misImbalance 覆寫）
    misDamage: 1.5,          // 誤治回合：對象行為傷害 ×1.5
    sweetImbalance: 20,      // 對甜處置：失衡 +20
    clearCost: 4,            // 清淤：體力 −4
    rinseLoad: 15,           // 回沖：負荷 −15
    collapseExp: 0.3,        // 失穩：見識只給三成
    collapseConn: -1,        // 失穩：連通度 −1
    stableConn: 2,           // 穩定（未指定 rewards.conn 時）：連通度 +2
    isolateConn: -3,         // 隔離（未指定 isolate.conn 時）：連通度 −3
    stableExp: 20
  };
  B.rule = function () {
    var r = U.clone(DEFAULT_RULE), o = (V.data.meta && V.data.meta.battleRules) || {};
    Object.keys(o).forEach(function (k) { r[k] = o[k]; });
    return r;
  };
  B.DEFAULT_RULE = DEFAULT_RULE;
  B.RESULTS = ['stabilized', 'isolated', 'collapsed', 'retreated', 'evacuated', 'read'];
  B.BEHAVIOR_TYPES = ['attack', 'load', 'drain', 'reorder', 'grow', 'surge', 'settle', 'idle'];
  B.COMMANDS = ['taste', 'treat', 'clear', 'guard', 'rinse', 'item', 'isolate', 'retreat'];

  // ---- 能力：由手技（skills）與重要物品（items 的 unlock）決定 ----
  function owned() {
    var out = [];
    Gm.s.skills.forEach(function (id) { var sk = V.data.skills[id]; if (sk) out.push(sk); });
    Object.keys(Gm.s.items).forEach(function (id) { var it = V.data.items[id]; if (it && it.unlock && Gm.count(id) > 0) out.push(it); });
    return out;
  }
  B.can = function (what) {
    if (!Gm.s) return false;
    return owned().some(function (o) { return U.toArray(o.unlock).indexOf(what) >= 0; });
  };
  function passiveMax(key, def) {
    var n = def;
    owned().forEach(function (o) { if (o.passive && o.passive[key] != null && o.passive[key] > n) n = o.passive[key]; });
    return n;
  }
  function passiveSum(key) {
    var n = 0; owned().forEach(function (o) { if (o.passive && o.passive[key]) n += o.passive[key]; });
    return n;
  }
  function otherGlyph(g) {
    var pool = V.GLYPH_ORDER.filter(function (x) { return x !== g; });
    return pool[Math.floor(U.rand() * pool.length)];
  }
  function pause(ms) { return U.wait(ms); }
  function rankOf(def) { return def.rank || 'normal'; }

  // ======================= 進入遭遇 =======================
  B.start = async function (id, opts) {
    opts = opts || {};
    var def = V.data.encounters[id];
    if (!def) { console.warn('找不到遭遇', id); return 'retreated'; }
    var seqSrc = def.sequences ? def.sequences[Math.floor(U.rand() * def.sequences.length)] : def.sequence;
    if (typeof seqSrc === 'string') seqSrc = seqSrc.split('');
    var RULE = B.rule();
    var st = B.st = {
      id: id, def: def, opts: opts, R: RULE,
      seq: seqSrc.map(function (g) { return { g: g, known: null, reliable: true }; }),
      imbalance: def.imbalance != null ? def.imbalance : 50,
      turn: 0, guard: false, mis: false, residue: null, log: [], intent: null,
      used: {}, said: {}, revealed: 0, sweetHurt: 0, clamp: 0, rinsed: false,
      result: null, menu: 'busy', frame: 0, animT: 0, lastCmd: null,
      zone: opts.zone || def.zone || (V.field.map && V.field.map.def.zone) || null
    };
    Gm.s.stats.encounters++;
    build(st);
    await UI.fade('out', 220, '#0b0a0e');
    UI.push(st.modal);
    V.audio.ambience(def.ambience || 'cave');
    render();
    await UI.fade('in', 260);
    log(def.intro || (def.name + '在前方。'), 'sys');
    if (def.tutorial && !Gm.s.seen['tut:' + def.tutorial]) await V.game.showTutorial(def.tutorial);
    await say(ev('start'));
    // ---- 回合迴圈：玩家指令 → 結算 → 對象行動 → 特殊規則 → 下一回合 ----
    while (!st.result) {
      st.turn++; st.guard = false; st.mis = false;
      await say(ev('turn', st.turn));
      pickIntent();
      render();
      var cmd = await prompt();
      st.lastCmd = cmd.cmd;
      await resolve(cmd);
      if (!st.result) await creatureAct();
      if (!st.result) await specialRules();
      if (!st.result) await endRound();
    }
    var result = st.result;
    await say(ev(result));
    await finish(result);
    await UI.fade('out', 220, '#0b0a0e');
    UI.pop(st.modal);
    B.st = null;
    if (V.field.map) V.audio.ambience(V.field.map.def.ambience || 'village');
    await UI.fade('in', 260);
    if (result === 'evacuated' && !opts.noEvacWarp) await Gm.evacuate('體力耗盡，再撐下去會出事。');
    if (result === 'retreated' && def.retreatWarp && V.field.map) {
      var w = def.retreatWarp; await V.field.warp(w.map, w.x, w.y, w.dir || 'down');
    }
    return result;
  };

  // 遭遇事件台詞：events.start／turn{n}／reveal{n}／allRevealed／locked／stabilized…（見 ENGINE.md）
  function ev(name, key) {
    var e = B.st.def.events || {};
    var v = e[name];
    if (v == null) return null;
    if (key != null) { if (Array.isArray(v) || typeof v !== 'object') return null; return v[key] || null; }
    return v;
  }
  async function say(lines) {
    if (!lines) return;
    if (lines.lines || lines.actions) {
      if (lines.lines) await V.dialogue.lines(lines.lines);
      if (lines.actions) await Gm.run(lines.actions);
    } else await V.dialogue.lines(lines);
    render();
  }

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
      '<div class="b-seqwrap panel"><div class="b-seqhead"><span>味序</span><small>依到達順序由左至右；處置只作用在「最前」的味符</small></div>' +
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
      onMove: function (it) { st.q('.b-cmdtitle').textContent = it && it.hint ? it.hint : (st.menuTitle || ''); },
      onDisabled: function (it) { if (it && it.hint) log(it.hint, 'warn'); }
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
    if (st.result === 'stabilized' || st.result === 'read') { spec = U.clone(spec); spec.wild = 0; spec.vein = '#73D6D0'; if (spec.calmBody) spec.body = spec.calmBody; }
    ctx.drawImage(S.creature(spec, 48, st.frame), 0, 0);
  }
  function moodText(st) {
    var moods = st.def.moods || [];
    for (var i = 0; i < moods.length; i++) if (st.imbalance >= (moods[i].gte || 0)) return moods[i].text;
    if (st.def.endOnReveal) return st.def.desc || '它不是病人，是一句還沒唸出來的話。';
    return st.imbalance >= 70 ? '周圍的空氣又緊又燙，牠隨時會失控。' : st.imbalance >= 35 ? '牠繃著，但還聽得進水聲。' : '牠的呼吸慢了下來。';
  }
  function imbWord(v) { return v >= 85 ? '瀕臨失穩' : v >= 60 ? '劇烈' : v >= 30 ? '不穩' : v > 0 ? '趨緩' : '平穩'; }

  function render() {
    var st = B.st; if (!st) return;
    var s = Gm.s, R = st.R;
    st.q('.b-name').textContent = st.def.name;
    st.q('.b-mood').textContent = moodText(st);
    st.q('.bar.imb i').style.width = U.clamp(st.imbalance, 0, 100) + '%';
    st.q('.b-imbtxt').textContent = imbWord(st.imbalance) + ' ' + Math.round(st.imbalance);
    st.q('.b-meter').hidden = !!st.def.endOnReveal;
    var tell = st.clamp ? '封脈夾已架上。下一回合「收口」才能封死；換別的指令會鬆開夾子。' : (st.intent && st.intent.tell);
    st.q('.b-intent').innerHTML = '<b>徵兆</b>' + U.esc(tell || (st.def.endOnReveal ? '安靜。只需要讀。' : '看不出牠下一步要做什麼。'));
    var html = '';
    st.seq.forEach(function (g, i) {
      var cls = (i === 0 ? 'front ' : '') + (g.known ? 'known ' : 'unknown ') + (g.fresh ? 'fresh ' : '') + (g.known && !g.reliable ? 'shaky ' : '');
      var note = g.known && !g.reliable ? '可能失真' : '';
      html += '<div class="b-slot">' + (i === 0 ? '<span class="b-front">最前</span>' : '<span class="b-front ghost">' + (i + 1) + '</span>') +
        UI.glyph(g.known, cls, note) + '</div>';
      g.fresh = false;
    });
    if (!st.seq.length) html = '<div class="b-clear">味序已清空</div>';
    st.q('.b-seq').innerHTML = html;
    var pct = Gm.loadPct(), notes = [];
    if (st.residue) notes.push('<span class="chip warn">味覺殘留：「' + st.residue + '」黏在舌根（防護或沖洗液可清除）</span>');
    if (pct >= 100) notes.push('<span class="chip bad">感官滿載：這回合無法嚐味</span>');
    else if (pct >= R.noisyAt) notes.push('<span class="chip warn">負荷 ≥ ' + R.noisyAt + '%：讀值可能失真</span>');
    if (st.sweetHurt) notes.push('<span class="chip bad">誤治過甜流 ×' + st.sweetHurt + '</span>');
    st.q('.b-seqnote').innerHTML = notes.join('');
    st.q('.b-player').innerHTML =
      '<div class="bp-name">' + U.esc(s.partyName) + '<small>Lv ' + s.level + '</small>' + (st.guard ? '<span class="chip ok">防護中</span>' : '') + '</div>' +
      '<div class="bp-row"><span>體力</span>' + UI.bar('hp' + (s.stamina / Gm.maxStamina() < 0.3 ? ' low' : ''), s.stamina, Gm.maxStamina()) + '<em>' + Math.ceil(s.stamina) + '/' + Gm.maxStamina() + '</em></div>' +
      '<div class="bp-row"><span>負荷</span>' + UI.bar('load' + (pct >= R.noisyAt ? ' hot' : ''), s.load, Gm.maxLoad(), '<u style="left:' + R.noisyAt + '%"></u>') + '<em>' + Math.round(s.load) + '/' + Gm.maxLoad() + '</em></div>';
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
  // 偵錯／測試用：直接送出指令 { cmd:'taste', low:false } 等
  B.exec = function (cmd) { if (B.st && B.st.resolveCmd) { submit(cmd); return true; } return false; };

  function medicines() {
    return Object.keys(Gm.s.items).filter(function (id) { var it = V.data.items[id]; return it && it.treats && Gm.count(id) > 0; });
  }
  function usables() {
    return Object.keys(Gm.s.items).filter(function (id) { var it = V.data.items[id]; return it && it.use && it.usable !== 'field' && Gm.count(id) > 0; });
  }
  function locked(cmd) { return U.toArray(B.st.def.locked).indexOf(cmd) >= 0; }
  B.available = function () {
    var st = B.st, def = st.def, out = [];
    out.push('taste', 'treat');
    if (B.can('clear')) out.push('clear');
    out.push('guard');
    if (B.can('rinse')) out.push('rinse');
    out.push('item');
    if (!def.noIsolate && B.can('isolate')) out.push('isolate');
    if (!def.noRetreat) out.push('retreat');
    return out;
  };
  function showMain() {
    var st = B.st, s = Gm.s, R = st.R;
    st.menu = 'main';
    st.el.classList.remove('busy');
    if (st.clamp) {
      st.menuTitle = '第 ' + st.turn + ' 回合　封脈夾已架上';
      st.list.opts.cols = 1;
      st.list.set([
        { id: 'isolate2', label: '收口', cls: 'danger', hint: '封死這段管段，結束遭遇。失去樣本。' },
        { id: 'unclamp', label: '鬆開夾子', hint: '放棄隔離，回到一般指令（本回合仍算一個行動）。' }]);
      st.q('.b-cmdtitle').textContent = st.menuTitle;
      return;
    }
    st.menuTitle = '第 ' + st.turn + ' 回合　要怎麼做？';
    var full = Gm.loadPct() >= 100;
    var names = { taste: '嚐味', treat: '處置', clear: '清淤', guard: '防護', rinse: '回沖', item: '物品', isolate: '隔離／切除', retreat: '撤離' };
    var items = B.available().map(function (c) {
      var it = { id: c, label: names[c] };
      switch (c) {
        case 'taste': it.hint = full ? '感官滿載，這回合無法嚐味。' : '取樣稀釋，讀出味序。'; it.disabled = full; break;
        case 'treat': it.hint = medicines().length ? '對最前面的味符用藥。對症則消除；不對症是誤治。' : '手邊沒有處置藥。到味診台調配。'; it.disabled = !medicines().length && !locked('treat'); break;
        case 'clear': it.hint = '徒手清除汲蟲淤堵（只對「腥」）。體力 −' + R.clearCost + '。'; it.disabled = s.stamina <= R.clearCost && !locked('clear'); break;
        case 'guard': it.hint = '封掌套：本回合所受體力傷害與感官灌入減半，並清除味覺殘留。'; break;
        case 'rinse': it.hint = st.rinsed ? '每場遭遇只能回沖一次。' : '不耗物品，感官負荷 −' + R.rinseLoad + '（每場一次）。'; it.disabled = st.rinsed; break;
        case 'item': it.hint = usables().length ? '使用消耗品。' : '沒有可用的消耗品。'; it.disabled = !usables().length; break;
        case 'isolate': it.cls = 'danger'; it.hint = rankOf(st.def) === 'normal' ? '封脈夾：立刻結束。失去樣本，連通度下降。' : '封脈夾：需要連續兩回合（架夾→收口）。'; break;
        case 'retreat': it.hint = '退開，改天再來。對象回到原位，味序與失衡重置。'; break;
      }
      if (locked(c)) { it.cls = (it.cls || '') + ' dim'; it.disabled = false; it.locked = true; }
      return it;
    });
    st.list.opts.cols = 2;
    st.list.set(items);
    st.q('.b-cmdtitle').textContent = st.menuTitle;
  }
  function showTaste() {
    var st = B.st, R = st.R;
    st.menu = 'taste'; st.menuTitle = '嚐味：選擇稀釋度';
    var lowN = passiveMax('tasteLow', 0), canLow = B.can('tasteLow') && lowN > 0;
    st.list.opts.cols = 1;
    st.list.set([
      { id: 'taste:high', label: '高稀釋', sub: '揭示 1 個未讀的味符・負荷 +' + R.tasteHighLoad, hint: '穩，但一次只讀一個。' },
      { id: 'taste:low', label: '低稀釋', disabled: !canLow, sub: canLow ? '揭示 ' + lowN + ' 個・負荷 +' + R.tasteLowLoad + '・可能留下味覺殘留' : '尚未學會（等級 2「一口兩讀」）', hint: canLow ? '讀得多，代價是舌頭。' : '要先學會「一口兩讀」。' },
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
    if (it.locked) {
      st.menu = 'busy';
      await say(ev('locked') || [st.def.lockedText || '現在不是做這件事的時候。']);
      return showMain();
    }
    if (id === 'back') return showMain();
    if (id === 'taste') return showTaste();
    if (id === 'treat') return showTreat();
    if (id === 'item') return showItems();
    if (id === 'isolate') {
      st.menu = 'busy';
      var two = rankOf(st.def) !== 'normal';
      var ok = await UI.confirm((st.def.isolateConfirm || '隔離會封死這段接口：對象不再擴散，但妳拿不到樣本，這一帶的連通度會下降。這個決定收不回來。') + (two ? '（需要連續兩回合：架夾→收口）' : ''), two ? '架夾' : '封住', '再想想');
      if (ok) return submit({ cmd: 'isolate' });
      return showMain();
    }
    if (id === 'isolate2') return submit({ cmd: 'isolate' });
    if (id === 'unclamp') return submit({ cmd: 'unclamp' });
    if (id === 'retreat') {
      st.menu = 'busy';
      var ok2 = await UI.confirm('要先退開嗎？對象會留在原地，味序與失衡重置。', '撤離', '留下');
      if (ok2) return submit({ cmd: 'retreat' });
      return showMain();
    }
    if (id === 'clear' || id === 'guard' || id === 'rinse') return submit({ cmd: id });
    var p = id.split(':');
    if (p[0] === 'taste') return submit({ cmd: 'taste', low: p[1] === 'low' });
    if (p[0] === 'treat') return submit({ cmd: 'treat', item: p[1] });
    if (p[0] === 'use') return submit({ cmd: 'use', item: p[1] });
  }

  B.help = function () {
    var meds = {};
    Object.keys(V.data.items).forEach(function (id) { var it = V.data.items[id]; if (it.treats) meds[it.treats] = it.name; });
    var rows = V.GLYPH_ORDER.map(function (g) {
      var d = V.GLYPHS[g];
      return '<tr><td>' + UI.glyph(g, 'known small') + '</td><td>' + d.desc + '</td><td><b>' + (g === '腥' ? '清淤' : g === '甜' ? '不處置' : (meds[g] || d.treat)) + '</b></td></tr>';
    }).join('');
    return UI.pages('味符對照', [{ title: '味符・病理・對症', html: '<table class="glyph-table"><tr><th>味符</th><th>代表</th><th>對症</th></tr>' + rows + '</table><p class="fine">甜是健康的糖流：排到最前面時不要處置，回合結束它會自己流走。</p>' }], { skippable: true });
  };

  // ======================= 指令結算 =======================
  async function resolve(cmd) {
    var st = B.st, s = Gm.s, R = st.R;
    if (cmd.cmd !== 'isolate' && st.clamp) {
      st.clamp = 0; log('珂潾鬆開了封脈夾。');
      if (cmd.cmd === 'unclamp') { await pause(350); render(); return; }
    }
    switch (cmd.cmd) {
      case 'taste': await doTaste(cmd.low); break;
      case 'treat': await doTreat(cmd.item); break;
      case 'clear': await doClear(); break;
      case 'guard': {
        st.guard = true; V.audio.play('guard');
        var gl = passiveSum('guardLoad');
        if (st.residue) { st.residue = null; log('掌套收攏，舌根殘留的味道也散了。'); }
        if (gl) Gm.addLoad(-gl);
        log('珂潾封緊掌套，收攏感官。' + (gl ? '（負荷 −' + gl + '）' : '')); fx('fx-guard', 500); await pause(450); break;
      }
      case 'rinse':
        st.rinsed = true; Gm.addLoad(-R.rinseLoad); st.residue = null; V.audio.play('splash'); fx('fx-guard', 500);
        log('珂潾含一口淨水回沖，把舌面洗乾淨（負荷 −' + R.rinseLoad + '）。', 'good'); await pause(450); break;
      case 'use': {
        var it = V.data.items[cmd.item];
        Gm.take(cmd.item, 1, true);
        var txt = Gm.useItem(it);
        if (it.use && it.use.clearResidue) st.residue = null;
        V.audio.play('heal'); log('使用了' + it.name + '。' + (it.use.text || txt)); await pause(450);
        break;
      }
      case 'isolate': {
        var two = rankOf(st.def) !== 'normal';
        if (two && !st.clamp) {
          st.clamp = 1; V.audio.play('isolate'); fx('fx-shuffle', 600);
          log(st.def.clampText || '珂潾把封脈夾架上接口。牠察覺了，整個身體繃緊。', 'warn');
          await pause(700); break;
        }
        st.clamp = 0;
        V.audio.play('isolate'); fx('fx-isolate', 1200);
        log((st.def.isolate && st.def.isolate.text) || '珂潾夾住接口，封死管段。訊號一截一截地暗下去。', 'bad');
        await pause(1200); st.result = 'isolated'; break;
      }
      case 'retreat':
        log('珂潾一步一步退開，沒有轉身。'); await pause(500); st.result = 'retreated'; break;
    }
    if (!st.result) checkEnd();
    render();
  }
  function checkEnd() {
    var st = B.st, s = Gm.s;
    if (st.result) return;
    if (s.stamina <= 0) { if (st.def.noEvac) s.stamina = 1; else { st.result = 'evacuated'; return; } }
    if (st.def.endOnReveal) {
      if (st.seq.length && st.seq.every(function (g) { return g.known && g.reliable; })) st.result = 'read';
      return;
    }
    if (!st.seq.length) { st.result = 'stabilized'; return; }
    if (st.imbalance >= 100) { st.imbalance = 100; st.result = 'collapsed'; }
  }

  // 尚未揭示＝還沒讀過，或上次讀值不可靠
  function unreadIdx() {
    var out = [];
    B.st.seq.forEach(function (g, i) { if (!g.known || !g.reliable) out.push(i); });
    return out;
  }
  async function doTaste(low) {
    var st = B.st, R = st.R;
    var n = low ? passiveMax('tasteLow', 2) : 1;
    var idx = unreadIdx().slice(0, n);
    var noisy = Gm.loadPct() >= R.noisyAt;
    var residue = st.residue; st.residue = null;
    log(low ? '珂潾讓低稀釋的樣本滑過整片舌面。' : '珂潾把樣本稀釋，點在舌尖。');
    await pause(250);
    if (!idx.length) {
      log('味序裡的每一味都已經讀清楚了。', 'read');
    } else {
      var fakeAt = noisy && U.rand() < R.falseChance ? Math.floor(U.rand() * idx.length) : -1;
      var read = [];
      for (var k = 0; k < idx.length; k++) {
        var g = st.seq[idx[k]], shown = g.g, reliable = true;
        if (k === 0 && residue) { shown = residue; reliable = false; }
        if (noisy) reliable = false;
        if (k === fakeAt) shown = otherGlyph(g.g);
        g.known = shown; g.reliable = reliable; g.fresh = true;
        read.push(shown + (reliable ? '' : '？'));
        V.audio.play('taste', { glyph: shown });
        render(); await pause(420);
      }
      log('讀出：' + read.join(' → ') + (noisy ? '　（舌頭發麻，讀值在晃）' : residue ? '　（上一口的「' + residue + '」還黏在舌根）' : ''), 'read');
      if (low && U.rand() < R.residueChance) {
        st.residue = st.seq[idx[idx.length - 1]].known;
        log('濃度太高——「' + st.residue + '」味留在舌根散不掉。', 'warn');
      }
      var before = st.revealed;
      st.revealed += idx.length;
      for (var r = before + 1; r <= st.revealed; r++) await say(ev('reveal', r));
      if (st.seq.every(function (x) { return x.known; })) { if (!st.said.all) { st.said.all = true; await say(ev('allRevealed')); } }
    }
    Gm.addLoad(low ? R.tasteLowLoad : R.tasteHighLoad);
    await pause(200);
  }

  function misTreat(text) {
    var st = B.st, R = st.R;
    var inc = st.def.misImbalance != null ? st.def.misImbalance : R.misImbalance;
    st.imbalance = Math.min(100, st.imbalance + inc);
    st.mis = true;
    var front = st.seq[0];
    if (front) { front.known = null; front.reliable = true; }
    V.audio.play('backfire'); fx('fx-bad', 700);
    log(text + '（誤治：失衡 +' + inc + '，這回合牠的反應會更猛）', 'bad');
  }
  async function doTreat(itemId) {
    var st = B.st, R = st.R, it = V.data.items[itemId];
    Gm.take(itemId, 1, true);
    var front = st.seq[0];
    drop((V.GLYPHS[it.treats] || {}).color || '#73D6D0');
    log('珂潾滴下' + it.name + '。'); V.audio.play('treat');
    await pause(650);
    if (!front) return;
    if (front.g === '甜') {
      st.imbalance = Math.min(100, st.imbalance + R.sweetImbalance); st.sweetHurt++; st.mis = true;
      front.known = '甜'; front.reliable = true; front.fresh = true;
      V.audio.play('backfire'); fx('fx-bad', 700);
      log('那是健康的糖流——藥把它也中和了。對象痛得整個縮起來。（失衡 +' + R.sweetImbalance + '，樣本會少一份）', 'bad');
    } else if (front.g === it.treats) {
      st.seq.shift(); st.imbalance = Math.max(0, st.imbalance - (st.def.treatImbalance != null ? st.def.treatImbalance : R.treatImbalance));
      fx('fx-good', 700);
      log(it.treatText || ('對症。「' + front.g + '」味散開了。'), 'good');
      await say(ev('cleared'));
    } else {
      misTreat('不對症！藥劑激起反噬。最前面的不是「' + it.treats + '」。');
    }
    await pause(500);
  }

  async function doClear() {
    var st = B.st, s = Gm.s, R = st.R;
    s.stamina = Math.max(0, s.stamina - R.clearCost);
    var front = st.seq[0];
    log('珂潾把手伸進接口，摸索淤堵（體力 −' + R.clearCost + '）。'); V.audio.play('splash');
    await pause(550);
    if (!front) return;
    if (front.g === '腥') {
      st.seq.shift(); st.imbalance = Math.max(0, st.imbalance - (st.def.treatImbalance != null ? st.def.treatImbalance : R.treatImbalance));
      fx('fx-good', 700); V.audio.play('treat');
      log('掏出一團已經不動的汲蟲。管路重新吸了一口氣，「腥」味退了。', 'good');
      await say(ev('cleared'));
    } else if (front.g === '甜') {
      st.imbalance = Math.min(100, st.imbalance + R.sweetImbalance); st.sweetHurt++; st.mis = true;
      front.known = '甜'; front.reliable = true;
      V.audio.play('backfire'); fx('fx-bad', 700);
      log('那裡流的是健康的糖。手一攪，整股甜流都亂了。（失衡 +' + R.sweetImbalance + '）', 'bad');
    } else {
      misTreat('這裡沒有淤堵可清，最前面的不是「腥」。');
    }
    await pause(400);
  }

  // ======================= 對象行動 =======================
  function behOk(b, st) {
    var w = b.when; if (!w) return true;
    if (w.imbalanceGte != null && st.imbalance < w.imbalanceGte) return false;
    if (w.imbalanceLt != null && st.imbalance >= w.imbalanceLt) return false;
    if (w.front && U.toArray(w.front).indexOf(st.seq[0] ? st.seq[0].g : '') < 0) return false;
    if (w.turnGte != null && st.turn < w.turnGte) return false;
    if (w.turnLt != null && st.turn >= w.turnLt) return false;
    if (w.every && st.turn % w.every !== 0) return false;
    if (w.lenGte != null && st.seq.length < w.lenGte) return false;
    if (w.lenLt != null && st.seq.length >= w.lenLt) return false;
    if (w.clamped && !st.clamp) return false;
    if (w.once && st.used[b.id || b.type]) return false;
    return true;
  }
  function usable(b, st) {
    if (!behOk(b, st)) return false;
    if (b.type === 'grow' && st.seq.length >= (b.max || 7)) return false;
    if (b.type === 'reorder' && st.seq.length < 2) return false;
    return true;
  }
  function pickIntent() {
    var st = B.st;
    var list = (st.def.behaviors || []).filter(function (b) { return usable(b, st); });
    st.intent = list.length ? U.weighted(list) : null;
  }
  async function creatureAct() {
    var st = B.st, b = st.intent;
    if (!b) return;
    await applyBehavior(b, true);
  }
  async function specialRules() {
    var st = B.st;
    var rules = st.def.rules || [];
    for (var i = 0; i < rules.length && !st.result; i++) {
      var r = rules[i];
      if (!usable(r, st)) continue;
      if (r.chance != null && U.rand() >= r.chance) continue;
      await applyBehavior(r, false);
    }
  }
  async function applyBehavior(b, isAction) {
    var st = B.st, s = Gm.s, R = st.R;
    st.used[b.id || b.type] = true;
    var k = st.mis ? R.misDamage : 1;
    function cut(v) { v = Math.round(v * k); return st.guard ? Math.floor(v / 2) : v; }
    switch (b.type) {
      case 'attack': {
        var dmg = cut(U.range(b.power != null ? b.power : [3, 5]));
        s.stamina = Math.max(0, s.stamina - dmg);
        V.audio.play('hit'); fx('fx-hurt', 500);
        log((b.text || '對象猛然抽動。') + '（體力 −' + dmg + (st.guard ? '，防護擋下一半' : '') + '）', 'hurt');
        break;
      }
      case 'load': {
        var ld = cut(U.range(b.power != null ? b.power : [4, 6]));
        Gm.addLoad(ld);
        V.audio.play('hiss'); fx('fx-load', 500);
        log((b.text || '一股強訊號灌進感官。') + '（感官負荷 +' + ld + (st.guard ? '，防護擋下一半' : '') + '）', 'hurt');
        break;
      }
      case 'drain': {
        var p = b.power || {}, d1 = cut(U.range(p.stamina != null ? p.stamina : 2)), d2 = cut(U.range(p.load != null ? p.load : 3));
        s.stamina = Math.max(0, s.stamina - d1); Gm.addLoad(d2);
        V.audio.play('hit'); fx('fx-hurt', 500);
        log((b.text || '熱與訊號一起撲上來。') + '（體力 −' + d1 + '・負荷 +' + d2 + '）', 'hurt');
        break;
      }
      case 'reorder': {
        var before = st.seq.map(function (g) { return g.g; }).join('');
        for (var t = 0; t < 8; t++) { U.shuffle(st.seq); if (st.seq.map(function (g) { return g.g; }).join('') !== before) break; }
        st.seq.forEach(function (g) { g.known = null; g.reliable = true; });
        st.revealed = 0;
        V.audio.play('warp'); fx('fx-shuffle', 700);
        log((b.text || '對象體內的流向亂了。') + '味序重排——先前的讀值全部作廢。', 'warn');
        break;
      }
      case 'grow': {
        var g = b.glyph || (b.pool ? b.pool[Math.floor(U.rand() * b.pool.length)] : '苦');
        var pos = b.at === 'front' ? 0 : (b.at === 'end' || b.at == null ? st.seq.length : U.randInt(Math.min(1, st.seq.length), st.seq.length));
        st.seq.splice(pos, 0, { g: g, known: null, reliable: true, fresh: true });
        if (b.imbalance) st.imbalance = Math.min(100, st.imbalance + b.imbalance);
        V.audio.play('rumble'); fx('fx-shuffle', 700);
        log((b.text || '病灶擴散。') + '味序裡多了一個還沒讀過的味符。', 'warn');
        break;
      }
      case 'surge':
        st.imbalance = Math.min(100, st.imbalance + U.range(b.power != null ? b.power : 8));
        V.audio.play('rumble'); log(b.text || '對象的失衡加劇了。', 'warn'); break;
      case 'settle':
        st.imbalance = Math.max(0, st.imbalance - U.range(b.power != null ? b.power : 5));
        log(b.text || '對象稍微鬆了下來。'); break;
      default:
        if (b.text) log(b.text);
    }
    if (b.say && !st.said['b:' + (b.id || b.type)]) { st.said['b:' + (b.id || b.type)] = true; if (b.shake) V.field.shake(300, 3); await say(b.say); }
    await pause(isAction ? 600 : 450);
    checkEnd();
    render();
  }

  async function endRound() {
    var st = B.st;
    // 甜＝健康糖流：最前面是甜、且本回合沒有對它處置或清淤 → 自動流走
    var touched = st.lastCmd === 'treat' || st.lastCmd === 'clear';
    if (st.seq.length && st.seq[0].g === '甜' && !touched) {
      st.seq.shift();
      V.audio.play('chime'); fx('fx-good', 600);
      log('「甜」是健康的糖流。珂潾收手，讓它自己流了過去。', 'good');
      await say(ev('sweetPassed'));
      await pause(450);
    }
    checkEnd();
  }

  // ======================= 結束 =======================
  function applyBlock(blk, defaults) {
    blk = blk || {};
    Object.keys(blk.flags || {}).forEach(function (f) { Gm.setFlag(f, blk.flags[f]); });
    var dims = blk.dims || defaults.dims || {};
    Object.keys(dims).forEach(function (d) { Gm.addDim(d, dims[d]); });
    var st = B.st;
    if (blk.conn) Object.keys(blk.conn).forEach(function (z) { Gm.addConn(z, blk.conn[z]); });
    else if (defaults.conn && st.zone) Gm.addConn(st.zone, defaults.conn);
  }
  async function finish(result) {
    var st = B.st, s = Gm.s, def = st.def, R = st.R, rw = def.rewards || {};
    var title, lines = [], cls = result, exp = 0, post = null;
    if (result === 'stabilized' || result === 'read') {
      if (result === 'stabilized') s.stats.stabilized++;
      drawCreature(); st.el.classList.add('calm'); V.audio.play('heal');
      title = result === 'read' ? '讀完' : '穩定';
      lines.push(result === 'read' ? (def.readText || '每一味都讀清楚了。') : (def.stableText || '味序清空了。牠的呼吸重新跟上水聲。'));
      exp = rw.exp != null ? rw.exp : (result === 'read' ? 0 : R.stableExp);
      var pen = st.sweetHurt;
      Object.keys(rw.items || {}).forEach(function (id) {
        var n = rw.items[id];
        if (pen > 0) { var cutN = Math.min(n, pen); n -= cutN; pen -= cutN; }
        if (n > 0) { Gm.give(id, n, true); lines.push('取得 ' + V.data.items[id].name + ' ×' + n); }
      });
      if (st.sweetHurt) lines.push('誤治過甜流，樣本少了 ' + st.sweetHurt + ' 份。');
      applyBlock(rw, result === 'read' ? {} : { dims: { bo: 1 }, conn: R.stableConn });
      post = rw.actions;
    } else if (result === 'isolated') {
      s.stats.isolated++;
      title = '已隔離';
      var iso = def.isolate || {};
      lines.push(iso.resultText || '管段封死了。這裡不會再擴散，也不會再回答。');
      exp = iso.exp != null ? iso.exp : Math.floor((rw.exp != null ? rw.exp : R.stableExp) / 2);
      lines.push('沒有取得樣本。這一帶的連通度下降了。');
      applyBlock(iso, { dims: { fen: 1 }, conn: R.isolateConn });
      post = iso.actions;
    } else if (result === 'collapsed') {
      s.stats.collapsed = (s.stats.collapsed || 0) + 1;
      title = '失穩';
      var co = def.collapse || {};
      lines.push(co.text || '失衡衝破了頂。牠縮起身子，逃散進管路深處。沒有樣本留下。');
      exp = Math.floor((rw.exp != null ? rw.exp : R.stableExp) * R.collapseExp);
      applyBlock(co, { conn: R.collapseConn });
      post = co.actions;
    } else if (result === 'retreated') {
      s.stats.retreated++;
      title = '撤離'; lines.push('珂潾退到安全的距離。對象還在原地。');
    } else {
      title = '力竭'; lines.push('手在抖，舌頭也嚐不出東西了。不能再撐。');
    }
    if (exp) lines.push('見識 +' + exp);
    var box = st.q('.b-result');
    box.hidden = false;
    box.innerHTML = '<div class="panel b-resbox ' + cls + '"><h2>' + title + '</h2>' + lines.map(function (l) { return '<p>' + U.esc(l) + '</p>'; }).join('') +
      '<button type="button" class="btn" data-id="result-ok">繼續</button></div>';
    await new Promise(function (res) {
      var m = { kind: 'result', update: function () { if (V.input.pressed('confirm') || V.input.pressed('cancel')) { UI.pop(m); res(); } } };
      box.querySelector('button').onclick = function () { V.input.press('confirm'); };
      UI.push(m);
    });
    if (exp) Gm.addExp(exp);
    if (post) await Gm.run(post);
  }
})();
