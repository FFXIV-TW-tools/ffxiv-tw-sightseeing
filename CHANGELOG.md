# Changelog

> 日期段落制（cycle 收官為段）；條目含人話「為什麼」，不從 git log 自動生成。格式見 DEVLOOP §4.3。

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
