// extract-sources.mjs — 把 reference 源（cycleapple JS / babelin HTML）抽成 sources/extracted.json
// build_data.py 讀它（Python 不易 eval JS，故用 node 前置抽取）。用法：node tools/extract-sources.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'sources');

// cycleapple ARR（CJS module.exports）
const CA = require(path.join(SRC, 'cycleapple-arr.js'));
const arr = CA.getAll().map(l => ({ adventureId: l.adventureId, name: l.name, region: l.region, x: l.x, y: l.y, weather: l.weather, time: l.time, emote: l.emote }));

// babelin ALL_DATA（從 HTML 抽出 const ALL_DATA = {...};）
const html = fs.readFileSync(path.join(SRC, 'babelin.html'), 'utf8');
const m = html.match(/const ALL_DATA\s*=\s*(\{[\s\S]*?\n\s*\};)/);
if (!m) { console.error('ALL_DATA 抽取失敗'); process.exit(1); }
let obj;
eval('obj = ' + m[1].replace(/;\s*$/, ''));

fs.writeFileSync(path.join(SRC, 'extracted.json'), JSON.stringify({ cycleapple_arr: arr, babelin: obj }));
console.log('extracted: cycleapple_arr', arr.length, '| babelin', Object.keys(obj).map(k => k + ':' + obj[k].length).join(' '));
