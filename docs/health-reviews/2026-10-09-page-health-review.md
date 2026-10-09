# 探索筆記頁面完整健檢（2026-10-09）

## 總評：專案體質 7.3 / 10 · 使用者友善 6.9 / 10

**體質尚穩、體驗需排修；不需整站重寫，局部重構較安全。** 涵蓋 15/15 維，沒有 failed/N-A。品質與 A11y 各有 3／1 條 low 截斷，recall C 另截斷 2 條 low，未列出的項目不當成零缺陷。這是修前快照分數，不冒稱修後重新健檢或分數提升。

- 使用者：桌面／行動玩家，主要任務是依版本／地區找點位、看時間天氣交集、複製座標表情、標記完成。
- DEVLOOP v1.44 與 code-quality：以具體失效和可驗證收益決定重構；沒有換語言／runtime／framework 的瓶頸量測，沒有必要整站改寫。
- Pipeline：OMP eval adapter，reviewer→獨立 verifier→A/B/C recall，47 次原生 agent 呼叫、peak concurrent=12；不是 Workflow 工具。逐呼叫 effort 未傳；計數採 spawn 而非 token。agent 類型 repo-auditor，實跑個別模型／訂閱無完整可核對 metadata（設定政策為 Opus，不把設定當實跑證据）；Main 為 openai-codex/gpt-6.1-sol，Main effort／帳號別名未知。
- 原始審查證據留在 gitignored `tmp/phr-2026-10-09/phr-results.json`／cache／journal；本報告保留判斷與證據錨。Owner 未授權 commit、push、部署，未執行這三項。

## 機械基線

快照：`47b0186a915e51dee16c0278787c440ef4fae1f6`，clean，近兩小時無 commit、dirty 0。tracked text 全 i/lf、w/lf，favicon binary；fan-out 後 status 與行尾無變化。以下基線已驗，不重跑確認紅燈。

| 檢查（git-bash） | 結果與證據 |
|---|---|
| `node tools/validate-availability.mjs && node tests/run-all.mjs` | FAIL exit 1；availability PASS，tests 3/4 檔 PASS；icons-drift 的生成授權註解 //→/*! 漂移 |
| `node tools/validate-data.mjs` | PASS exit 0；340 筆、60 zone，契約通過 |
| `node tools/validate-weather.mjs` | PASS exit 0；7 golden 點＋seed |
| weather／eorzea-time／app syntax | 三次分開檢查 PASS exit 0 |
| registry-diff | 19 登記表、9 候選、0 缺席；僅字面目錄覆蓋，不證明完整性 |
| 本機 Chromium runtime | 340 卡、1366px 無整頁 overflow；portal announcements 兩次 ERR_FAILED，這是本機 portal 資源而非本站 JS exception |
| Main 缺陷 probe | hint 按鈕在 1.2 秒後被換掉；`availability(...,4200000000)` nextEpoch 卻是 1791566000000，證明搜尋讀現在時鐘而非參數 |
| production 讀取 probe | cache-bust `/functions/settings-api/%5B%5Bpath%5D%5D.js`→404 text/html；對照 `/modules/ss_list.js`→200 application/javascript，駁回公開原始碼結論 |

初始資產實測（bytes／gzip bytes，Python gzip mtime=0）：app 35461／12232；weather 17126／4212；eorzea-time 9058／2735；map_view 7033／2914；style 18725／5882；sightseeing-data 78476／9446；zones 11018／2072；guides 20974／9128。小圖使用全尺寸底圖是真的，但沒有 WAN 行動網路量測，不能宣稱縮圖改動已提速。

未執行：repo 無 dependency manifest，沒有獨立 npm audit/build/lint 指令；沒有新建全專案型別閘。harness quality-gate 檢查本輪新增診斷；整庫舊診斷不是零。沒有 CF packaging／dashboard／發布；沒有實際螢幕閱讀器語音輸出測試，A11y 判斷依 DOM 與真實焦點行為。

態勢：active。classifyPosture reason=`觀察窗內有 feature 類 commit`；inputs={commitsInWindow:94,daysSinceLastCommit:3,hasFeatureCommit:true,thresholds:{recentDays:90,minCommits:5,maxIdleDays:90}}。

維度 profile：default 11＋4 可選維。`selectOptionalDimensions`／`summarizeSelection` 實跑：納入 4 個可選維（a11y-compat、data-lifecycle、build-release、design-system）；成立訊號：hasFrontendUI、hasPersistence、hasReleaseFlow、hasSharedStyleLayer。其餘七項訊號皆明填 false（ownerAskedMemoryAudit、hasDepManifest、isBackendService、isLibrary、isCrossMachineCLI、isAgentSkillRepo、isDesignSystemSource），unknown=[]。本站有 Pages request handler，但不是長駐後端服务，沒有 library／SDK 公開契約。

## 維度評分

project 權重原始為 .115/.115/.135/.135/.13/.09/.09/.09/.10，三個 project 可選維各 .10，再除以 1.30；user .50/.50＋A11y .10，再除以 1.10。refuted 剔除、partial 用 correctedSeverity；同一 bug 跨維合併，分數仍反映各視角真傷。

