// validate-data.mjs — 驗 data/sightseeing-data.js 符合契約。用法：node tmp/validate-data.mjs
import fs from 'fs';

function loadGlobal(path, varName) {
  const src = fs.readFileSync(path, 'utf8');
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', src)(sandbox.window);
  return sandbox.window[varName];
}

const ZONES = loadGlobal('data/zones.js', 'SIGHTSEEING_ZONES');
const DATA = loadGlobal('data/sightseeing-data.js', 'SIGHTSEEING_DATA');

const EXPECT = { arr: 80, hw: 62, sb: 62, shb: 45, ew: 46, dt: 45 };
const WEATHERS = new Set(['Clear Skies','Fair Skies','Clouds','Fog','Wind','Gales','Rain','Showers','Thunder','Thunderstorms','Dust Storms','Heat Waves','Snow','Blizzards','Gloom']);
const errs = [];
let total = 0;

for (const exp of Object.keys(EXPECT)) {
  const arr = DATA[exp];
  if (!Array.isArray(arr)) { errs.push(`${exp}: 不是陣列`); continue; }
  if (arr.length !== EXPECT[exp]) errs.push(`${exp}: 筆數 ${arr.length} ≠ ${EXPECT[exp]}`);
  const seen = new Set();
  arr.forEach((e, i) => {
    total++;
    const tag = `${exp}#${e && e.no}`;
    if (typeof e.no !== 'number') errs.push(`${tag}: no 缺/非數`);
    if (seen.has(e.no)) errs.push(`${tag}: no 重複`); seen.add(e.no);
    if (!e.zoneKey || !ZONES[e.zoneKey]) errs.push(`${tag}: zoneKey 無效 (${e.zoneKey})`);
    if (typeof e.x !== 'number' || typeof e.y !== 'number') errs.push(`${tag}: x/y 非數`);
    if (e.x < 0 || e.x > 45 || e.y < 0 || e.y > 45) errs.push(`${tag}: x/y 超範圍 (${e.x},${e.y})`);
    if (!Array.isArray(e.weathers)) errs.push(`${tag}: weathers 非陣列`);
    else e.weathers.forEach(w => { if (!WEATHERS.has(w)) errs.push(`${tag}: 未知天氣 "${w}"`); });
    if (typeof e.emote !== 'string' || !e.emote) errs.push(`${tag}: emote 缺`);
    if (!('emoteCmd' in e)) errs.push(`${tag}: emoteCmd 缺`);
    // ARR 必有 weather + time；HW-DT weathers 應為空
    if (exp === 'arr') {
      if (e.weathers.length === 0) errs.push(`${tag}: ARR 應有 weather`);
      if (typeof e.timeStart !== 'number' || typeof e.timeEnd !== 'number') errs.push(`${tag}: ARR 應有 time`);
      if (!e.name) errs.push(`${tag}: ARR 應有 name`);
    } else {
      if (e.weathers.length !== 0) errs.push(`${tag}: ${exp} weathers 應為空`);
    }
    // time 若存在須 0-23
    for (const k of ['timeStart','timeEnd']) {
      if (e[k] != null && (e[k] < 0 || e[k] > 23)) errs.push(`${tag}: ${k} 超範圍 (${e[k]})`);
    }
  });
}

// 繁中正名守門：來源錯字禁止出現（data + zones 全掃）
const FORBIDDEN = ['指指點點', '拉札罕', '克札瑪烏卡'];  // 正確＝指向 / 拉札漢 / 克扎瑪烏卡
const blob = JSON.stringify(DATA) + JSON.stringify(ZONES);
FORBIDDEN.forEach(term => { if (blob.includes(term)) errs.push(`禁詞出現（繁中正名）: "${term}"`); });
// emoteCmd 一律非空（所有 emote 皆應對到標準指令）
Object.entries(DATA).forEach(([exp, arr]) => arr.forEach(e => { if (!e.emoteCmd) errs.push(`${exp}#${e.no}: emoteCmd 空（emote="${e.emote}" 未對到指令）`); }));

console.log(`總筆數 ${total}（期望 340）`);
console.log(`zoneKey 覆蓋：資料用到 ${new Set(Object.values(DATA).flat().map(e=>e.zoneKey)).size} 個 zone`);
if (errs.length) {
  console.error(`\n✗ ${errs.length} 個問題：`);
  errs.slice(0, 60).forEach(e => console.error('  ' + e));
  if (errs.length > 60) console.error(`  …還有 ${errs.length - 60} 個`);
  process.exit(1);
} else {
  console.log('✓ 全部通過契約檢查');
}
