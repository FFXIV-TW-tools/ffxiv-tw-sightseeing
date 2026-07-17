// validate-availability.mjs — 守 2026-07-17 修的五個「可進行時間」bug。用法：node tools/validate-availability.mjs
//
// 徵狀（南林區「巴斯卡隆酒家」#044）：天氣列顯示「打雷 · 下一次 現在（需 雷雨）」、
// 狀態「目前不可進行」、卻沒有「下次可進行」那行。根因各自獨立：
//   1. findNextWeather 掃描窗只有 100 週期（≈38.9 小時）→ 實測最大間隔 185（天氣）／447（天氣∩時間）→ 回 null
//   2. wait() 用 Number(ms) 收斂 → Number(null)===0 → 「未知」被印成「現在」
//   3. availability() 的 `next ? next.msUntil : 0` 把「找不到」當 0（＝不用等）→ nextMs=0 → 下游隱藏整行
//   4. nextMs 用 Math.max(時間等待, 天氣等待) → 不保證兩閘同時成立（實測 80/80 條目、67.5% 給錯時間）
//   5. getTimeUntilRange 用閉區間 `<= endTime` → 窗尾多開 1 ET 分鐘（≈2.9 秒現實）；codex 對抗審抓到
import fs from 'fs';

// 最小 DOM stub：app.js 匯入時會跑 init()，querySelector 回 null 即在 `if (!ui.grid) return` 早退
globalThis.window = globalThis;
globalThis.document = { readyState: 'complete', querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} };

// 資料檔掛 window.SIGHTSEEING_*，必須在 app.js 之前載入（app.js 頂層就讀）
new Function('window', fs.readFileSync('data/sightseeing-data.js', 'utf8'))(globalThis);
new Function('window', fs.readFileSync('data/zones.js', 'utf8'))(globalThis);

const { wait, availability, timeValue: TV, formatMMSS } = await import('../modules/app.js');
const W = globalThis.Weather;
const ET = globalThis.EorzeaTime;
const ZONES = globalThis.SIGHTSEEING_ZONES;
const DATA = globalThis.SIGHTSEEING_DATA;

const errs = [];
const check = (cond, msg) => { if (!cond) errs.push(msg); };

// ── Bug 5：時間窗是半開 [start, end)，窗尾整分不得算進窗內 ─────────────────
// 遊戲窗「05–08」＝05:00–07:59，08:00 即關窗。原本用 `<= endTime` 多開 1 ET 分鐘（≈2.9 秒現實）。
{
  // ET 第 day 天的 hh:mm 對應的現實 timestamp（1 ET 日＝4200 秒現實、1 ET 分＝4200/1440 秒）
  const etAt = (day, h, m) => Math.round(day * 4200000 + (h * 60 + m) * (4200000 / 1440));
  const D = 1000;
  const cases = [
    [500, 800, 8, 0, false, '窗 05–08 在 ET 08:00 應已關窗'],
    [500, 800, 7, 59, true, '窗 05–08 在 ET 07:59 應仍開著'],
    [500, 800, 5, 0, true, '窗 05–08 在 ET 05:00 應開窗（窗首含）'],
    [1800, 500, 5, 0, false, '跨午夜窗 18–5 在 ET 05:00 應已關窗'],
    [1800, 500, 4, 59, true, '跨午夜窗 18–5 在 ET 04:59 應仍開著'],
    [1800, 500, 18, 0, true, '跨午夜窗 18–5 在 ET 18:00 應開窗（窗首含）'],
  ];
  for (const [s, e, h, m, want, msg] of cases) {
    const got = ET.getTimeUntilRange(s, e, etAt(D, h, m)).inRange;
    check(got === want, `${msg}，得到 inRange=${got}`);
  }
  // 關窗當下必須算得出「下一次開窗」的正數等待（半開改動不可讓等待歸零）
  const w = ET.getTimeUntilRange(500, 800, etAt(D, 8, 0));
  check(w.waitMs > 0, `窗 05–08 在 ET 08:00 應算出正數等待（下次 05:00），得到 ${w.waitMs}`);
}

