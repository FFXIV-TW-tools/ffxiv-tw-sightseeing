@AGENTS.md

# Claude 專屬

- 全 repo 鐵則（繁中服正名 / 地圖渲染 vendored 不重寫 / 天氣 bit-exact / portal 設計系統 / 檔案大小 / bounded 快取 / 「可進行時間」四紅線）、資料流 build pipeline、協作歷程、VERIFY 基線與排程分級、開發循環：見上方 `@AGENTS.md`（**不重複**）。
- **Git 邊界**：commit 前知會 shawn（動手前說「我要 commit `<檔>`，訊息 `<msg>`」，不把 stage+commit 塞同一連鎖）；**push 走 STOP**——本 repo 已註冊 fleet canonicalTest，由 Owner 跑 `bash ~/.claude/skills/process/tools/safe-push.sh --repo C:/FFXIVProject/external/ffxiv-tw-sightseeing --reason "<原因>"`（絕對路徑防 `!` cwd 漂移；canonicalTest 綠才推＋JSONL 留痕，2026-07-21 裁示）。**裸 `git push` 被 hook 硬擋、不得繞**，也不要改列 `!git push` 請 Owner 代跑（不經 hook、少一筆 push-log）。憑證排錯：401 ＝ Credential Manager 只在 cmd／git-bash 抓得到，改在 git-bash 重跑。觸發 CF Pages 部署一律 STOP。`tmp/` gitignored（含 build 腳本、reference 源、驗證器、任務書）。
- **改 UI/CSS 前先 Read** portal `../ffxiv-tw-tools-portal/_DESIGN-SYSTEM.md`（設計權威單一來源；cd 進本目錄時 portal CLAUDE.md 不自動載）。
- **改資料 / 天氣 / 可進行時間後必跑** 對應 validator（見 `@AGENTS.md` VERIFY）；改產物先改 `tools/` build 腳本重跑，勿手改 `data/*.js`。
- **模型分工**（tier→型號、複審層級判定）：見全域 `~/.claude/CLAUDE.md` 模型分工表。
- 教訓落點：修完非顯而易見的 bug / 踩坑 → 一兩行寫進 `@AGENTS.md` 對應鐵則（附日期），不另寫 per-cwd memory（external 維護鐵則）。
