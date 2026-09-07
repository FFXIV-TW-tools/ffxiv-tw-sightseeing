# 鐵則由來（`AGENTS.md` 的證據層）

> **定位**：`AGENTS.md` 只放「做什麼／禁什麼／權威在哪／怎麼驗證」，每 session 常駐；本檔放「為什麼」——事故經過、實測數字、拍板日期、協作歷程。
> 懷疑某條鐵則、或要改它時才讀。**新增鐵則時**：規則進 `AGENTS.md`，由來進本檔對應段，兩邊用同一個標題對得上。

---

## 規模級別：S（DEVLOOP §5，偏 M 邊界）

**邊界說明（透明化）**：單頁 + 幾個模組（`app`／`weather`／`eorzea-time`／`map_view`）+ 一份大資料 dump；含版控 build pipeline 與 bit-exact 天氣移植，line-count 觸 M 下緣，但為**同站並列功能、非獨立子系統**（無各自 deploy／後端邊界）。故判 **S**（偏 M）——不需 ROADMAP 分解層、不設 Gate 0；日後加後端／帳號再升 M。

## 架構鐵則

- **地圖渲染 vendored**：`modules/map_view.js`／`modules/esc.js`／`styles/90-map.css` 三份是從 `external/ffxiv-tw-marketboard` 搬過來的副本，不是本 repo 原生實作。所以修 bug 的正確順序是先看上游是否已修、改完考慮回饋上游——在此重寫等於製造第二份權威。
- **天氣 bit-exact**：`modules/weather.js` 由 codex 移植，對標 canonical FFXIV 天氣公式，golden 由 `tools/validate-weather.mjs` 守（原驗證器在 gitignored 的 `tmp/`，2026-09-07 複核時版控版本在 `tools/`）。種子演算法的數字改一位就整組時間表偏移，而畫面看起來完全正常。

## 「可進行時間」紅線

2026-07-17 一次修五個 bug 的產物；`tools/validate-availability.mjs` 是那次立的守門。

- **兩閘同時成立**：ET 一天＝4200 秒＝剛好 3 個天氣週期，時間窗與天氣週期**各自循環**；`Math.max(時間等待, 天氣等待)` 只保證「較晚那個到了」，而天氣週期僅 23 分 20 秒，等到窗開時天氣多半已過。實測 80/80 雙閘條目、**67.5% 給錯時間**。
- **`Number(ms)` 收斂**：`Number(null) === 0`（不是 NaN），所以「未知」會被印成「現在」——最糟的假訊息形式：使用者跑去現場而條件根本不成立。
- **掃描窗餘裕**：實測最大間隔（2.7 年模擬）＝天氣 185 週期、天氣∩時間 **447** 週期（#044 南林區雷雨 × ET 08–12）。`SCAN_PERIODS` 改小前先跑測試看餘裕；放大不增成本（找到即 return）。
- **半開區間**：閉區間（`<=`）會讓窗尾多開 1 ET 分＝2.9 秒現實時間，**82 個條目全中**。
- **跨午夜窗**共 21 個條目，`ET.getTimeUntilRange` 已處理 wrap，自行推算＝平行實作。
- **長等待**：交集等待動輒數天（#044 最長 7.2 天），「> 24 小時」分不出 25 小時與 7 天。

## 資料流

- **權威主軸選擇**：名稱／時間窗／表情走遊戲原生 Adventure + Emote sheet（`datamining_tc` 的 `tc_Adventure`／`tc_Emote`），連 HW–DT 的個別名都有官方繁中 ⇒ 不需要也不應該再自譯。
- **座標沿革**：2026-07-18 起 X/Y 改走遊戲原生（`Adventure.Level` → `tc_Level` 的 X/Z ＋ `tc_Map` 的 SizeFactor 標準換算，1 位小數），取代原本的 cycleapple／babelin 社群資料。
- **ARR 無 z 的原因**：遊戲 `Level.Y` 無穩定 world→顯示 Z 換算（全域擬合 129/181 差 > 0.5），且無社群 z 可校準各圖偏移 ⇒ 高度 z 只留 babelin 的 HW–DT 部分，ARR 直接留空，不硬湊。
- **產物路徑**：`data/zones.js`／`data/sightseeing-data.js` 都是 AUTO-GEN。手改產物的結果是下次重跑 build 靜默蓋掉，且沒有任何測試會紅。

## VERIFY

- **CLS `.ss-grid` 預留高度（2026-08-23）**：卡片由 `renderLogs` 非同步填入，填之前這一格是 0 高 ⇒ footer 停在 y≈419（**畫面內**），填完後頁面長到 5 萬多 px、footer 被推出畫面＝一筆 layout shift。本站是全生態 CLS poor 比例最高的一個（CF RUM **59%**），根因就這一發。**內容少的頁面反而更慘**：footer 在首屏內所以位移全額計入；內容多的站 footer 本來就在 fold 外，同樣的成長反而不計。修法＝`min-height: 72svh`（沿用 ranking 既有值）。修後 1366／900／390 ＝ 0.006／0.001／0.011。
- **`tests/run-all.mjs`（2026-08-04）**：`tests/` 底下的測試檔先前沒有任何自動入口會跑到（跨 repo 稽核＝claude-skills 的 `process/tools/check-orphan-tests.mjs`）。run-all 自動掃描 `tests/*.test.{js,mjs}`，新增測試檔不必再記得掛進來。
- **`csp-image-hosts.test.mjs`（2026-08-04，基線 4→5 的那一支）**：Owner 回報「圖片抓不出來」——2026-07-29 上游 Teamcraft 把地圖網址從 `xivapi.com/m/…` 換成 `v2.xivapi.com/api/asset/map/…`，那次修了資料管線的形狀比對卻沒補 `_headers` 的 img-src ⇒ **340 張地圖被自己的 CSP 擋掉**，撐到使用者回報才發現。**這個缺陷零回饋訊號**：伺服器回 200、三支 validator 全綠（欄位有值、格式正確）、build 全綠，而且**上游換網址是別人的改動**，我們這邊本來沒有任何東西會因此變紅。判準因此**由 `data/` 與 `modules/` 反推**該有哪些主機、不寫死清單（寫死的話下次上游再換一個網址一樣不會響）；裸 scheme `https:` 視為涵蓋以免誤報。**已做恆綠自我驗證**：拿掉 img-src 的 v2 即精確指名該紅、還原即綠。⚠️ 初稿正則把主機後的 `/` 寫死，導致 `/api/asset/…` 那支分支永遠比不到、**在真的漏了 v2 的狀態下印綠燈**——寫這類「由資料反推」的哨兵，一定要用真實的缺陷狀態驗它會紅。

