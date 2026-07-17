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

## 資料流
```
tmp/build_zones.py  ──> data/zones.js（地區→map image/sf/weatherZone，AUTO-GEN 勿手改；改資料源重跑）
cycleapple(ARR) + babelin(HW–DT)  ──[schema.md 契約]──> data/sightseeing-data.js（340 筆）
data/zones.js + data/sightseeing-data.js  ──> modules/app.js 渲染
```
- `data/zones.js` 是 AUTO-GEN：要改地區/地圖 → 改 `tmp/build_zones.py` 的 ZONES 表重跑，勿手改產物。
- `data/schema.md`＝資料契約單一來源（欄位/天氣鍵/emote 對照）。

## 協作歷程（本工具由 CC 統籌 + codex/grok 平行分工建立，2026-07-17）
- CC：反向工程 2 個 reference 站、zones.js（繁中正名 + 地圖對映）、index.html 契約、驗收。
- grok：340 筆資料抽取正規化（`data/sightseeing-data.js`）。
- codex：引擎移植 + 主程式 + 樣式（`modules/{app,weather,eorzea-time}.js`、`css/style.css`）。

## VERIFY（改動後必跑）
```bash
node tmp/validate-data.mjs      # 資料契約（340 筆、zoneKey 有效、ARR 有天氣/時間）
node tmp/validate-weather.mjs   # 天氣移植 bit-exact 對 golden
node --check modules/weather.js modules/eorzea-time.js
# UI smoke：需 portal :8774 起 + 本機 http.server，headless 截圖看卡片/地圖/分頁渲染
```

## Git 邊界
- commit 前知會 shawn；**push 走 cmd.exe**（Credential Manager；shawn 自跑）、觸發 CF Pages 部署一律 STOP。
- `tmp/` gitignored（含 build 腳本、reference 源、驗證器、任務書）。

## 部署（未完成，見 `../_NEW-TOOL.md`）
gh repo create FFXIV-TW-tools/ffxiv-tw-sightseeing → CF Pages 連接 → portal `tools.json` 加 entry（icon 🔭、accent cyan、category daily）+ `functions/_middleware.js` 白名單加 `ffxiv-tw-sightseeing.pages.dev` + `_headers` 從 templates 複製。填 index.html `<HOST_URL>` + robots/sitemap。