| 維度 | 分數 | confirmed 數（含 partial） | 本輪進 BACKLOG 數 | 前輪 fate | 一句話 |
|---|---:|---:|---:|---|---|
| sec-backend | 8.5 | 2 | 0 | — | Origin與來源公開誤報剔除，代理失敗契約缺測 |
| sec-frontend | 8.0 | 3 | 0 | — | 已有 escape/CSP；inline 仍有風險餘裕 |
| correctness-core | 7.0 | 4 | 2 | — | 時間刷新／stale-tab 真缺陷 |
| correctness-data | 7.5 | 7 | 1 | — | 表情錯誤；來源策略需決定 |
| resilience | 7.5 | 4 | 0 | — | 儲存與複製失敗回饋不足 |
| quality | 7.0 | 8 | 0 | — | 局部純核心與import副作用可改善 |
| tests-ci | 6.0 | 8 | 4 | — | 紅閘與validators未接入 |
| docs-drift | 6.0 | 8 | 3 | — | 資料契約／部署事實漂移 |
| perf-data | 7.0 | 5 | 0 | — | 圖片尺寸與重複DOM寫入 |
| perf-ux | 7.0 | 8 | 0 | — | 逐秒提示重建是真失效；圖片延遲未量測 |
| ux-flows | 7.0 | 8 | 0 | — | 結果會過時；複製／IME回饋不足 |
| a11y-compat | 6.0 | 8 | 4 | — | live region與焦點中斷 |
| data-lifecycle | 7.0 | 5 | 0 | — | 常見跨tab覆蓋與損毀blob保護 |
| build-release | 7.5 | 6 | 0 | — | 來源公開主張被404推翻 |
| design-system | 7.5 | 7 | 0 | — | offset／token／footer偏差 |

## recall 層

| 軌 | 觸發機會 | confirmed ≥medium | A 全集沒有的真正盲區 | 結論 |
|---|---|---:|---:|---|
| A 註冊表差集 | 19表／9候選，差集空 | 0 | 0 | 不是完整性證明，不計零產出退場 |
| B 關鍵字擴散 | 16合格鍵，只跑8；1非識別字剔除 | 0 | 0 | 找出4個 low/info 文件漏改，含歷史spec；不修凍結歷史 |
| C 零-context | 僅鐵則／已拍板，不給檔案圖／基線 | 1 | 0 | validators／時間刷新與維度 findings 同義，非獨有發現 |

沒有同範圍前輪；C 盲重抓率分母=0，分母不足，不宣稱未知缺陷 recall。無 refuted critical/high，故盲重驗未觸發，不計零產出。

## 須修改項目（必做）

- **動態時間篩選與排序** [correctness-core]：`modules/app.js` filtered() 231-246；tick() 368-382；medium。見修復計畫批次1–3。
- **多分頁完成紀錄覆蓋** [correctness-core]：`modules/app.js` loadDone/saveDone 128-134；init 386；change handler 487-505；medium。見修復計畫批次1–3。
- **展示／鼓勵表情指令** [correctness-data]：`tools/build_data.py` L109-111 EMOTEID_CMD；產物 data/sightseeing-data.js L1750-1751（hw#043 征龍像）、L1789-1790（hw#046 板岩連峰）；medium。見修復計畫批次1–3。
- **逐秒 live region** [a11y-compat]：`index.html` index.html:187；modules/app.js updateCard/tick/render（約 300-313、369-382、357-363）；high。見修復計畫批次1–3。
- **逐秒提示 DOM 取代** [a11y-compat]：`modules/app.js` updateNextHint 約 174-232；tick 381；medium。見修復計畫批次1–3。
- **提示跳轉與 reduced-motion 焦點** [a11y-compat]：`modules/app.js` hint click handler 約 509-511；toTop 約 516；medium。見修復計畫批次1–3。
- **卡片控件可辨識名稱** [a11y-compat]：`modules/app.js` copyBtn 約 258-264；card() 約 270-276、288；modules/map_view.js:43；medium。見修復計畫批次1–3。
- **生成圖示漂移造成驗證紅燈** [tests-ci]：`modules/ss_icons.js` L3（對照 ../ffxiv-tw-tools-portal/tools/gen-site-icons.mjs:82）；medium。見修復計畫批次1–3。
- **canonicalTest 資料與天氣檢查缺口** [tests-ci]：`devloop.json` L2；AGENTS.md L19、L52-55；medium。見修復計畫批次1–3。
- **seed golden 可跳過與對照不足** [tests-ci]：`tools/validate-weather.mjs` L14-31；medium。見修復計畫批次1–3。
- **代理 fail-closed 契約缺覆蓋** [tests-ci]：`functions/settings-api/[[path]].js` L41-49、L78；medium。見修復計畫批次1–3。
- **單一資料契約漂移** [docs-drift]：`data/schema.md` L9-10, L39-40, L58-71, L80-82, L87-88；medium。見修復計畫批次1–3。
- **部署狀態文件漂移** [docs-drift]：`docs/BACKLOG.md` L8；devloop.json notes；README.md L7；docs/rules-rationale.md L60-62；medium。見修復計畫批次1–3。
- **pipeline 操作文件漂移** [docs-drift]：`tools/README.md` L6-7, L12-18, L21, L24-32；medium。見修復計畫批次1–3。

14 條超過約10條 WIP 提醒線：以核心狀態／A11y、領域資料／閘、文件三批收斂；不因數量降格缺陷。跨維同病（完成覆蓋、時間刷新、hint重建、schema）只入庫一次。

## 建議修改項目／需 Owner 拍板

完整方向、選項、tradeoff 與建議見 [修復計畫](2026-10-09-page-fix-plan.md)。需拍板軸是縮圖資產策略、CSP/upstream 切換、同版本資料/fallback、真正同時跨 tab 交易、CF 端驗證位置，以及損毀進度的備份／確認重置 UX；本次不動公開契約／安全邊界、不自動重置使用者資料。非缺陷功能（匯入匯出、跨裝置、編號搜尋、virtualization、immutable cache）不自行擴題。