// ── formatWaitTime / formatMMSS：同一類 Number/isNaN 收斂坑 + 長等待可讀性 ──
check(ET.formatWaitTime('') !== '現在', `formatWaitTime('') 不得為「現在」（isNaN('')===false 的坑），得到「${ET.formatWaitTime('')}」`);
check(ET.formatWaitTime(null) === '計算中...', `formatWaitTime(null) 應為「計算中...」，得到「${ET.formatWaitTime(null)}」`);
check(ET.formatWaitTime(5 * 86400000) === '5 天', `formatWaitTime(5天) 應為「5 天」，得到「${ET.formatWaitTime(5 * 86400000)}」`);
check(ET.formatWaitTime(86400000 + 3 * 3600000) === '1 天 3 小時', `formatWaitTime(1天3時) 應為「1 天 3 小時」，得到「${ET.formatWaitTime(86400000 + 3 * 3600000)}」`);
check(!ET.formatWaitTime(7 * 86400000).includes('24'), '長等待不得再顯示「> 24 小時」（分不出 25 小時與 7 天）');
check(formatMMSS(null) === '--:--', `formatMMSS(null) 應為「--:--」（不得因 Number(null)===0 印成 00:00），得到「${formatMMSS(null)}」`);

// ── Bug 2：wait() 不得把「未知」講成「現在」 ────────────────────────────────
// Number(null)===0、Number('')===0、Number(false)===0 —— 全都會逃過 Number.isFinite(Number(x)) 守門
for (const bad of [null, undefined, '', NaN, false, []]) {
  const got = wait(bad);
  check(got !== '現在', `wait(${JSON.stringify(bad)}) = 「${got}」—— 未知值不得顯示為「現在」`);
}
check(wait(0) === '現在', `wait(0) 應為「現在」，得到「${wait(0)}」`);
check(wait(null) === '計算中', `wait(null) 應為「計算中」，得到「${wait(null)}」`);
check(!['現在', '計算中'].includes(wait(60000)), `wait(60000) 應為時間字串，得到「${wait(60000)}」`);

// ── Bug 3：掃不到下一次天氣時，nextMs 必須是 null（未知），不可是 0（不用等）────
// 南林區天氣表無「終末」(Termination) → findNextWeather 永遠回 null，模擬掃不到的情境
{
  const z = { weatherZone: 'South Shroud', tc: '南林區' };
  const a = availability({ weathers: ['Termination'] }, z, Date.now());
  check(a.nextMs === null, `天氣掃不到時 nextMs 應為 null（未知），得到 ${JSON.stringify(a.nextMs)}`);
  check(a.available === false, `天氣掃不到時 available 應為 false，得到 ${a.available}`);
  check(a.weather.next === null, `天氣掃不到時 weather.next 應為 null，得到 ${JSON.stringify(a.weather.next)}`);
  // 這正是使用者看到的那行：wait(a.weather.next && a.weather.next.msUntil)
  const shown = wait(a.weather.next && a.weather.next.msUntil);
  check(shown !== '現在', `天氣列「下一次」不得顯示「現在」，得到「${shown}」`);
  // 下游判準（updateCard / updateNextHint 共用）：null 不得被當成「不用等」
  check(!(Number.isFinite(a.nextMs) && a.nextMs > 0), 'nextMs=null 不應被判為「有可顯示的等待時間」');
}
// 對照組：天氣找得到時 nextMs 必須是正數（確認上面的 null 不是全域壞掉）
{
  const z = { weatherZone: 'South Shroud', tc: '南林區' };
  const a = availability({ weathers: ['Thunderstorms'] }, z, Date.now());
  const ok = a.available === true || (Number.isFinite(a.nextMs) && a.nextMs > 0);
  check(ok, `南林區雷雨應可算出「現在可進行」或正數等待，得到 available=${a.available} nextMs=${JSON.stringify(a.nextMs)}`);
}

// ── Bug 1：掃描窗必須大到任何時刻都掃得到 ──────────────────────────────────
// 不點測「現在」（會隨時間漂），改驗性質：對每個 (天氣區, 目標天氣) 組合，
// 長時距內「連續兩次符合」的最大間隔必須 < SCAN_PERIODS —— 成立則任意起點的窗內必有一次。
const SCAN = W.SCAN_PERIODS;
check(Number.isFinite(SCAN) && SCAN > 0, `Weather.SCAN_PERIODS 應為正數，得到 ${SCAN}`);

