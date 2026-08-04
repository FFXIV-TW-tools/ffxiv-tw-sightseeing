# AGENTS.md — ffxiv-tw-sightseeing

FFXIV 繁中服探索筆記（Sightseeing Log）收集工具。external 公開工具，CF Pages 部署，FFXIV-TW-tools portal 註冊。純前端（vanilla JS + 原生 ES module，無框架、無 build）。

## 規模級別：S（DEVLOOP §5，偏 M 邊界）

- **判準**：單一 deployable 靜態站、單一職責＝「繁中服探索筆記收集＋可進行時間提示」；無後端 / 無 build 產物依賴（`tools/` build pipeline 為離線可重現）/ 無框架。
- **邊界說明（透明化）**：單頁 + 幾個模組（`app`/`weather`/`eorzea-time`/`map_view`）+ 一份大資料 dump；含版控 build pipeline 與 bit-exact 天氣移植，line-count 觸 M 下緣，但為**同站並列功能、非獨立子系統**（無各自 deploy / 後端邊界）。故判 **S**（偏 M）——不需 ROADMAP 分解層、不設 Gate 0；日後加後端 / 帳號再升 M。

## 架構鐵則（違反必阻擋）

> 本 repo 鐵則與 monorepo AGENTS.md + `external/` portal 設計系統疊加；衝突時子專案 > project > global。

1. **繁中服至上**：所有顯示繁中；地區/表情/天氣譯名一律繁中服正名。
   - 地區名權威＝`datamining_tc/tc_PlaceName`（`data/zones.js` 由 `tmp/build_zones.py` 產）。**禁自創**。
   - 已知 babelin 錯字修正：拉札**漢**（非罕）、克**扎**瑪烏卡（非札）。
2. **DRY — 地圖渲染不平行實作**：`modules/map_view.js` + `modules/esc.js` + `styles/90-map.css` 是 **vendored from `external/ffxiv-tw-marketboard`**（上游）。修 bug 先看上游是否已修、改完考慮回饋上游；**不要在此重寫地圖渲染**。座標契約＝marketboard `gameCoordToPercent(coord,sf)=(coord-1)*sf/40.96`，marker.x/y 為顯示座標(1~42)。
3. **天氣演算法 bit-exact**：`modules/weather.js` 種子演算法（`calculateWeatherSeed`）已對標 canonical FFXIV 天氣公式（`tmp/validate-weather.mjs` golden 守）。**改數字前先確認 golden 仍過**。
4. **portal 設計系統**：CSS 用 token（`var(--color-*)`/`var(--space-*)`），按鈕/面板/modal 用 `.codex-*`，body 自帶 `padding-top:64px`（防 CLS）。改 UI 前讀 `../ffxiv-tw-tools-portal/_DESIGN-SYSTEM.md`。accent＝cyan。
5. **檔案大小**：新建 source >500 行禁（`data/*.js` 純資料 dump 豁免，`FFXIV_SIZE_GATE=off` 過 gate）。
6. **快取 bounded / `except:pass` 禁**（繼承 monorepo）。
7. **「可進行時間」紅線**（2026-07-17 一次修五個 bug，`tools/validate-availability.mjs` 守，改 `availability`/`wait`/`getTimeUntilRange`/掃描窗前先跑）：
   - **兩閘同時成立才算數**：`nextMs` 必須掃「天氣週期 ∩ 時間窗」交集（`nextBothOK`）。**禁 `Math.max(時間等待, 天氣等待)`** —— ET 一天＝4200 秒＝剛好 3 個天氣週期，兩閘各自循環，max 只保證「較晚那個到了」；天氣週期僅 23分20秒，等到窗開時天氣多半已過。實測 80/80 雙閘條目、**67.5% 給錯時間**。
   - **null ≠ 0**：找不到就傳 `null`（未知），**禁用 0 當 fallback**（0 的語義是「不用等」）。顯示判準一律 `Number.isFinite(ms) && ms > 0`。
   - **禁 `Number(ms)` 收斂**：`Number(null)===0`（不是 NaN），會讓「未知」被印成「現在」——最糟的假訊息。守門一律 `Number.isFinite(ms)` 直接判。
   - **掃描窗**＝`weather.js` 的 `SCAN_PERIODS`（單一事實源，前端與交集掃描共用）。實測最大間隔（2.7 年模擬）：天氣 185 週期、天氣∩時間 **447** 週期（#044 南林區雷雨×ET 08–12）；**改小前先跑測試看餘裕**。放大不增成本（找到即 return）。
   - **時間窗是半開 `[start, end)`**：遊戲窗「05–08」＝05:00–07:59，**08:00 即關窗**。`getTimeUntilRange`/`isTimeInRange` 一律 `< endTime`，**禁 `<=`**（閉區間會讓窗尾多開 1 ET 分＝2.9 秒現實、82 個條目全中）。
   - 跨午夜窗（18–5，21 個條目）**不自行推算**，一律交 `ET.getTimeUntilRange`（已處理 wrap），勿平行實作。
   - **長等待顯示「N 天」**：交集等待動輒數天（#044 最長 7.2 天），`formatWaitTime` 禁回「> 24 小時」（分不出 25 小時與 7 天）。

