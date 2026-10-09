# 探索筆記修復計畫（2026-10-09）

> 依據：[健檢報告](2026-10-09-page-health-review.md)。Owner 已授權「不需拍板、無副作用的項目直接修正」；未授權 commit／push／部署。

## 重構決策

不整站重寫、不引入框架／TypeScript build／新 runtime。340 筆資料與 bounded 天氣快取不構成換架構的瓶頸證據。只在已有具體分歧的位置分離純計算、storage 邊界與 UI 更新；保留 vendored 地圖、現有兩個 localStorage key、JSON schema、時間交集與半開窗。

## 須修改（必做）
以下是健檢分工批次，不是可獨立提交的單元。整合依賴順序：weather 的 nowMs API → 純 availability／storage 與 app callers／回歸測試 → index/CSS 整合 → icons／modulepreload 重生 → canonical 與實際 UI 驗收。日後提交時，互相依賴的 code、測試與 preload 必須同一個完整修復 commit；健檢產物另提交。


### 批次 1：核心狀態與回饋

- `modules/app.js` 與必要的純模組：修時間篩選／排序的自動刷新；membership 不變時保留卡片和提示按鈕，只更新文字／狀態；render 共用已算的 availability。
- 完成操作重新讀取最新紀錄並僅套用本次 ID，再監聽 storage event；保留 array／legacy object 相容性。損毀資料不得被空集合覆蓋；寫入成功才更新完成狀態，失敗立即還原本次勾選並顯示未套用，不留下會被下次 snapshot 清掉的僅記憶體狀態。
- 共用剪貼簿成功／失敗回饋，portal 缺席也可見；IME 組字不重繪；首訪判準一致。
- contextual accessible name、移焦／移除卡片焦點恢復、reduced-motion；grid 不作逐秒 live region，使用獨立操作 status。
- 驗證：實際頁面時間跨窗、兩個 tab 接續完成、storage 失敗／損毀、提示 DOM identity、鍵盤、IME、複製缺席情境。

### 批次 2：領域資料與驗證閘

- `tools/build_data.py`：依 Emote.TextCommand 查證展示／鼓勵指令，改生成器後重跑，不手改產物。
- `build_zones.py` 的輸出以 main guard 隔離，import 不寫檔；兩支生成器共用既有 CSV 選擇 helper，不改來源版本政策。
- `modules/weather.js` 搜尋起點由呼叫者傳入，保留第三參數 maxPeriods；官方天氣譯名對齊 sheet，不改 seed。`modules/eorzea-time.js` 刪除已查無 consumer 的錯誤 `isTimeInRange`。
- `run-all.mjs` 納入資料／天氣 validator，seed golden 必跑並與 vendored snapshot 對照；修 icons 生成漂移；補代理 fail-closed／失敗不洩漏／no-store 行為測試，並移除 `functions/settings-api/[[path]].js` 無 consumer 的 test-only export。
- 驗證：依序生成資料／icons／modulepreload；對照修前 parsed snapshot，逐欄限制語意差異。本輪准許兩個 emoteCmd 與三個已由本機台服 PlaceName 證明的地名分隔號，其他名稱／座標／圖片 URL／size factor 變更不得夾带進來，需回到來源政策決策。再一次執行 canonicalTest 與 syntax；直接行使新的純核心／generator import。已觀測差異和選源見驗收摘要。

### 批次 3：既有 UI 與文件 drift

- `index.html`／`css/style.css`：64px navbar offset、actual host preconnect、避免 settings client 雙重注入、token fallback、頁尾 selector、手機長標題。`_headers` 僅更正 preload 說明；HTTP preload 仍供 portal header 的 settings 背景載入使用，CSP 與所有 header 值不變。
- `data/schema.md`／README／tools README／devloop.json／BACKLOG／AGENTS：改現行錯誤陳述；歷史 spec、review 原文、CHANGELOG 舊紀錄不回寫。
- 驗證：桌面與 320／390px 真實頁面、無橫向 overflow、標題可讀、地圖 modal、結果清除；工件檢查。修後實證追加報告「後續追蹤」，不倒改審查快照。
- `deploy-prepare.sh` 僅修暫存清單 exit/signal cleanup，不改 allowlist、複製範圍、symlink guard 或出貨閘；以獨立 scratch 成功／失敗 fixture 驗收，不執行本站部署。

## 建議修改／待 Owner 決策

1. **地圖縮圖**：小卡下載全尺寸地圖是成本來源，但尚未證明可感知載入延遲。方案 A：離線產生本站 512px 縮圖、放大保留原圖（建議，需新增可重現資產流程／授權來源與部署清單）；B：查證 xivapi resize 契約後用遠端縮圖（維護少、依賴第三方）；C：先保留原圖。不可先猜 URL 或降底圖精度。
2. **CSP／vendored 地圖**：若要移除 unsafe-inline，先在 marketboard 上游切換事件委派，再同步本站，另處理 parser bootstrap／JSON-LD 的 hash/nonce。這是安全邊界變更，需 Owner 確認並走 DEVLOOP pre/post fact＋blind；不可只刪 CSP token。
3. **資料來源版本／fallback**：全部本機優先或統一版控 snapshot（二擇一）需決定可重現性與版本升級政策；建議固定同版 sheet manifest。zone／Level 缺值是否 fail build 也需明確決策，不能這次悄悄改既有產物。
4. **跨分頁同時寫入**：重新讀取＋storage event 修正常見 stale-tab 覆蓋，不是跨 process 原子交易。若要求真正同時寫入零遺失，建議 per-ID storage 或 IndexedDB transaction，這會改儲存模型，須另訂遷移／恢復契約與前審。本次不聲稱具此保證。
5. **發布閘位置**：目前 CF 只做 packaging，測試在 local safe-push；若要 dashboard／其他來源 deploy 也必驗，須確認 CF Node 環境與 sibling 生成器依賴，再將自足 validators 加到 build。本次不改線上設定。
6. **損毀進度恢復**：本輪保留原始 blob，不自動重置；代價是損毀狀態下本頁勾選仍不能持久化。方案 A：先提供原始資料備份，再明示確認重置（建議，需設計恢復 UX 與破壞性操作授權）；B：維持警告與人工救援。沒有足夠有效資料時不能保證修復或猜回進度。

匯出／匯入／跨裝置同步、搜尋編號／表情、分頁／virtualization、CDN immutable cache 都是新契約或未量測的提案，不因健檢自動實作。代理來源的公開 GET 主張已被 production 404＋JS 對照推翻，不以此要求 Owner 改部署邊界。

## 執行備註

本次實作的控制判定與具體依據只以 [Record](2026-10-09-page-fix-record.json) 為當前權威；此檔是健檢要求的修復清單與待決提案，不是另一份 DEVLOOP 控制宣告。

本輪 pipeline 的獨立 reviewer→verifier 與 recall 是健檢證據，不冒稱修復 diff 的正式前／後閘。主迴圈驗收所有 worker 更動並做實際 smoke。提交健檢產物與修復應分開；push／部署仍須明示授權。
