# Changelog

> 日期段落制（cycle 收官為段）；條目含人話「為什麼」，不從 git log 自動生成。格式見 DEVLOOP §4.3。

## 2026-07-20 — DEVLOOP retrofit（旁路 2026-07-20-B-009）
### Added
- `AGENTS.md`（DEVLOOP 權威文件）＋ `docs/BACKLOG.md` ＋本 `CHANGELOG.md`；`CLAUDE.md` 轉 thin adapter（`@AGENTS.md` + CC 專屬注記）（為什麼：claude-skills B-009——本 repo 原無 AGENTS.md，在 fleet-check 常掛 ⚠️、無 VERIFY 基線保護；retrofit 後入隊、可委派、VERIFY 分級可排程。**鐵則/資料流/協作歷程/VERIFY 逐字保留自原 CLAUDE.md、未改內容**；「對齊 DEVLOOP v1.12」戳入開發循環段供 fleet-check）。
### Notes
- 半套 DEVLOOP 工件原已在（`docs/specs/2026-07-17-sightseeing-design.md`、`.adversarial-reviews/`、CLAUDE.md 含鐵則+VERIFY），retrofit 僅補 AGENTS/BACKLOG/CHANGELOG + fleet.json 登記，故低成本。CLAUDE.md thin adapter 刻意**不沿用** sibling 的 superpowers Phase→skill 表（該 plugin 2026-07-17 已退役）。
- VERIFY 基線＝3 validators 全 PASS（validate-data / validate-weather golden / validate-availability 四紅線）＋ 3 syntax check OK（2026-07-20 CC 實測）。fleet.json：移除 `unretrofitted` 旗標、`delegable`→true。