## 部署面鐵則（2026-08-01 事故）

- CF Pages 無 build 步驟時把 repo 根整棵目錄當靜態資產上傳 → `AGENTS.md`／`docs/`／`tools/`／`tests/`／`worker/` 後端源碼全部變成該網域下可直接 GET 的公開檔（實測 12/13 站中招）。**private repo 只保護「誰能 clone」，不保護「已部署的檔案誰能下載」**；`.gitignore`（檔是 tracked）／`_headers`（只加標頭）／`robots.txt`（只擋收錄不擋直取）都擋不到。
- **排除清單做不到**：實測當天漏了 `worker/` 106 支 `.ts` 與 `_tools/`／`_cache/` 141 檔——兩次都是「忘記加」。靠紀律維持的安全等於沒有。
- **POSIX 語法**：CF 容器的 `sh` 是 dash，`read -r -d ''` 之類 bashism 會靜默失敗、輸出 0 檔而 build 仍「成功」⇒ **整站 404**，2026-08-01 實際發生。
- **產物路徑並行安全**：ranking B-117（2026-08-15）實證，只做「逐次專屬」而不加鎖**仍然兩份都 exit 1**（撞在 `rm -rf _site`）。現行解＝建到 `_site.tmp.$$`、清單走 repo 外 `mktemp`、換名段用 `mkdir "$_site.lock"` 序列化，哨兵＝`test_deploy_prepare_is_concurrency_safe`。兩次實際故障的訊息（「頂層出現未分類項目」「輸出缺 index.html」）**都指向錯的方向**，看起來像漏加允許清單。
- **cache-bust 假紅燈**：舊部署（發佈 repo 根的那版）留在 CF 邊緣的物件帶 `s-maxage=604800`，命中時回 `text/markdown` 但 header 有 `CF-Cache-Status: HIT` ＋ 大 `Age`。**那是快取殘留不是外洩**，最長 7 天自癒（pages.dev 非自有 zone，dashboard 沒有 Purge Everything，收斂路徑就是等 TTL）。2026-08-01 R3 健檢實測：帶 cache-bust 的 `/AGENTS.md`、`/worker/src/index.js`、`/deploy-allow.txt` 全回 SPA fallback ＝ 現行部署乾淨。
- **分類閘的靜默放行（健檢 R3 D6）**：CF 容器 npm 產物固定 skip 清單與 `git check-ignore` 兩條會讓項目不經分類就過去，所以它只是提醒層；真正的邊界是第 2 段複製迴圈的 allow-list 比對。

## 協作歷程（本工具由 CC 統籌，2026-07-17）

- **CC**：反向工程 2 個 reference 站；發現遊戲原生 Adventure／Emote sheet（權威繁中源，需本地遊戲資料 join、繁中鐵則不外包）→ 親建 `data/zones.js` ＋ `data/sightseeing-data.js`；`index.html` 契約；UI 重設計（field-log 卡片／全部分頁／下一個可進行提示）；全程驗收（headless UI smoke）。
- **codex（gpt-5.6-luna）**：引擎移植 ＋ 主程式 ＋ 樣式（`modules/app.js`／`modules/weather.js`／`modules/eorzea-time.js`、`css/style.css`）。weather 移植 bit-exact 對標 canonical（golden 過）。
- **grok**：原派資料抽取，未交付檔案（只印計畫）→ CC 收回（改用更權威的 Adventure sheet）。

## 舊 `*.pages.dev` 交接機制（2026-09-05 退役）

舊 host 的 301 改由 Cloudflare **帳號層 Bulk Redirects** 在邊緣執行。本 repo 不再有 functions 層的 middleware、HTML 也不再有 inline 交接腳本；`_routes.json` 只列 API 代理路徑，交接測試（handoff.test）／路由清單（route-manifest）已刪。

## 部署（新站建立 SOP）

`gh repo create FFXIV-TW-tools/ffxiv-tw-sightseeing` → CF Pages 連接 → portal `tools.json` 加 entry（icon 🔭、accent cyan、category daily）＋ portal 的 `functions/_middleware.js` ALLOWED 白名單加 `ffxiv-tw-sightseeing.pages.dev` ＋ `_headers` 從 templates 複製。填 `index.html` 的 `<HOST_URL>` ＋ robots／sitemap。完整 SOP＝external 目錄的 `_NEW-TOOL.md`（本機 only，不進 git）。

## 檔案指標複核（2026-09-07）

三層拆分時逐一 Glob／Grep 驗證 AGENTS.md 引用的檔案，兩處指標更新為版控權威：

- `tmp/build_zones.py` → `tools/build_zones.py`（`tmp/` 是 gitignored 的暫存副本，版控權威在 `tools/`）。
- `tmp/validate-weather.mjs` → `tools/validate-weather.mjs`（同上）。
