# tools/ — 資料建置 pipeline（可重現、可稽核）

`data/zones.js` 與 `data/sightseeing-data.js` 皆 **AUTO-GEN**，勿手改產物。改資料 → 改本目錄腳本／`sources/` 重跑。

## 前置
- **需 monorepo context**：`build_*.py` 讀 `../../data/item_dict/`（`tc_PlaceName.csv`、`lspl/maps.json`）——遊戲繁中地名/地圖資料。standalone clone 無法重跑 build（但已 commit 的 `data/*.js` 可直接部署）。
- `sources/`＝reference 快照（版控）：`cycleapple-arr.js`（ARR 座標/天氣）、`babelin.html`（HW–DT 座標/z）、`tc_Adventure.csv`＋`tc_Emote.csv`（遊戲原生官方繁中名/時間/表情，權威主軸）、`cycleapple-{weather,eorzea-time}.js`（引擎移植對照）。

## 建置順序
```bash
# 從 repo root 跑
node tools/extract-sources.mjs          # cycleapple JS + babelin HTML → sources/extracted.json（中間產物）
python tools/build_zones.py             # → data/zones.js（60 地區→地圖/sf/天氣鍵）
python tools/build_data.py              # → data/sightseeing-data.js（340 筆）
node tools/validate-data.mjs            # 契約 + 繁中禁詞 + emoteCmd 守門
node tools/validate-weather.mjs         # 天氣移植 bit-exact 對 golden（驗 modules/weather.js）
```
全綠且 `git diff data/` 僅註解差異＝完全可重現。

## 權威與正名
- 名稱/時間窗/表情＝**遊戲 Adventure + Emote sheet**（官方繁中，連 HW–DT 個別名都有）。座標才用社群源。
- 來源錯字修正（在 `build_zones.py` ZONES 表 / `build_data.py` EMOTEID_CMD，非手雕產物）：拉札**漢**、克**扎**瑪烏卡、指向、坐下到地上。`validate-data.mjs` 有禁詞守門防回歸。

## 檔案
| 檔 | 職責 |
|---|---|
| `extract-sources.mjs` | cycleapple/babelin JS/HTML → `sources/extracted.json` |
| `build_zones.py` | 地區 → 地圖底圖/sizeFactor/天氣鍵（含繁中正名 ZONES 表） |
| `build_data.py` | 合併 Adventure/Emote/座標 → 340 筆（`import build_zones` 共用 ZONES） |
| `validate-data.mjs` | 資料契約 + 繁中禁詞 + emoteCmd 守門 |
| `validate-weather.mjs` | 天氣種子/表 bit-exact golden |
| `sources/` | reference 原始快照（版控）；`extracted.json`/`zone-mapping.md` 為中間產物（gitignored） |
