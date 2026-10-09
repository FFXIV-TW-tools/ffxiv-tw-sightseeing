// tests/csp-image-hosts.test.mjs — 資料裡出現的圖片主機必須被自己的 CSP 放行
//
// 【由來：2026-08-04 Owner 回報「圖片抓不出來」】
// 2026-07-29 上游 Teamcraft 把地圖網址從 `xivapi.com/m/<code>/…` 換成
// `v2.xivapi.com/api/asset/map/<code>/…`。那次修了資料管線的形狀比對（讓它兩種都認），
// 但 `_headers` 的 img-src 沒跟著加新主機 ⇒ **340 張地圖全被自己的 CSP 擋掉**。
//
// 這個缺陷的形狀是本生態反覆踩的那一種：
//   - build 全綠、資料驗證全綠（欄位有值、格式正確）、伺服器回 200
//   - 只有真的用瀏覽器打開才看得到圖是破的，而 console 的 CSP 違規沒人在看
//   - 上游換網址是**別人**的改動，我們這邊沒有任何東西會因此變紅
// 同型前科：B-047 portal 的 `'self'` 不是固定值、2026-08-04 的 media-src 缺席讓鬧鐘
// 從來沒響過。共通點都是「CSP 少一個來源」＝零回饋訊號。
//
// 【判準：由資料反推，不寫死清單】
// 掃 data/ 與 modules/ 裡出現的 https 圖片網址主機，斷言每一個都在 img-src 內。
// 寫死主機名的話，下次上游再換一個網址，這支一樣不會響 —— 那就白寫了。
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 只認**看起來是圖片**的網址：副檔名，或已知的圖片 API 路徑形狀。
// 刻意不把所有 https 網址都當圖片 —— 那會把 API 端點（connect-src 管轄）也算進來而誤報。
// ⚠️ 主機那段後面**不要**先寫死一個 `/` —— 初稿那樣寫，`/api/asset/…` 這支分支就永遠
//    比對不到（斜線已被吃掉），結果哨兵在真的漏了 v2.xivapi 的狀態下印綠燈。修時實測過。
const IMG_URL_RE = new RegExp(
  'https://[a-z0-9.-]+(?:' +
    '[^\\s"\'`)]*?\\.(?:png|jpe?g|webp|gif|svg|avif)\\b' +   // 一般圖檔（副檔名）
    '|/api/asset/[^\\s"\'`)]*' +                             // xivapi v2 的資產端點（無副檔名）
  ')', 'gi');

function scan(dir) {
  const hosts = new Map();   // host → 第一個發現處（報錯時指得出來）
  if (!existsSync(dir)) return hosts;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { for (const [h, w] of scan(p)) if (!hosts.has(h)) hosts.set(h, w); continue; }
    if (!/\.(js|mjs|json|html)$/.test(e.name)) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(IMG_URL_RE)) {
      const host = new URL(m[0]).origin;
      if (!hosts.has(host)) hosts.set(host, `${e.name}: ${m[0].slice(0, 70)}`);
    }
  }
  return hosts;
}

const found = new Map([...scan(join(root, 'data')), ...scan(join(root, 'modules'))]);
assert.ok(found.size > 0,
  '在 data/ 與 modules/ 掃不到任何圖片網址 —— 判準本身漂掉了（資料搬家了？正則過時了？）');

const headers = readFileSync(join(root, '_headers'), 'utf8');
const csps = [...headers.matchAll(/Content-Security-Policy:\s*([^\n]+)/gi)].map((m) => m[1]);
assert.ok(csps.length > 0, '_headers 裡找不到 CSP');

for (const csp of csps) {
  const m = /img-src\s+([^;]+)/i.exec(csp);
  assert.ok(m, 'CSP 缺 img-src —— 會落回 default-src，跨站圖片全被擋');
  const sources = m[1].trim().split(/\s+/);
  // `https:` 這種裸 scheme 等於放行全部 https 圖片（ranking 就是這樣寫），視為涵蓋
  const wildcard = sources.includes('https:') || sources.includes('*');
  for (const [host, where] of found) {
    if (wildcard || sources.includes(host)) continue;
    assert.fail(`img-src 沒放行 ${host}（出現在 ${where}）\n`
      + '  → 症狀是「圖片是破的」而完全沒有錯誤：伺服器回 200、資料驗證全綠、build 全綠。\n'
      + '  → 修法：把該主機加進 _headers 的 img-src。');
  }
}

console.log(`csp-image-hosts: ${found.size} 個圖片主機全在 img-src 內（${[...found.keys()].join(', ')}）`);
