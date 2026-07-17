---
status: approved
type: feature
cycle: 2026-07-17-sightseeing
date: 2026-07-17
---

# 探索筆記工具 — 設計 spec

## 目標
FFXIV 繁中服玩家收集 2.0~7.0 全 340 個探索日誌（Sightseeing Log）。這些日誌部分有地點/時間/天氣/表情限制，
分散難查。本工具集中呈現，並以「marketboard 採集地點」的方式渲染地圖底圖 + 座標點，附時間/地點/天氣提示。

## Reference（反向工程來源）
- cycleapple `-xiv-sightseeing-tool`：ARR 80 筆，乾淨 code（ET 時鐘/天氣引擎/卡片/篩選/完成追蹤），**無地圖圖**、只文字座標。
- babelin `/sightseeing`：全 6 版本 340 筆覆蓋（80/62/62/45/46/45），有地圖檢視、分版本 tab。

## 決策（Owner 拍板 2026-07-17）
1. **落地**：新獨立 repo `external/ffxiv-tw-sightseeing/` + portal 註冊（依 `_NEW-TOOL.md`）。
2. **資料**：Hybrid 混合源 — ARR 取 cycleapple（小數座標 + 天氣 + 時間 + 繁中名），HW–DT 取 babelin（唯一全量），
   全部過繁中正名（tc_PlaceName），地圖底圖/sizeFactor 從 `lspl/maps.json` 依 zone 對映。
3. **分工**：CC 統籌（反向工程 + zones.js + 契約 + 驗收）／grok（資料抽取）／codex（引擎 + 主程式 + 樣式）平行。

## 機制事實（來自 reference 反向工程）
- **ARR（2.0）**：每筆有 時間窗 + 天氣需求 + 表情，需即時 gating（可進行/等待中）。
- **HW–DT（3.0+）**：多數只需「到地點做表情」，無天氣/時間 gating（少數例外用 note 標時間）。
- 天氣種子演算法 bit-exact 對標 canonical FFXIV 公式（seed@1700000000=53 已驗證）。
- 座標系統：顯示座標(1~42) → 圖上百分比 `(coord-1)*sizeFactor/40.96`（marketboard map_view）。

## 架構
- 純前端 vanilla ES module。`index.html`（骨架 + element ID 契約）+ `css/style.css`。
- 引擎：`modules/eorzea-time.js`（ET 時鐘/倒數）、`modules/weather.js`（天氣預測，涵蓋 ARR–EW；DT 無天氣資料）。
- 地圖：vendored `modules/map_view.js` + `esc.js` + `styles/90-map.css`（上游 marketboard）。
- 資料：`data/zones.js`（AUTO-GEN，地區→map/sf/weatherZone）+ `data/sightseeing-data.js`（340 筆）。契約＝`data/schema.md`。
- 完成追蹤：localStorage（全域 id `<exp>-<no>`）。

## 已知限制 / 後續
- DT（7.0）8 個地區無 cycleapple 天氣表（`weatherZone:""`）→ 當前天氣不顯示（HW–DT 本就不 gating，影響僅資訊性）。後續可從遊戲資料補 DT 天氣 rate 表。
- 鼓勵/展示 2 個非標準 emote 的英文指令待 CC 校對。
- 部署（gh repo / CF Pages / portal 註冊）為 Owner 手動步驟。

## VERIFY
`node tmp/validate-data.mjs`（契約）+ `node tmp/validate-weather.mjs`（天氣 golden）+ headless UI smoke。