安全可逆的 low 同本次修：IME、剪貼簿fallback回饋、first-visit判準、unique labels、原圖host preconnect、64px offset、token/長標題/footer漂移、import不寫產物、dead helper與重複CSV helper、now傳遞、null守門、天氣正名。

其餘 low/info 的不入庫理由：入場閘拒 low/info、沒有已證明失效的純新增測試/功能不立票；歷史 spec 與日期紀錄不回寫；vendor 新 pin／事件委派應上游先行，不能本站獨立重寫。部署 cleanup 的暫存檔生命週期已安全修復並以隔離成功／失敗 fixture 驗收；CF 環境與安全邊界提案仍待決。

## 誤報／校正

Pipeline 原始：83 confirmed、21 partial、3 refuted、0 null verdict。Main另駁回 sec-backend:A2／track-c:A6 的公開GET推論：兩維內不一致，以 production404＋control200為證。不能因本機_site有檔就說線上公開。

- Origin跨站寫入兩條 refuted：上游僅feedback允POST，MIME application/json閘阻 simple request；UUID capability，不是cookie/session授權。不新增本站Origin特殊攔截解錯問題。
- 表情原始錯誤成立，但Main任務書曾提出 /showleft／/encourage；權威TextCommand查證推翻，正式修法是 **展示 /me、鼓勵 /rally**。官方 [me](https://na.finalfantasyxiv.com/lodestone/playguide/db/text_command/e6571131914/)／[rally](https://na.finalfantasyxiv.com/lodestone/playguide/db/text_command/a338b32e140/)，Emote23→424、34→435。
- 天氣正名官方本機tclocal_Weather：19黑暗、118/129無盡光、120/121末日、149/196磁暴；部分原 finding 在初審寫查無，verifier修正。
- 縮圖 medium 改 low：確有 2048px 解碼但無可感知延遲量測；settings CDN 缺 SRI 降 info：共享可變檔不能直接鎖 hash；資料來源混版降 low：不是已證明目前 340 筆錯誤。
- old AGENTS PASS 不是當前測試結果；依 DEVLOOP 現行規則指向完整驗證紀錄，不為維持舊「4 支」敘事關檢查。

21 partial 不等於21次降級；下附逐項original→corrected可核對，不拿refuted數判verifier品質。補證的八個spread jobs都是readonly，不冒稱跑過commands/tests。

## Memory／文件稽核

未納 memory-audit、不讀／刪／搬個人記憶。CLAUDE 只有19行，純前端措辭與AGENTS現況引用需修但沒有全面精簡必要。現行README/schema/toolsREADME/BACKLOG/devloop/AGENTS漂移已列範圍；歷史CHANGELOG與approved spec保留原文，rationale的舊→新遷移紀錄本來正確。

## 既有設計亮點

project：天氣seed canonical／bounded快取；交集掃描、half-open、null契約；AUTO-GEN權威資料；tracked allowlist／拒symlink／缺binding fail-closed。user：340點完整分版、清除空狀態、複製未完成清單、共用codex設計、lazy地圖及座標退路、72svh首屏預留。

## finding 證據錨（審查原始，不因修復倒改）

| 複合鍵 | 原始→查證severity／verdict | 檔案與位置 | 主張 |
|---|---|---|---|
| sec-backend:A1 | medium→info / refuted | `functions/settings-api/[[path]].js` onRequest L53-55 | 代理無條件覆寫 Origin，替跨站請求洗白上游 Origin 白名單 |
| sec-backend:A2 | low→low / confirmed | `deploy-allow.txt` 第 9 行 functions；deploy-prepare.sh L73-87 複製迴圈、L101-106 清理規則不涵蓋 .js | functions/ 列在 deploy-allow，Pages Function 原始碼會以靜態檔公開 |
| sec-backend:A3 | low→low / confirmed | `functions/settings-api/[[path]].js` L42-49 binding_missing、L57-70 upstream 失敗、L74-78 標頭；export __test | 代理安全契約零測試覆蓋，__test 匯出無人使用 |
| sec-backend:A4 | info→info / confirmed | `functions/settings-api/[[path]].js` L61、L74-77 | 上游呼叫無 timeout／AbortSignal，上游回應標頭整包透傳 |
| sec-frontend:S1 | medium→info / refuted | `functions/settings-api/[[path]].js` onRequest，約第 55-58 行 | settings-api 代理無條件覆寫 Origin，讓上游的 Origin 白名單失效 |
| sec-frontend:S2 | low→low / confirmed | `_headers` 第 18 行 script-src；modules/map_view.js:51-52、117-118（onerror 屬性） | CSP script-src 帶 'unsafe-inline'，map_view 的 inline onerror 也依賴它 |
| sec-frontend:S3 | low→info / partial | `index.html` index.html:49-59；modules/app.js:263-269 copyBtn | portal CDN 腳本（header/usage/settings-client）沒有 SRI，copy 按鈕的屬性轉義也交給遠端 FFXIVIcons.btnHTML |
| sec-frontend:S4 | low→low / confirmed | `_headers` 第 2 行註解、第 18 行 script-src/style-src/img-src/media-src/font-src | CSP 放行沒有任何程式載入的舊 portal 主機，_headers 檔頭說明也與現況不符 |
| correctness-core:A1 | medium→medium / confirmed | `modules/app.js` filtered() 231-246；tick() 368-382 | 「僅顯示可進行」篩選與「依可進行時間排序」只在 render 時計算，tick 不重篩也不重排 |
| correctness-core:A2 | medium→medium / confirmed | `modules/app.js` loadDone/saveDone 128-134；init 386；change handler 487-505 | 完成狀態採整包寫入，沒有 storage 事件同步，多分頁時後寫入者會覆蓋前者 |
| correctness-core:A3 | low→low / confirmed | `modules/weather.js` findNextWeather 448-470；app.js nextWeather 64-71 | 單天氣閘的 nextMs 不依賴傳入的 now：findNextWeather 內部讀 Date.now，迴歸只驗雙閘 |
| correctness-core:A4 | low→low / confirmed | `modules/app.js` change handler 505 對照 render 358 | 勾選完成後，首訪橫幅的顯示判準與 render() 不一致 |
| correctness-data:A1 | high→medium / confirmed | `tools/build_data.py` L109-111 EMOTEID_CMD；產物 data/sightseeing-data.js L1750-1751（hw#043 征龍像）、L1789-1790（hw#046 板岩連峰） | EMOTEID_CMD 把 鼓勵(34)→cheer、展示(23)→showoff：/cheer 實際是 加油(6)，showoff 不是遊戲指令 |
| correctness-data:A2 | medium→low / partial | `tools/build_data.py` L41-45 _tc_csv("PlaceName")；L64-65 LEVEL/MAPS；L48、L106 sources/tc_Adventure.csv、tc_Emote.csv | 同一次 build 混用三種來源版本：PlaceName 走 tclocal 本地優先，Level/Map 硬寫 upstream，Adventure/Emote 用 repo 內 vendored 快照 |
| correctness-data:A3 | medium→low / partial | `data/schema.md` L39-40, L45-48, L61-67, L81-82, L87-88 | data/schema.md 這份「單一資料契約」和實作嚴重脫節（來源、emote 對照、路徑全過時） |
| correctness-data:A4 | medium→low / confirmed | `tools/build_data.py` L134-159（合併迴圈）、L190-194（報告） | zoneKey 取自社群來源，交叉核對與座標 fallback 都只印警告、不讓 build 失敗 |
| correctness-data:A5 | low→low / confirmed | `tools/README.md` L6-7, L21, 建置順序 L9-18 | tools/README 寫的前置依賴與權威描述過時 |
| correctness-data:A6 | low→low / confirmed | `modules/weather.js` L10-34 NamesTW | weather.js 手寫的 NamesTW 有 3 個名稱和官方 tclocal_Weather 不一致 |
| correctness-data:A7 | info→info / confirmed | `tools/build_data.py` level_coords L71-82；data/zones.js L106 | Level.Map 和地區底圖可能是不同圖層（例：ARR#014 御道 Level.Map=73 w1t2/02，底圖用 w1t2/01） |
| resilience:A1 | medium→low / partial | `modules/app.js` saveDone L134、savePrefs L138；呼叫端在 change handler 約 L487-495 | 完成紀錄與偏好寫入 localStorage 失敗時被空 catch 吞掉，使用者看不到任何提示 |
| resilience:A2 | medium→medium / confirmed | `modules/app.js` init() 開頭 `state.done = loadDone()`、saveDone L134；modules/ 內沒有 'storage' 事件監聽 | 多分頁 last-writer-wins：saveDone 用啟動時的快照整包覆寫，其他分頁的勾選會靜默遺失 |
| resilience:A3 | low→low / partial | `modules/app.js` grid click handler L464-479 | 卡片複製鈕在沒有 navigator.clipboard 時靜默無反應；portal 的 toast 缺席時，失敗也完全沒有回饋 |
| resilience:A4 | low→info / partial | `modules/app.js` init() 結尾 `setInterval(() => tick(ui, Date.now()), 1000)` 約 L529；tick L368-382 | 1 秒 setInterval 永不停止，也不會在分頁隱藏時暫停 |
| quality:A1 | medium→low / confirmed | `tools/build_data.py` L17（from build_zones import ZONES）；build_zones.py L180-205 寫檔段落位在模組頂層，沒有 __main__ 守門 | build_data.py 用 import 取 ZONES，會連帶執行整支 build_zones.py，順便重寫 data/zones.js |
| quality:A2 | medium→low / confirmed | `tools/build_data.py` L30-43（_tc_csv 複本）、L77-78（LEVEL/MAPS 硬寫路徑）；build_zones.py L26-39 | _tc_csv 在兩支腳本中逐字複製，而且 Level/Map 讀取繞過 tc_source 的 local-first 判斷 |
| quality:A3 | medium→low / confirmed | `modules/app.js` L57-72（getWeatherWait/nextWeather）、L531-534；weather.js L448-450；tools/validate-availability.mjs L12-19 | 可測純核心埋在 app.js：import 就會跑 init；findNextWeather 自己讀 Date.now()，availability(entry,z,now) 對 now 不是純函式 |
| quality:A4 | medium→low / confirmed | `modules/app.js` init() L383-530；L358 vs L505；L447-451 vs L464-477；L457 vs L485 | init() 約 148 行，重複邏輯已經長出行為分歧（first-visit 判準、剪貼簿降級、toast 寫法） |
| quality:A5 | medium→low / confirmed | `modules/app.js` L134 saveDone、L138 savePrefs、L457/L485 地圖開啟 | 完成紀錄與偏好寫入用 catch {} 靜默吞錯，違反繼承的「except:pass 禁」 |
| quality:A6 | low→info / partial | `modules/ss_list.js` L2-4、L9-10、L13、L16；app.js L29-30、L37-40 | app.js 與 ss_list.js／esc.js 重複實作 pad、時間正規化、escape，清單輸出已經和卡片口徑分歧 |
| quality:A7 | low→low / confirmed | `modules/eorzea-time.js` L125-141 isTimeInRange；L63-81 getWeatherPeriod/Name；weather.js L418-438 forecastWeather、L476 getAvailableZones | eorzea-time.js 留有未使用、而且行為錯誤的 isTimeInRange 平行實作，AGENTS 紅線還把它列為受守函式 |
| quality:A8 | low→low / confirmed | `modules/weather.js` L36、L420、L449；eorzea-time.js L22；app.js L102 | 天氣週期常數散落四處，其中一處是死常數 |
| tests-ci:T1 | high→medium / partial | `modules/ss_icons.js` L3（對照 ../ffxiv-tw-tools-portal/tools/gen-site-icons.mjs:82） | canonicalTest 現為紅燈：icons-drift 因 portal 生成器改用 /*! 授權註解而漂移 |
| tests-ci:T2 | high→medium / confirmed | `devloop.json` L2；AGENTS.md L19、L52-55 | validate-data／validate-weather 沒掛進 canonicalTest 也沒進 run-all，鐵則 3 的 golden 在推送閘上是空的 |
| tests-ci:T3 | medium→medium / confirmed | `tools/validate-weather.mjs` L14-31 | 天氣 golden 只有 7 個點，種子檢查可能靜默跳過，版控的 reference snapshot 沒拿來比 |
| tests-ci:T4 | medium→medium / confirmed | `functions/settings-api/[[path]].js` L41-49、L78 | settings-api proxy 副本在本 repo 沒有測試，__test export 沒人用，和 portal 正典之間也沒有 drift 檢查 |
| tests-ci:T5 | medium→medium / confirmed | `modules/app.js` L14、L26-27、L36、L128-134；data/guides.js L5 | 完成 key／itemId 格式、guides 鍵、ARR 前後半分界這些不變量都沒有測試 |
| tests-ci:T6 | low→low / confirmed | `modules/app.js` L95、L107（availability／nextBothOK） | 紅線「禁 Number(ms) 收斂」只寫在散文裡，app.js 現在就有這個寫法 |
| tests-ci:T7 | low→low / partial | `tools/validate-weather.mjs` L1；tools/validate-data.mjs L1；CHANGELOG.md L68；AGENTS.md L55 | 驗證文件和 validator 註解漂移（tmp/ 遷移沒改乾淨、run-all 計數過時） |
| tests-ci:T8 | info→info / confirmed | `modules/map_view.js` 整檔；modules/esc.js、styles/90-map.css | 高 ROI 缺口（不是缺陷）：vendored 地圖沒有 drift 哨兵、純模組沒有 @ts-check |
| docs-drift:A1 | medium→medium / confirmed | `data/schema.md` L9-10, L39-40, L58-71, L80-82, L87-88 | data/schema.md（AGENTS 指定的資料契約單一來源）與 validator、產物多處矛盾 |
| docs-drift:A2 | medium→medium / confirmed | `docs/BACKLOG.md` L8；devloop.json notes；README.md L7；docs/rules-rationale.md L60-62 | B-001「上線部署」已實際完成，BACKLOG、devloop.json、README、rationale 仍描述為未部署 |
| docs-drift:A3 | medium→medium / confirmed | `AGENTS.md` L55（另見 docs/BACKLOG.md L6「run-all 2→3 檔」） | AGENTS VERIFY 基線是 08-04 的快照：數量、組成與綠燈狀態都已過期 |
| docs-drift:A4 | medium→medium / confirmed | `tools/README.md` L6-7, L12-18, L21, L24-32 | tools/README 仍寫「座標才用社群源」，前置清單也漏列 tc_Level／tc_Map／tc_source |
| docs-drift:A5 | medium→low / confirmed | `README.md` L10-14, L16-30 | README 的資料來源與檔案清單停在初版 |
| docs-drift:A6 | low→low / confirmed | `tools/validate-data.mjs` L1；tools/validate-weather.mjs L1；tools/build_zones.py L11；tools/README.md L32；data/schema.md L39 | validator 檔頭用法、zone-mapping.md 位置仍指向退役的 tmp/ 路徑 |
| docs-drift:A7 | low→low / confirmed | `AGENTS.md` L65 | AGENTS 的 syntax check 指令一次給兩個檔，eorzea-time.js 實際不會被檢查 |
| docs-drift:A8 | low→low / partial | `AGENTS.md` L10, L47 | AGENTS 規模判準寫「無後端」，並把「坐下」列為錯字 |
| perf-data:P1 | medium→low / partial | `data/zones.js` 各 zone 的 image 欄位；modules/map_view.js:49；styles/90-map.css:16-20 | 184px 內嵌縮圖載入全尺寸地圖底圖，全捲 all 分頁最多 60 張（量級未量測） |
| perf-data:P2 | low→low / confirmed | `index.html` index.html:55-57；../ffxiv-tw-tools-portal/header.js:1245-1267,1902,1928-1931 | header.js 在 index 自己的 defer settings-client.js 執行前就動態再插一份同 URL script |
| perf-data:P4 | low→low / confirmed | `modules/app.js` updateCard() 313-314 | 天氣圖示 img.src 每秒對每張 gated 卡無條件重設 |
| perf-data:P5 | low→low / confirmed | `index.html` index.html:46 | 地圖遷移到 v2.xivapi.com 後，preconnect 仍指向舊 host，且帶 crossorigin 與圖片連線池不符 |
| perf-data:P3 | info→info / confirmed | `modules/app.js` filtered() 231-246；render() 346-354；tick() 374-379；init 528-529 | availability 每次 render 算兩次、init 算三次；gated 卡每秒重掃結果穩定的交集 |
| perf-ux:P1 | high→medium / partial | `data/zones.js` zones.js:8-141 等 60 區 image 欄；modules/map_view.js:52 renderInlineMap；css/style.css:17 --ss-map-w | 152px 卡片小圖實際下載並解碼 2048×2048 全尺寸地圖 |
| perf-ux:P2 | medium→low / confirmed | `modules/app.js` app.js:411 input listener；render 346-367；filtered 231-269；card 270-296 | 搜尋 input 沒有 debounce／不管 IME 組字，每次輸入都整頁重建最多 340 卡並把 availability 算兩遍 |
| perf-ux:P3 | medium→medium / confirmed | `modules/app.js` updateNextHint 177-230（211 行 innerHTML）；tick 368-381 每秒呼叫；css/style.css @media(max-width:40rem) .ss-nh-list 橫捲 | 提示列每秒整塊 innerHTML 替換，打斷手機橫向捲動與點按 |
| perf-ux:P4 | low→low / confirmed | `modules/app.js` render 346-353；card 270-296；css/style.css .ss-card / .ss-grid | 首次與每次切換分頁都同步建出全量 340 卡，約 1.7 萬節點，沒有 content-visibility |
| perf-ux:P5 | low→low / confirmed | `index.html` index.html:45-46 | preconnect 對不到實際圖片來源：xivapi.com 帶 crossorigin（img 用不到），v2.xivapi.com 完全沒有 preconnect |
| perf-ux:P6 | low→low / confirmed | `modules/app.js` tick 373-379 → updateCard 297-315（314 行） | tick 每秒對約 82 張受限卡無條件寫 DOM，含重設同一個 img.src |
| perf-ux:P7 | info→info / confirmed | `index.html` index.html:52-58；../ffxiv-tw-tools-portal/header.js:1246,1899-1903,1928-1931；settings-client.js:30 | portal header.js 在 defer 階段就自己注入 settings-client.js，跟頁面 document.write 的同一支 defer script 重複評估 |
| perf-ux:P8 | info→info / confirmed | `_headers` _headers /*.js、/*.css 區段 | 所有 JS/CSS（含 4504 行資料檔）都設 max-age=0 must-revalidate，回訪仍要逐一重驗證 |
| ux-flows:A1 | medium→low / confirmed | `modules/app.js` loadDone/saveDone L127-134；init 內的 grid change handler | 同時開多個分頁時，完成紀錄會互相覆蓋 |
| ux-flows:A2 | medium→medium / confirmed | `modules/app.js` tick() / filtered() | 開著「僅顯示可進行」或「依時間排序」時，結果不會隨時間更新，空狀態會一直停在那裡 |
| ux-flows:A3 | low→low / confirmed | `modules/app.js` init → grid change handler（「剛勾成完成的卡立即移除」那段） | 開著「隱藏已完成」時誤點完成，卡片立刻消失，沒有復原入口 |
| ux-flows:A4 | low→low / confirmed | `modules/app.js` init → grid click handler 的 copy 分支；ui.copy click handler | 複製失敗的分支會靜默失敗：瀏覽器沒有 Clipboard API 時單卡複製沒有任何反應；portal 沒載入時複製清單成功也沒有可見回饋 |
| ux-flows:A5 | low→low / partial | `modules/app.js` init → ui.search 'input' listener | 搜尋框沒有處理 IME 組字，打注音時每個組字步驟都整頁重繪並閃出空狀態 |
| ux-flows:A6 | low→low / confirmed | `modules/app.js` wait() L40；updateCard 的 weather/time 列 | 等待時間未知時，顯示「計算中」，看起來像還在載入 |
| ux-flows:A7 | info→info / confirmed | `modules/app.js` STORE/saveDone L13, L134；index.html L174 KPI data-help | 〔建議功能，非缺陷〕完成進度只存在 localStorage，不能匯出／匯入或跨裝置同步 |
| ux-flows:A8 | info→info / confirmed | `modules/app.js` filtered() | 〔建議功能，非缺陷〕搜尋不支援編號和表情名稱 |
| a11y-compat:A1 | high→high / confirmed | `index.html` index.html:187；modules/app.js updateCard/tick/render（約 300-313、369-382、357-363） | #log-grid 設為 aria-live=polite，裡面卻有逐秒倒數與整格替換，螢幕閱讀器會持續被插話 |
| a11y-compat:A2 | medium→medium / confirmed | `modules/app.js` updateNextHint 約 174-232；tick 381 | 「可進行提示」每秒用 innerHTML 整塊重建，焦點元素被替換再 focus，觸控點擊與橫向滑動也會中斷 |
| a11y-compat:A3 | medium→medium / confirmed | `modules/app.js` hint click handler 約 509-511；toTop 約 516 | 點提示卡只捲動不移焦點；reduced-motion 下唯一的定位提示（flash）消失，JS 的 smooth 捲動也不受 reduced-motion 控制 |
| a11y-compat:A4 | medium→medium / confirmed | `modules/app.js` copyBtn 約 258-264；card() 約 270-276、288；modules/map_view.js:43 | 每張卡的控件都同名：兩顆「複製」、「標記完成」、「放大地圖」，無法區分是哪一卡、哪一欄 |
| a11y-compat:A5 | low→low / confirmed | `modules/app.js` grid change handler 約 494 | 開啟「隱藏已完成」時勾選完成，卡片立即 remove，鍵盤焦點掉回 body |
| a11y-compat:A6 | low→low / partial | `modules/app.js` updateCopyAvailability 約 337-342；copy click 約 426-428；index.html:166-170；portal header.js 約 946（helpIsInteractive → helpHide） | 互動控件上的 data-help 說明只有滑鼠 hover 看得到；aria-disabled 的「複製待探索清單」在觸控／鍵盤下點了沒有任何回饋 |
| a11y-compat:A7 | low→low / confirmed | `css/style.css` style.css:109-113 | 卡片標題強制單行省略，320–390px 下長名稱被截斷，觸控無法看到全名 |
| a11y-compat:A8 | low→low / confirmed | `modules/app.js` init 約 395 | 搜尋框在注音輸入組字期間每個 input 事件都整格重繪 |
| data-lifecycle:P1 | medium→low / confirmed | `modules/app.js` init L386、change handler L487-494、saveDone L134 | 跨分頁 lost update：每個 tab 寫回各自的 state.done 快照，會蓋掉其他分頁剛勾的完成紀錄 |
| data-lifecycle:P2 | medium→low / confirmed | `modules/app.js` loadDone L128-133 | 完成紀錄損毀時會被當成空集合，使用者第一次勾選就永久覆蓋原始 blob |
| data-lifecycle:P3 | medium→low / confirmed | `modules/app.js` saveDone L134、savePrefs L138、change handler L493-506 | 寫入失敗（quota／SecurityError／儲存被封鎖）全被空 catch 吞掉，UI 卻照常顯示「✓ 已完成」 |
| data-lifecycle:P4 | low→low / confirmed | `modules/app.js` loadDone L131、loadPrefs L135；tests/ 下 grep `sightseeing-completed`/`loadDone` 零命中 | 兩把 storage key 的 schema 相容性（舊物件格式、prefs 欄位）沒有任何機械測試，只靠 CHANGELOG 聲明 |
| data-lifecycle:P5 | low→low / confirmed | `index.html` L174（KPI data-help）；modules/app.js 全檔無 export/import UI | 完成紀錄沒有任何匯出／匯入路徑，還原手段為零（已誠實揭露，但只放在 hover help） |
| build-release:A1 | medium→info / refuted | `deploy-allow.txt` 第 9 行 `functions`；deploy-prepare.sh:78-89 複製迴圈；本機 _site/functions/settings-api/[[path]].js | functions/ 被列進 deploy-allow，Pages Function 原始碼會以靜態檔形式發佈到 /functions/… |
| build-release:A2 | medium→low / partial | `deploy-prepare.sh` 全檔（Build command = sh deploy-prepare.sh）；devloop.json canonicalTest；repo 無 .github/ | CF build 只跑 deploy-prepare.sh、不跑任何 validator，「綠測試→上線」閘只靠 repo 外的本機 safe-push |
| build-release:A3 | low→low / confirmed | `docs/BACKLOG.md` 第 8 行 B-001；devloop.json notes；docs/rules-rationale.md:62 | 部署狀態文件過期：B-001／devloop.json 仍寫「未部署」，但站點早已上線 |
| build-release:A4 | low→low / confirmed | `CHANGELOG.md` 第 111 行；對照 CHANGELOG.md:31 刪除 handoff.test／route-manifest | CHANGELOG 說「測試守 functions／_routes.json 歸類」，但守門測試已刪，現在沒有東西守 _routes.json 與 functions 路由的一致性 |
| build-release:A5 | low→low / confirmed | `deploy-prepare.sh` 76-90 行 | symlink 中止路徑沒清掉 .deploy-filelist.tmp，殘檔不在 gitignore 也不在 allow/deny，下次本機 build 會被分類閘擋下 |
| build-release:A7 | low→low / confirmed | `modules/ss_icons.js` 第 1-3 行；tests/icons-drift.test.mjs | 生成檔 modules/ss_icons.js 與 portal 正典生成器漂移（授權註解格式 // → /*!） |
| build-release:A6 | info→info / confirmed | `_site/robots.txt` _site/ 整體（gitignored） | 本機 _site/ 是過期產物，與 HEAD 不一致 |
| design-system:A1 | medium→low / confirmed | `css/style.css` L7, L15, L21, L28, L65, L84, L103, L108, L150, L164, L172, L177 | style.css 約 14 處 var() fallback 與 portal tokens 現值不一致（spacing、fs-xs、soft 色、shadow） |
| design-system:A2 | medium→low / confirmed | `index.html` L88（第二段 inline <style>） | 手機版 inline style 把 body padding-top 改成 56px，違反 header.css 的 64px !important 契約 |
| design-system:A3 | low→low / confirmed | `index.html` L63-75, L89 | index.html inline :root 與 style.css 的 --ss-* 是兩套並存的 alias 層，其中 9 個 alias 無人引用；.container 用字面量 1200px |
| design-system:A4 | low→low / confirmed | `css/style.css` L174 | .ss-page-foot a 選擇器過寬，覆寫了共用 [data-hub-link] 的 muted 色 |
| design-system:A5 | low→low / confirmed | `css/style.css` L177-182；index.html L199 | .ss-to-top 寫死 z-index、陰影 rgba、transition 時長，並以 title 提供提示 |
| design-system:A6 | low→info / partial | `css/style.css` L107, L109 | 卡片編號／標題的 font-size 用字面量，沒有走流體字級 token |
| design-system:A7 | low→low / confirmed | `css/style.css` L71-72, L74 | 「現在可進行」組的 hover/soft 底用 color-mix 自調 14%/16%，與 warn 組用 token 的寫法不對稱 |
| track-c:A1 | high→medium / partial | `devloop.json` canonicalTest；AGENTS.md:52,55；tests/run-all.mjs | canonicalTest 沒跑 validate-weather（seed bit-exact golden）和 validate-data（340 筆契約／正名禁詞） |
| track-c:A2 | medium→low / partial | `modules/app.js` L57-63 getWeatherWait；L87-88 nextBothOK；L98 availability | availability／getWeatherWait／nextBothOK 仍用 Number() 收斂 waitMs、msUntil，違反「禁 Number(ms) 收斂」紅線 |
| track-c:A3 | medium→medium / confirmed | `modules/app.js` filtered() L233-247；tick() L372-386 | 「僅顯示可進行」和「依可進行時間排序」只在 render 時算一次，tick 不會重新篩選或排序 |
| track-c:A4 | medium→low / partial | `functions/settings-api/[[path]].js` onRequest L44-52；export __test L83 | settings-api proxy 的「缺 binding 回 503、禁 fetch fallback」紅線沒有任何測試守護 |
| track-c:A5 | low→low / partial | `modules/map_view.js` renderInlineMap L25-31、L47-49；openMapModal L88-92；styles/90-map.css .map-pin/.map-inline-pin | vendored map_view.js／90-map.css 落後上游 marketboard（B-050 pin 元件、CSP onerror 委派） |
| track-c:A6 | low→low / confirmed | `deploy-allow.txt` functions 一行；_site/functions/settings-api/[[path]].js | functions/ 被列進 deploy-allow，proxy 原始碼會以靜態檔發佈 |
| track-c:A7 | low→info / partial | `modules/weather.js` findNextWeather L448-451；app.js nextWeather L64-66 | findNextWeather 忽略呼叫端的 now，只看天氣閘的條目在 availability(entry,z,now) 下不是純函式 |
| track-c:A8 | low→low / confirmed | `tools/README.md` L21；tools/validate-data.mjs:1；tools/validate-weather.mjs:1；docs/BACKLOG.md B-001；devloop.json notes | 文件與現況漂移：README 仍寫「座標才用社群源」，validator 用法仍指 tmp/，BACKLOG/devloop 仍記「部署未完成」 |
| spread:refsite:A1 | low→low / confirmed | `tools/validate-data.mjs; tools/validate-weather.mjs` validate-data.mjs:1; validate-weather.mjs:1 | tools/ 兩支 validator 的檔頭用法說明仍寫 `node tmp/...`（tmp→tools 遷移時漏改） |
| spread:refsite:A2 | low→low / confirmed | `tools/build_zones.py` L11 vs L23 | build_zones.py docstring 寫輸出到 `tmp/zone-mapping.md`，實際寫到 tools/zone-mapping.md |
| spread:_tc_csv:A1 | low→low / confirmed | `tools/build_zones.py` L5-7（模組 docstring「輸入」段）vs L26-44（_tc_csv 與實際讀取） | build_zones.py 的 docstring 仍寫輸入是 upstream 的 datamining_tc/tc_PlaceName.csv，B038 改成 _tc_csv 本地優先後沒有一起更新 |
| spread:tmp/validate:A1 | info→info / confirmed | `docs/specs/2026-07-17-sightseeing-design.md` L42-43（## VERIFY） | 已核准設計 spec 的 VERIFY 段仍寫 tmp/ 底下的 validator 指令 |

## 後續追蹤

- **B-003–B-016：14/14 已修並驗收**；`planBacklogAppend()` 入庫 14、blocked 0，跨維同病只入一票。B-001 更正為既有上線已完成，不冒稱本輪部署。
- **局部重構**：純 availability 與 storage 邊界拆離 app；不是框架／runtime 重寫。tick 只在 only/sort 啟用時重篩／重排，其他檢視僅更新 gated 卡；相同 membership 保留卡與 hint DOM。使用者 key／array／legacy object schema 不變。
- **驗收**：[完整摘要](2026-10-09-page-fix-verification.md)。canonical＋syntax exit 0，資料／天氣＋tests 9/9 PASS；雙閘 8834 次往返誤報 0／未知 0。真實 Chromium 行使 only 266→262、sort 重排、IME、兩 tab 完成／取消、損毀 blob 保護、寫拒絕／複製 fallback、鍵盤與 reduced-motion／地圖 modal；1366／390／320px 無整頁 overflow。原缺陷 now 忽略的忠實 mutant 使指定 now 的測試轉紅。
- **生成額外發現並修正**：本機台服 PlaceName 將三地名分隔號寫成 `・`，generator 主表仍為 `·`，首次重生丟掉地圖。依權威原文更正主表後 60/60 地圖解析、340 條無警告；產物語意只有三地名分隔號及兩表情指令變更，沒有座標／底圖精度下降。
- **順手修**：部署暫存清單加 POSIX exit/signal cleanup；獨立 scratch packaging 成功 3 檔及缺 tracked CSS 失敗 exit 1 都移除清單，不改 allowlist 或出貨安全閘。
- **未提交／未推送／未部署**：本輪沒有這些授權；新模組仍須正常提交後才會進 tracked-only 出貨。分數維持修前 7.3／6.9，不虛構修後提升。
- **修復複審 FR-1 已重現並修正**：初審找到一個 low——寫入失敗仍保留勾選，下次成功讀寫才消失。改為成功才提交 UI 完成狀態，失敗立即還原，不增加 pending overlay 或更換儲存模型。實際 Chromium 驗證失敗勾選／失敗取消、後續成功、損毀原文與第二 tab 的 storage event；storage 4/4、app syntax PASS。這是 B-004 既有儲存修復的限定收斂，不重開一票、不把初審 incorrect 改寫為 PASS。
- **獨立收斂**：計畫 gate 的 F1–F7 經原 handle 修正確認 PASS；修復初審 FR-1 經 Main 重現、修正及實際 smoke，再由原 handle 限定確認 correct／resolved，無新缺陷。原始 review、confirmation 與 Main triage 分開保存，不改 reviewer 原文。計畫 reviewer 實跑 anthropic/claude-opus-5-5；修復 reviewer 回傳 Grok 4.7（provider／effort 未提供），不冒稱正式 DEVLOOP assurance fact／blind。Main 為 openai-codex/gpt-6.1-sol，effort／帳號通道不可得。