## 資料流（build pipeline 在版控 `tools/`，可重現可稽核；詳 `tools/README.md`）
```
tools/sources/（reference 快照，版控）＋ ../../data/item_dict/（monorepo 遊戲資料）
  ──[tools/extract-sources.mjs → build_zones.py → build_data.py]──> data/{zones,sightseeing-data}.js
data/zones.js + data/sightseeing-data.js  ──> modules/app.js 渲染
```
- **兩份 data/*.js 皆 AUTO-GEN**：改地區/地圖 → 改 `tools/build_zones.py` 重跑；改條目資料 → 改 `tools/build_data.py` 重跑。勿手改產物。
- 名稱/時間/emote 主軸＝遊戲 Adventure+Emote sheet（`tools/sources/tc_{Adventure,Emote}.csv`）。
- **權威主軸＝遊戲原生 sheet**（`datamining_tc/tc_Adventure`＋`tc_Emote`）：名稱/時間窗/表情全走官方繁中（連 HW–DT 個別名都有）。**座標 X/Y 亦走遊戲原生**：`Adventure.Level` → `tc_Level`(X/Z) + `tc_Map`(SizeFactor) 標準換算（2026-07-18 起、1 位小數，取代 cycleapple/babelin；`build_data.py level_coords`）。僅高度 z 留 babelin（HW–DT），**ARR 無 z**——遊戲 Level.Y 無穩定 world→顯示 Z 換算（全域擬合 129/181 差 >0.5），且無社群 z 可校準各圖偏移。
- 繁中正名修正（來源錯字）：拉札**漢**（非罕）、克**扎**瑪烏卡（非札）、emote 指向（非指指點點）/坐下到地上（非坐下）。
- `data/schema.md`＝資料契約單一來源（欄位/天氣鍵/emote 對照）。

## 協作歷程（本工具由 CC 統籌，2026-07-17）
- CC：反向工程 2 reference 站；發現遊戲原生 Adventure/Emote sheet（權威繁中源，需本地遊戲資料 join、繁中鐵則不外包）→ 親建 zones.js + sightseeing-data.js；index.html 契約；UI 重設計（field-log 卡片/全部分頁/下一個可進行提示）；全程驗收（headless UI smoke）。
- codex（gpt-5.6-luna）：引擎移植 + 主程式 + 樣式（`modules/{app,weather,eorzea-time}.js`、`css/style.css`）。weather.js 移植 bit-exact 對標 canonical（golden 過）。
- grok：原派資料抽取，未交付檔案（只印計畫）→ CC 收回（改用更權威的 Adventure sheet）。

## VERIFY（改動後必跑）

> 基線：**5 支全 PASS**（3 validators ＋ handoff 契約 ＋ CSP 圖片主機）（`validate-data` / `validate-weather` golden / `validate-availability` 四紅線）＋ 3 syntax check OK（2026-08-04 實測）。只准升不准降。
> 2026-08-04 新增一支（4→5）：`csp-image-hosts.test.mjs`。**由來**：Owner 回報「圖片抓不出來」——2026-07-29 上游 Teamcraft 把地圖網址從 `xivapi.com/m/…` 換成 `v2.xivapi.com/api/asset/map/…`，那次修了資料管線的形狀比對卻沒補 `_headers` 的 img-src ⇒ **340 張地圖被自己的 CSP 擋掉**，撐到使用者回報才發現。**這個缺陷零回饋訊號**：伺服器回 200、三支 validator 全綠（欄位有值、格式正確）、build 全綠，而且**上游換網址是別人的改動**，我們這邊本來沒有任何東西會因此變紅。判準**由 `data/` 與 `modules/` 反推**該有哪些主機、不寫死清單（寫死的話下次上游再換一個網址一樣不會響）；裸 scheme `https:` 視為涵蓋以免誤報。**已做恆綠自我驗證**：拿掉 img-src 的 v2 即精確指名該紅、還原即綠。⚠️ 初稿正則把主機後的 `/` 寫死，導致 `/api/asset/…` 那支分支永遠比不到、**在真的漏了 v2 的狀態下印綠燈**——寫這類「由資料反推」的哨兵，一定要用真實的缺陷狀態驗它會紅。
> 排程分級（維護閉環 §6，unattended-safe）：validators ＋ `--check` ＝ **normal**（快、無互動、可 daily cron）；UI smoke ＝ **interactive**（需 portal+http.server+headless，**永不 cron**）。

```bash
node tools/validate-data.mjs         # 資料契約（340 筆、zoneKey 有效、ARR 有天氣/時間、繁中禁詞、emoteCmd）
node tools/validate-weather.mjs      # 天氣移植 bit-exact 對 golden
node tools/validate-availability.mjs # 可進行時間四紅線（鐵則 7）：wait 未知值／null≠0／掃描窗餘裕／往返驗算
node --check modules/weather.js modules/eorzea-time.js
node --input-type=module --check < modules/app.js   # app.js 是 ES module，不能用裸 --check
node tests/handoff.test.mjs           # 舊網址交接頁契約（B-048）：四個攔截條件各有正負案例＋標頭/canonical/跳脫/_routes≡manifest
node tests/csp-image-hosts.test.mjs   # 資料裡的圖片主機 ⊆ _headers 的 img-src（上游換網址時會響）
# UI smoke（interactive，人工）：需 portal :8774 起 + 本機 http.server，headless 截圖看卡片/地圖/分頁渲染
```

## 部署（未完成，見 `../_NEW-TOOL.md`）
gh repo create FFXIV-TW-tools/ffxiv-tw-sightseeing → CF Pages 連接 → portal `tools.json` 加 entry（icon 🔭、accent cyan、category daily）+ `functions/_middleware.js` 白名單加 `ffxiv-tw-sightseeing.pages.dev` + `_headers` 從 templates 複製。填 index.html `<HOST_URL>` + robots/sitemap。

## 開發循環（DEVLOOP）

正典：`~/.claude/process/DEVLOOP.md`；本 repo 工件：`CHANGELOG.md`、`docs/BACKLOG.md`；按需建 spec 於 `docs/specs/`（`-design.md`＋front-matter）、plan 於 `docs/plans/`（v1.10 工件位置＝契約）。

本 repo 補充（非 DEVLOOP 摘要條目）：**S 級**：無 ROADMAP 分解層、無 Gate 0。

### 🔒 部署面鐵則（2026-08-01，勿回退）

本 repo 的 CF Pages 部署**不是「發佈 repo 根目錄」**，而是由 `deploy-prepare.sh` 依 `deploy-allow.txt` 產出 `_site/`。CF dashboard 必須設 Build command = `sh deploy-prepare.sh`、Build output directory = `_site`。

- **為什麼**：CF Pages 無 build 步驟時把 repo 根整棵目錄當靜態資產上傳 → `AGENTS.md`／`docs/`／`tools/`／`tests/`／`worker/` 後端源碼全部變成該網域下可直接 GET 的公開檔（2026-08-01 實測 12/13 站中招）。**private repo 只保護「誰能 clone」，不保護「已部署的檔案誰能下載」**；`.gitignore`（檔是 tracked）／`_headers`（只加標頭）／`robots.txt`（只擋收錄不擋直取）都擋不到。
- **允許清單而非排除清單**：頂層出現任何未列入 `deploy-allow.txt`／`deploy-deny.txt` 的項目 → **build 直接失敗**。新增內部資產的預設值是「不發佈」，不靠任何人記得。排除清單做不到（實測當天漏了 `worker/` 106 支 .ts 與 `_tools/`／`_cache/` 141 檔）。
- **新增站台資產**（新頁面／新資料夾）→ 加進 `deploy-allow.txt`；**新增內部資產** → 加進 `deploy-deny.txt`。改完跑一次 `sh deploy-prepare.sh` 確認印出「✓ 部署輸出就緒」。
- **腳本改動禁忌**：① 只能用 POSIX 語法（CF 容器的 `sh` 是 dash，`read -r -d ''` 之類 bashism 會靜默失敗、輸出 0 檔而 build 仍「成功」⇒ **整站 404**，2026-08-01 實際發生）② 根層檔名不可無條件 `mkdir "$OUT/${f%/*}"`（會建出「叫 index.html 的目錄」⇒ `/` 404）③ 不得移除出貨前驗收閘（輸出 <3 檔／缺 index.html／內部檔混入 → 非零 exit，CF 保留前一版）。
- **部署後驗**：`curl -sI https://<repo>.pages.dev/AGENTS.md` → 回 `text/html` 正常（檔案不存在）；回 `text/markdown` = 紅燈。
