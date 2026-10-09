# ffxiv-tw-sightseeing — FFXIV 繁中服 探索筆記工具

FFXIV 繁中服（陸行鳥 DC）「探索筆記（Sightseeing Log）」收集工具。收錄 **2.0~7.0 全 340 個探索日誌**，
每筆附**地圖底圖 + 座標點渲染**（marketboard 那套）、艾奧傑亞時間、天氣條件、表情提示與完成追蹤。

- **Pages URL**：https://sight.xivtc.com/
- **Portal**：FFXIV-TW-tools 生態工具站之一（tokens/header 走 portal CDN）
- 主頁為 vanilla JS + 原生 ES module，無框架與前端 build；`functions/settings-api/` 以 Pages Function service binding 代理共用設定後端。

## 資料來源
- 名稱、時間窗、表情、指令、X/Y、地區與地圖 metadata：`tools/sources/` 的六張同版官方繁中 sheet，manifest 綁定 client version 與 bytes SHA-256。
- ARR 天氣取 cycleapple；HW–DT 高度 z 與引導等補充取社群來源，不作地區／座標權威。
- `python tools/build_data.py` 一次生成兩份資料與 generation manifest；standalone checkout 只需 Python 與 Node，沒有 monorepo／本機 dump fallback。詳 [建置流程](tools/README.md)。
- 繁中正名一律對同版 PlaceName（例：拉札漢非拉札罕、克扎瑪烏卡非克札瑪烏卡）。

## 檔案
```
index.html              骨架 + portal bootstrap + element ID 契約
css/style.css           卡片/分頁/篩選樣式
modules/app.js          主程式（分頁/篩選/卡片/完成追蹤/地圖委派）
modules/ss_storage.js   完成紀錄 localStorage 讀寫（損毀時不寫回）
modules/eorzea-time.js  艾奧傑亞時間（移植 cycleapple）
modules/weather.js      天氣預測（移植 cycleapple，bit-exact 對標 canonical）
modules/map_view.js     地圖渲染（vendored from marketboard，上游同步）
modules/esc.js          escHtml（vendored，map_view 依賴）
styles/90-map.css       地圖樣式（vendored from marketboard）
data/zones.js           地區→地圖底圖/sizeFactor/天氣鍵（AUTO-GEN，勿手改）
data/sightseeing-data.js 340 筆探索日誌（純資料）
data/schema.md          資料契約
```

## 本機 dev
```bash
svc start portal            # 需 portal :8774 才吃得到 tokens/header CDN
python -m http.server 8xxx  # 或掛進 svc；index.html dev-mode 會抓 localhost:8774
```

## 完成紀錄

完成集合是 `localStorage.ffxiv-sightseeing-completed`（字串 ID 陣列；舊版 id→true 物件也能讀），檢視偏好在 `ffxiv-sightseeing-prefs`。每次勾選先重讀再只改該 ID，另一分頁的勾選不會被舊快照蓋掉；其他分頁靠 `storage` 事件更新畫面。讀不到或內容損毀時提示並停止寫入，原值保留；寫入失敗提示「僅在本頁生效」。清除瀏覽資料後無法還原。

## 出貨驗證

`sh deploy-prepare.sh` 在清除 `_site` 前執行資料／天氣／可進行時間／圖片主機／script CSP hash／native 與 generation manifest 檢查。任一驗證失敗保留前一個本機 `_site`；後續複製仍是 single-writer，不承諾任意 packaging I/O 失敗的本機回滾。CF Node 由 `.node-version` 固定；不需 Python、.NET 或 portal sibling。部署仍由允許清單與 tracked 檔控制；CF build 失敗不替換既有部署。

