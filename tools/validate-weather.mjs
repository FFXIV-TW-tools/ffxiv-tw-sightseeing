// validate-weather.mjs — 驗 codex 的 weather.js 移植 bit-exact。用法：node tmp/validate-weather.mjs
import fs from 'fs';

// 載入 modules/weather.js（掛 window.Weather）；stub window + NamesTW
const win = { NamesTW: { getWeatherName: (w) => w } };
const src = fs.readFileSync('modules/weather.js', 'utf8');
new Function('window', 'NamesTW', src)(win, win.NamesTW);
const Weather = win.Weather;
if (!Weather || typeof Weather.getWeatherForZone !== 'function') {
  console.error('✗ window.Weather.getWeatherForZone 不存在'); process.exit(1);
}

// Golden（由 cycleapple 原版產出，且已對標 canonical FFXIV 天氣演算法 seed=53/61）
const GOLDEN = [
  ['Limsa Lominsa', 1700000000, 'Fair Skies'],
  ['Limsa Lominsa', 1700001400, 'Clouds'],
  ['Coerthas Central Highlands', 1700000000, 'Snow'],
  ["Ul'dah", 1700005000, 'Fair Skies'],
  ['The Crystarium', 1720000000, 'Clouds'],
  ['Kugane', 1720000000, 'Fair Skies'],
  ['Thavnair', 1720000000, 'Fair Skies'],
];
const errs = [];
for (const [z, t, want] of GOLDEN) {
  const got = Weather.getWeatherForZone(z, t);
  if (got !== want) errs.push(`getWeatherForZone(${z}, ${t}) = ${got} ≠ ${want}`);
}
// seed 對標 canonical
if (typeof Weather.calculateWeatherSeed === 'function') {
  if (Weather.calculateWeatherSeed(1700000000) !== 53) errs.push('seed@1700000000 ≠ 53');
  if (Weather.calculateWeatherSeed(1720000000) !== 61) errs.push('seed@1720000000 ≠ 61');
}
if (errs.length) { console.error('✗ 天氣移植未對上：'); errs.forEach(e => console.error('  ' + e)); process.exit(1); }
console.log('✓ 天氣移植 bit-exact 對上 golden（7 zone/時間點 + seed）');
