# BACKLOG — ffxiv-tw-sightseeing

> 排序即優先序（上=先做）。條目由 agent 提、Owner 排序/否決；Owner 也可直接加。**不經 Owner 核可不得自主實作**。
> 完成打勾並附 cycle；否決用刪除線並留一行原因。格式見 DEVLOOP §4.2。

- [x] **B-002** (P3, perf)【建議 中｜延遲風險 低｜執行風險 低（純新增 `<link>`，不動邏輯、不改模組求值順序）｜副作用 index.html 多 ~0.3KB；新增／刪除 module 後須重跑生成器，哨兵會擋】**展平 ES module 載入瀑布** — `modules/app.js` 在 `</body>` 前，整條鏈是「解析完整份 HTML → 抓 app.js → 解析 → 才發現 4 支相依」。`<head>` 加 4 條 `<link rel="modulepreload">` 讓解析初期就平行抓。本站只 4 支、絕對幅度小於 market（67）與 cosmic（19），但**放 head 的相對收益反而較大**（那兩站入口在 head，本站要等整份 HTML）。⚠️ 清單**生成不手貼**；生成器與哨兵是跨站樣板、各站只准差 `ENTRY` 一行。來源: Owner 指示 2026-08-05 ✓ 完成於 cycle 2026-08-05-B-002（`tools/gen-modulepreload.mjs` ＋ 哨兵 `tests/modulepreload-drift.test.mjs`；run-all 2→3 檔）

- [ ] **B-001** (P2, feature)【建議 中｜延遲風險 低｜執行風險 中｜副作用 觸發 CF Pages 首次部署】上線部署（見 `../_NEW-TOOL.md`）：gh repo create + CF Pages 連接 + portal `tools.json` 註冊（icon 🔭 accent cyan category daily）+ `_middleware` 白名單 + `_headers` + 填 index.html `<HOST_URL>`/robots/sitemap — 不做的後果：工具做好但未公開、portal 無入口。來源: retrofit 2026-07-20（CLAUDE.md 部署未完成）
