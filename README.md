# ffxiv-tw-sightseeing — FFXIV 繁中服 探索筆記工具

FFXIV 繁中服（陸行鳥 DC）「探索筆記（Sightseeing Log）」收集工具。收錄 **2.0~7.0 全 340 個探索日誌**，
每筆附**地圖底圖 + 座標點渲染**（marketboard 那套）、艾歐澤亞時間、天氣條件、表情提示與完成追蹤。

- **Pages URL**：https://ffxiv-tw-sightseeing.pages.dev/ （部署後填實）
- **Portal**：FFXIV-TW-tools 生態工具站之一（tokens/header 走 portal CDN）
- 純前端靜態（vanilla JS + 原生 ES module，無框架、無 build）

## 資料來源
- ARR（80）：cycleapple sightseeing tool（小數座標 + 天氣 + 時間 + 繁中名）
- HW–DT（260）：babelin sightseeing（座標 + z + 表情 + 少數時間）
- 地區繁中名 + 地圖底圖：本機遊戲資料（`datamining_tc/tc_PlaceName` + `lspl/maps.json`）→ `data/zones.js`
- 繁中正名一律對 tc_PlaceName（例：拉札漢非拉札罕、克扎瑪烏卡非克札瑪烏卡）

## 檔案
```
index.html              骨架 + portal bootstrap + element ID 契約
css/style.css           卡片/分頁/篩選樣式
modules/app.js          主程式（分頁/篩選/卡片/完成追蹤/地圖委派）
modules/eorzea-time.js  艾歐澤亞時間（移植 cycleapple）
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
