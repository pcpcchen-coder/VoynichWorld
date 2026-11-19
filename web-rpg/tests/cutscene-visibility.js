/*
 * 過場可見性測試：過場把畫面淡出停住（整片黑幕或骨白）時，旁白、全幅圖與對話框必須畫在黑幕之上。
 * 這支測試是為了防止「開始新遊戲後畫面全黑」再發生——當時旁白被黑幕蓋住，遊戲其實在等玩家按確認。
 *
 * 用法：node tests/cutscene-visibility.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const URL = 'file://' + path.join(ROOT, 'index.html') + '?debug=1';

let failed = 0;
function check(ok, label, extra) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + label + (ok || !extra ? '' : '　→ ' + extra));
  if (!ok) failed++;
}

// 目前最上層的介面（旁白／對話）是否被黑幕蓋住
function probe() {
  const V = window.VELLORA, UI = V.ui;
  const top = UI.top();
  const fade = document.getElementById('fade');
  const over = document.getElementById('over-layer');
  const opacity = parseFloat(getComputedStyle(fade).opacity);
  const z = (el) => parseInt(getComputedStyle(el).zIndex, 10) || 0;
  const img = document.querySelector('.cs-image');
  const info = {
    kind: top ? top.kind : null,
    fadeOpacity: opacity,
    layerOrderOk: !!over && z(over) > z(fade),
    covered: false,
    imageCovered: false,
    text: ''
  };
  if (top && top.el) {
    const t = top.el.querySelector('.dlg-text, p') || top.el;
    info.text = (t.textContent || '').slice(0, 24);
    // 黑幕不透明時，只有放在過場層（黑幕之上）的元素看得見
    if (opacity > 0.5 && !(over && over.contains(top.el))) info.covered = true;
  }
  if (img && opacity > 0.5 && !(over && over.contains(img))) info.imageCovered = true;
  return info;
}

async function stepThrough(page, label, maxSteps, isDone) {
  let seen = 0, covered = [];
  for (let i = 0; i < maxSteps; i++) {
    await page.waitForTimeout(650);
    if (await page.evaluate(isDone)) break;
    const p = await page.evaluate(probe);
    if (p.kind === 'wait' || p.kind === 'dialogue') {
      seen++;
      if (p.covered || p.imageCovered) covered.push(p.text || '(圖)');
    }
    await page.keyboard.press('Enter');
  }
  check(seen > 0, label + '：有出現旁白或對話（' + seen + ' 頁）');
  check(covered.length === 0, label + '：沒有任何一頁被黑幕蓋住', covered.join(' / '));
  return seen;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  console.log('開場過場（真實按鍵）');
  await page.goto(URL);
  await page.waitForFunction(() => window.__vellora && window.VELLORA.scene === 'title');
  await page.keyboard.press('Enter'); // 新遊戲
  await page.waitForTimeout(1500);
  const first = await page.evaluate(probe);
  check(first.layerOrderOk, '過場層疊在黑幕之上');
  check(first.kind === 'wait' && !first.covered, '新遊戲後第一句旁白看得見', JSON.stringify(first));
  await page.screenshot({ path: path.join(OUT, 'cv-01-first-narration.png') });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1300);
  const second = await page.evaluate(probe);
  check(!second.covered && !second.imageCovered, '開場全幅圖與旁白看得見', JSON.stringify(second));
  await page.screenshot({ path: path.join(OUT, 'cv-02-opening-image.png') });
  await stepThrough(page, '開場其餘頁面', 40, () => !window.__vellora.busy());
  const fadeAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('fade')).opacity));
  check(fadeAfter < 0.05, '開場結束後黑幕已淡入、看得到地圖', 'opacity=' + fadeAfter);
  await page.screenshot({ path: path.join(OUT, 'cv-03-field.png') });

  // 其餘會在淡出停住時顯示旁白或對話的過場：直接播放並逐頁檢查
  const scenes = [
    ['cs.p0.m0_02_after', '回憶：滴管（骨白淡出）'],
    ['cs.p0.m0_16', '奧芮殘葉①全文與回憶'],
    ['cs.p0.m0_18_end', '章末旁白']
  ];
  for (const [id, label] of scenes) {
    console.log(label);
    await page.evaluate((cid) => { window.__csDone = false; window.VELLORA.cutscene.play(cid).then(() => { window.__csDone = true; }, () => { window.__csDone = true; }); }, id);
    await stepThrough(page, label, 80, () => window.__csDone || window.VELLORA.scene !== 'field');
    await page.screenshot({ path: path.join(OUT, 'cv-' + id.replace(/[^a-z0-9]+/gi, '-') + '.png') });
    if (await page.evaluate(() => window.VELLORA.scene !== 'field')) break; // 已進入章末畫面
    // 收掉殘留的升級／取得提示，並把黑幕復原，準備下一段
    for (let i = 0; i < 12 && await page.evaluate(() => window.__vellora.busy()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); }
    await page.evaluate(() => window.VELLORA.ui.fadeSet(false));
  }

  check(errors.length === 0, 'console 無錯誤', errors.join(' | '));
  await browser.close();
  console.log(failed ? '結果：' + failed + ' 項失敗' : '結果：過場可見性測試全部通過（截圖於 tests/out/cv-*.png）');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