const combos = new Map();
for (const exp of ['arr', 'hw', 'sb', 'shb', 'ew', 'dt'])
  for (const e of DATA[exp] || []) {
    const wanted = Array.isArray(e.weathers) ? e.weathers.filter(Boolean) : [];
    const zoneName = (ZONES[e.zoneKey] || {}).weatherZone;
    if (!wanted.length || !zoneName) continue;
    const key = zoneName + '|' + wanted.slice().sort().join(',');
    if (!combos.has(key)) combos.set(key, { zoneName, wanted, no: e.no, name: e.name });
  }
check(combos.size > 0, '找不到任何「有天氣條件」的條目 —— 測試本身失效');

const HORIZON = 60000;                       // ≈ 2.7 年，遠大於掃描窗
let worst = { gap: -1, key: '' };
for (const [key, c] of combos) {
  let last = -1, maxGap = 0, hits = 0;
  for (let i = 0; i < HORIZON; i++) {
    if (!c.wanted.includes(W.getWeatherForZone(c.zoneName, (i + 1) * 1400))) continue;
    hits++;
    if (last >= 0) maxGap = Math.max(maxGap, i - last);
    last = i;
  }
  check(hits > 0, `${key}：${HORIZON} 週期內一次都沒出現 —— 資料或天氣表有誤（#${c.no} ${c.name}）`);
  check(maxGap < SCAN, `${key}：最大間隔 ${maxGap} 週期 ≥ 掃描窗 ${SCAN} → findNextWeather 會回 null（#${c.no} ${c.name}）`);
  if (maxGap > worst.gap) worst = { gap: maxGap, key };
}

// 活體煙霧測：此刻每個有天氣條件的條目都必須算得出下一次（＝原 bug 的直接重現點）
let live = 0;
for (const c of combos.values()) if (!W.findNextWeather(c.zoneName, c.wanted)) {
  live++;
  errs.push(`findNextWeather(${c.zoneName}, ${c.wanted.join('/')}) 此刻回 null（#${c.no} ${c.name}）`);
}

// ── Bug 4：nextMs 指的那一刻，兩個閘必須「同時」成立 ────────────────────────
// 這是最強的守衛：往返驗算。若有人改回 Math.max(時間等待, 天氣等待)，這裡必紅
// —— ET 一天＝剛好 3 個天氣週期，max 找到的天氣週期有 2/3 機率碰不到時間窗。
const both = [];
for (const exp of ['arr', 'hw', 'sb', 'shb', 'ew', 'dt'])
  for (const e of DATA[exp] || []) {
    const z = ZONES[e.zoneKey] || {};
    const wanted = Array.isArray(e.weathers) ? e.weathers.filter(Boolean) : [];
    if (wanted.length && e.timeStart != null && e.timeEnd != null && z.weatherZone) both.push({ e, z });
  }
check(both.length > 0, '找不到任何「天氣＋時間」雙閘條目 —— 測試本身失效');

let rt = 0, lied = 0, nulls = 0;
const liars = new Set(), nullers = new Set();
for (let k = 0; k < 120; k++) {
  const now = Date.now() + Math.round(k * 1400 * 1000 * 0.37);   // 掃過各種天氣／時間相位
  for (const { e, z } of both) {
    const a = availability(e, z, now);
    if (a.available) continue;                                   // 此刻可進行＝不需要預測
    // ⚠ 覆蓋率斷言：沒有這兩條，往返驗算會 vacuous pass —— 全部回 null → rt=0 → lied=0 → 假綠。
    //    （codex 對抗審 2026-07-17 抓到：把 nextMs 全改 null、或把掃描窗降到 200，舊版測試照樣過）
    if (a.nextMs === null) { nulls++; nullers.add(`#${e.no} ${e.name}`); continue; }
    if (!(Number.isFinite(a.nextMs) && a.nextMs > 0)) continue;
    rt++;
    // 等到 nextMs 指的那一刻（+1s 越過邊界），必須真的可進行
    if (!availability(e, z, now + a.nextMs + 1000).available) { lied++; liars.add(`#${e.no} ${e.name}`); }
  }
}
check(nulls === 0, `雙閘條目有 ${nulls} 次算不出「下次可進行」（nextMs=null，${nullers.size} 個條目：${[...nullers].slice(0, 3).join('、')}…）` +
  ` —— 掃描窗不足或 nextBothOK 壞掉`);
