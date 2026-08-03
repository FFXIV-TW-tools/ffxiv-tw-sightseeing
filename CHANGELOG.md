# Changelog

> 日期段落制（cycle 收官為段）；條目含人話「為什麼」，不從 git log 自動生成。格式見 DEVLOOP §4.3。

## 2026-08-03 — 舊網址交接頁（monorepo B-048 Task 3 試點）

**為什麼**：13 站已掛上 `xivtc.com`，但手上是舊 `*.pages.dev` 書籤的使用者不會知道，也不會把跨工具身份（UUID）帶過去。本站是**試點**——交接邏輯先在這裡驗證，過了才推廣其餘 12 站。

**為什麼不是 301**：301 在**邊緣執行、早於任何 JS** ⇒ 舊 origin 完全沒機會讀 `localStorage` 裡的 UUID。純 301 會讓使用者靜默失去雲端身份（設定、貓小胖、跨工具偏好全部對不回去）。所以必須回一頁極簡 HTML、由 client 讀 LS 後自行組目標 URL——這也是為什麼目標 URL 不能在 server 端組完就送：**`#fragment` 永遠不會送到伺服器**。

### Added

- `functions/_middleware.js` — 交接攔截。**四個條件同時成立才攔**：`GET` ／ `Accept` 含 `text/html` ／ host **精確等於** production 舊 host（字串全等，順帶讓 CF preview 子網域天然被放行）。
- `_routes.json` — **完整枚舉**（`/`、`/index.html`），刻意不用 `/*`：那會讓每個 CSS/JS/圖片請求都變成一次 Functions invocation。
- `tests/route-manifest.json` — 要攔哪些路徑的唯一事實源。⚠️ **來源是「實際可導覽的 path」，不是掃 `.html` 檔名推的** —— 那樣抓不到無副檔名路徑（ranking 的 `/timeline`、bis 的 `/calibration`），漏列的深鏈會直接吃到原站、繞過整個交接。
- `tests/handoff.test.mjs` — 契約測試，**四個攔截條件各有正負案例**。

### 行為

- **零可見、瞬間跳轉**（Owner 拍板）。「網址搬家了」的告知放在新站，不放這裡。
- 保留 `pathname` + `search` + `hash`；附加 `ftw_uuid` / `ftw_uuid_t` 前**先 delete 全部保留名稱再 set**（直接 append 的話 `URLSearchParams.get()` 只取第一個值，舊書籤或刻意構造的參數會勝出）。
- **`ftw_uuid_t` 必帶**（沒有就帶 0）：省略會讓帶入身份在 `decideAdopt` 裡變成最弱檔。
- **不附加 `ftw_link=1`** —— 那是 QR／邀請語意＝凌駕資料保護，交接不是那個語意。
- **不產生新 UUID**：沒有身份就不帶。這裡沒有資料要搬，造一個身份沒有意義。
- **冪等、無旗標**：每次進舊網址都重跑。刻意不設「已交接」記號——成功只有新 origin 知道，而新 origin 不能替 `pages.dev` 設 cookie（PSL），那個旗標沒有可靠的成功確認路徑。
- 標頭：`Cache-Control: no-store`（改壞了要能立刻回滾）／`Referrer-Policy: no-referrer`（UUID 會進 URL）／CSP 用 **CSPRNG 每 response 重生的 nonce**（固定 nonce 等同 `unsafe-inline`）。
- **canonical 逐路徑指向新網址** —— 本 middleware 一上線，舊 host 的靜態 canonical 就再也不會出現，SEO 收斂全靠這條。

### Notes

- **`deploy-prepare.sh` 只取 git tracked 檔**（刻意設計：保證「本機驗的 == 線上發的」）⇒ 新增檔案要先 `git add` 才會進 `_site`。第一次跑 build 時 `functions/` 沒被複製就是這個原因。
- 部署面 fail-closed 閘正確擋下新增的 `tests/`（未分類）→ 已歸 `deploy-deny.txt`；`functions` 與 `_routes.json` 歸 `deploy-allow.txt`（測試守這兩條，漏了 build 會直接失敗）。
- **UUID 不會外洩給第三方**：13 站的 `_headers` 都是 `Referrer-Policy: strict-origin-when-cross-origin`，跨 origin 只送 origin 不送 query string ⇒ portal CDN 與任何外部資源都拿不到 `ftw_uuid`。剩下的曝光面只有同 origin（我們自己的 CF log），**已知且已揭露**，不改成 `no-referrer`（那會連帶影響分析）。

## 2026-07-29 — 地名改吃台服 client 自解包 ＋ 修地圖 URL 形狀比對

**地名**：原本直接讀 `datamining_tc/tc_PlaceName.csv`＝**upstream 快取檔名**，吃不到本機台服 client 自解包的 `tclocal_PlaceName.csv`（upstream 落後兩個大改版）。改走 monorepo 共用解析器 `data/item_dict/tc_source.py`——本地優先的判斷不在此重寫（DRY：散開＝各處對「什麼算可用的 dump」理解漂移，症狀是名稱靜默退回陸服譯名、沒有測試會紅）。

**地圖 URL（同輪一起修）**：`_code()` 用舊網址的 `/m/` 片段抽圖碼，而 Teamcraft 已把 `lspl/maps.json` 的 `image` 換成 `https://v2.xivapi.com/api/asset/map/<code>/NN` ⇒ `_valid()` 對每張圖都回 False ⇒ `zones.js` 的 `image` 全變空字串、`sf` 全退預設 100，**而且完全沒有錯誤**（欄位只是變空）。改成兩種形狀都認，60/60 zone 重新解析成功。⚠️ 同一個上游變更也讓 marketboard 的 47 張採集地圖縮圖被當孤兒刪除——**形狀比對式的解析都要同時吃兩種網址**。

驗證：validate-data／validate-weather／validate-availability 三 validator 全 PASS ＋ syntax OK；兩種網址實測都回 200。

## 2026-07-20 — DEVLOOP retrofit（旁路 2026-07-20-B-009）
### Added
- `AGENTS.md`（DEVLOOP 權威文件）＋ `docs/BACKLOG.md` ＋本 `CHANGELOG.md`；`CLAUDE.md` 轉 thin adapter（`@AGENTS.md` + CC 專屬注記）（為什麼：claude-skills B-009——本 repo 原無 AGENTS.md，在 fleet-check 常掛 ⚠️、無 VERIFY 基線保護；retrofit 後入隊、可委派、VERIFY 分級可排程。**鐵則/資料流/協作歷程/VERIFY 逐字保留自原 CLAUDE.md、未改內容**；「對齊 DEVLOOP v1.12」戳入開發循環段供 fleet-check）。
### Notes
- 半套 DEVLOOP 工件原已在（`docs/specs/2026-07-17-sightseeing-design.md`、`.adversarial-reviews/`、CLAUDE.md 含鐵則+VERIFY），retrofit 僅補 AGENTS/BACKLOG/CHANGELOG + fleet.json 登記，故低成本。CLAUDE.md thin adapter 刻意**不沿用** sibling 的 superpowers Phase→skill 表（該 plugin 2026-07-17 已退役）。
- VERIFY 基線＝3 validators 全 PASS（validate-data / validate-weather golden / validate-availability 四紅線）＋ 3 syntax check OK（2026-07-20 CC 實測）。fleet.json：移除 `unretrofitted` 旗標、`delegable`→true。
