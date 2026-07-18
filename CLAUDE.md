# CLAUDE.md — ffxiv-tw-sightseeing

FFXIV 繁中服探索筆記（Sightseeing Log）收集工具。external 公開工具，CF Pages 部署，FFXIV-TW-tools portal 註冊。
純前端（vanilla JS + 原生 ES module，無框架、無 build）。規模：**S–M**（單頁 + 幾個模組 + 一份大資料 dump）。

## 🔒 鐵則（疊加 monorepo AGENTS.md + external/CLAUDE.md portal 設計系統）

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
```bash
node tools/validate-data.mjs         # 資料契約（340 筆、zoneKey 有效、ARR 有天氣/時間、繁中禁詞、emoteCmd）
node tools/validate-weather.mjs      # 天氣移植 bit-exact 對 golden
node tools/validate-availability.mjs # 可進行時間四紅線（鐵則 7）：wait 未知值／null≠0／掃描窗餘裕／往返驗算
node --check modules/weather.js modules/eorzea-time.js
node --input-type=module --check < modules/app.js   # app.js 是 ES module，不能用裸 --check
# UI smoke：需 portal :8774 起 + 本機 http.server，headless 截圖看卡片/地圖/分頁渲染
```

## Git 邊界
- commit 前知會 shawn；**push 走 cmd.exe**（Credential Manager；shawn 自跑）、觸發 CF Pages 部署一律 STOP。
- `tmp/` gitignored（含 build 腳本、reference 源、驗證器、任務書）。

## 部署（未完成，見 `../_NEW-TOOL.md`）
gh repo create FFXIV-TW-tools/ffxiv-tw-sightseeing → CF Pages 連接 → portal `tools.json` 加 entry（icon 🔭、accent cyan、category daily）+ `functions/_middleware.js` 白名單加 `ffxiv-tw-sightseeing.pages.dev` + `_headers` 從 templates 複製。填 index.html `<HOST_URL>` + robots/sitemap。