check(rt > 0, '往返驗算 0 次有效預測 —— 測試 vacuous，實際上什麼都沒驗到');
check(lied === 0, `「下次可進行」往返驗算：${rt} 次抽驗有 ${lied} 次到點仍不可進行（${(lied * 100 / rt).toFixed(1)}%）` +
  `，受影響 ${liars.size}/${both.length} 條目 —— nextMs 必須掃「天氣∩時間」交集，不可用 Math.max`);

// ── 掃描窗餘裕：必須量「天氣∩時間」交集間隔（447），不是天氣單獨間隔（185）─────
// ⚠ 舊版只量了天氣單獨間隔 → 掃描窗降到 200（< 447）測試仍綠。交集才是 nextMs 的真實需求。
const iCombos = new Map();
for (const { e, z } of both) {
  const wanted = e.weathers.filter(Boolean);
  const key = z.weatherZone + '|' + wanted.slice().sort().join(',') + '|' + e.timeStart + '-' + e.timeEnd;
  if (!iCombos.has(key)) iCombos.set(key, { z: z.weatherZone, w: wanted, s: TV(e.timeStart), t: TV(e.timeEnd), no: e.no, name: e.name });
}
const PERIOD = ET.WEATHER_PERIOD_MS;
const I_HORIZON = 60000;                     // ≈ 2.7 年（與上方同一 horizon，數字才能跟鐵則/註解對得上）
let iWorst = { gap: -1, key: '' };
for (const [key, c] of iCombos) {
  let last = -1, maxGap = 0, hits = 0;
  for (let i = 0; i < I_HORIZON; i++) {
    const pStart = i * PERIOD;
    if (!c.w.includes(W.getWeatherForZone(c.z, Math.floor(pStart / 1000)))) continue;
    const r = ET.getTimeUntilRange(c.s, c.t, pStart);
    if (!((r.inRange ? pStart : pStart + r.waitMs) < pStart + PERIOD)) continue;  // 此天氣週期與時間窗無交集
    hits++;
    if (last >= 0) maxGap = Math.max(maxGap, i - last);
    last = i;
  }
  check(hits > 0, `${key}：${I_HORIZON} 週期內「天氣∩時間」從未同時成立 —— 該條目永遠不可進行（#${c.no} ${c.name}）`);
  check(maxGap < SCAN, `${key}：交集最大間隔 ${maxGap} 週期 ≥ 掃描窗 ${SCAN} → nextBothOK 會回 null（#${c.no} ${c.name}）`);
  if (maxGap > iWorst.gap) iWorst = { gap: maxGap, key: key + ` (#${c.no} ${c.name})` };
}

if (errs.length) { console.error('✗ 可進行時間驗證未過：'); errs.forEach(e => console.error('  ' + e)); process.exit(1); }
console.log(`✓ 可進行時間五 bug 迴歸守住`);
console.log(`  · wait()/formatWaitTime/formatMMSS 未知值不再顯示「現在」；天氣掃不到時 nextMs=null 不是 0`);
console.log(`  · 時間窗半開 [start, end)：窗尾整分已關窗（05–08 於 08:00、18–5 於 05:00）`);
console.log(`  · 掃描窗 ${SCAN} 對兩種需求都夠：天氣單獨最大間隔 ${worst.gap}（${(SCAN / (worst.gap || 1)).toFixed(1)}×，${worst.key}）`);
console.log(`    　　　　　　　　　　　　　天氣∩時間最大間隔 ${iWorst.gap}（${(SCAN / (iWorst.gap || 1)).toFixed(1)}×，${iWorst.key}）`);
console.log(`  · 活體：${combos.size} 個 (天氣區×天氣) 組合此刻皆算得出下一次天氣（null ${live} 筆）`);
console.log(`  · 往返驗算：${both.length} 個雙閘條目 × 120 相位、${rt} 次預測全部到點真的可進行（誤報 ${lied}、算不出 ${nulls}）`);
