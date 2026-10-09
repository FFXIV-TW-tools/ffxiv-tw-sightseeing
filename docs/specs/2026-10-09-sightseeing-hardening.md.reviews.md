# Sightseeing hardening native review evidence

### hardening-pre-fact-1 sha256:476e57ce50c37d5b8273117e5288df543eb4d49f32c27e5f227b7432e9ea4778

```json
{
  "role": "reviewer-claude (fact)",
  "phase": "pre",
  "cycle": "2026-10-09-sightseeing-hardening",
  "revision": "health-fix-candidate3+hardening-design1",
  "materials": {
    "manifest": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md.materials/cc05019ddafdd56946ed05f27cde48093cda397d11081b73d9f173f4c7352178.json",
    "pathsConfirmed": "manifest paths 列出 12 檔，與 pre-materials.md 各節一致",
    "noteSha256InSnapshot": "02e3ae4a2cf953788d019e60e74657efdeb7679f41dac196c5bdef8daea18151",
    "extraLiveRead": "只因 snapshot 截斷，額外讀取 live _headers:18 一行，以取得完整 CSP（default-src 'self' … font-src … data:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'）。未比對該檔 live 與 snapshot 的 sha。"
  },
  "verdict": "五項契約方向都可實作，但目前 note 有 3 個 High 缺口：canonical snapshot 並行重讀沒有順序保證、native 結構層 sheet 沒有欄位錯位防線、manifest／CSP hash 的 bytes 正規化未定義。建議先補這 3 項再動工；其餘 Medium／Low 可在實作計畫中寫明處理方式。",
  "findings": [
    {
      "id": "F1",
      "severity": "High",
      "blocking": true,
      "location": "note §IndexedDB 與遷移 第3段；app.js 現行 change handler 與 storage listener（pre-materials.md ~L1157-1170）",
      "trigger": "本 tab 寫入完成後的重讀，與 BroadcastChannel、visibilitychange、pageshow 觸發的重讀同時在途。readonly transaction 可以並行執行，彼此的完成順序沒有保證；note 也沒有要求序號或 revision。",
      "impact": "較舊的 snapshot 可能晚到並覆蓋較新的 UI，導致已勾項目消失或已取消項目回來。這正是 note 想避免的倒灌，只是從寫入結果換到重讀結果。",
      "minimal_fix": "在完成集合 record 加 revision，於同一個 readwrite transaction 內遞增。UI 只套用 revision 大於目前已顯示值的 snapshot；或改用 latest-request token，只套用最後發出的那次讀取。"
    },
    {
      "id": "F2",
      "severity": "High",
      "blocking": true,
      "location": "note §同版資料 第1段；Program.cs `PanicOnSheetChecksumMismatch = false`（pre-materials.md L1865）、Sanity() 只對名稱層檢查是否含 CJK（L2456-2500）、檔頭註解說 Level/Map/TerritoryType 刻意不在此（L1817-1819）",
      "trigger": "sightseeing 模式用 Lumina.Excel 7.5.0 的 typed schema 讀台服 client 的 Adventure/Level/Map。台服版本與 global schema 不同；關閉 checksum panic 後，欄位錯位不會報錯。",
      "impact": "座標、SizeFactor、Offset、Level→Map 讀錯欄時，exporter 照樣產生『同一 clientVersion、SHA 正確』的 snapshot，manifest 只證明 bytes 沒被改，不證明內容正確。",
      "minimal_fix": "sightseeing 模式對每張目標 sheet 加 hard gate：欄位定義 checksum 相符，或用已知列 oracle（Adventure 有名列 = 340、SizeFactor 在合理集合、換算座標落在 1–42、少數已知 Adventure→Level→Map 對應）。失敗就不發布；340 筆逐欄對帳另外保留。"
    },
    {
      "id": "F3",
      "severity": "High",
      "blocking": true,
      "location": "note §同版資料（manifest 驗 bytes）、§CSP（hash check）、§CF build（Node validators）；Program.cs Dump() 用 StreamWriter.WriteLine（L2418-2440）、Sha256 直接對檔案 bytes 計算（L2404-2408）",
      "trigger": "exporter 與 hash 工具在 Windows 執行；.NET 在 Windows 上 WriteLine 換行是 CRLF（.NET 一般行為，非本輪實測）。若 git 的 eol／autocrlf 設定在 commit 或 checkout 時轉換換行，CF 的 Linux checkout bytes 會和本機算 SHA 時不同。",
      "impact": "CF 上 source manifest 或 inline-script hash validator 會失敗並擋住出貨；若反過來在本機正規化後才算，瀏覽器實際收到的 bytes 又可能和 hash 不符，CSP 就會擋掉 bootstrap。",
      "minimal_fix": "note 定義 canonical bytes：tools/sources/** 與 index.html 在 .gitattributes 設 `-text` 或 `eol=lf`，exporter 明確寫 LF；hash 與 SHA 一律對 git blob 或 LF bytes 計算，並由 CF 端 validator 驗證同一份 bytes。"
    },
    {
      "id": "F4",
      "severity": "Medium",
      "location": "note §同版資料『同一 clientVersion』；Program.cs ReadClientVersion() 找不到 ffxivgame.ver 時回傳 \"unknown\"（L2411-2415）",
      "trigger": "sqpack 路徑換了，或 ffxivgame.ver 不存在。",
      "impact": "manifest 會寫入 clientVersion=\"unknown\" 並照常發布，『同版』無法核驗。",
      "minimal_fix": "sightseeing 模式下 clientVersion 為 unknown 或空值時，非零退出且不發布。"
    },
    {
      "id": "F5",
      "severity": "Medium",
      "location": "note §同版資料『輸出至本 repo tools/sources，不發布 monorepo 名稱層 dump』；Program.cs DefaultOutDir() 預設指向 monorepo data/item_dict/datamining_tc（L2508-2518）；Publish() 搬檔前先刪 outDir 的 tclocal_manifest.json（L2369-2375）",
      "trigger": "新模式沿用 DefaultOutDir 或 Publish()，或忘了帶 --out。",
      "impact": "monorepo 名稱層的 manifest 被刪或被覆寫，其他 consumer 會整批忽略 dump，違反『正常 exporter 模式與其他 consumers 不變』。",
      "minimal_fix": "sightseeing 模式強制使用明確 --out（或解析到 sightseeing repo 的 tools/sources），用獨立的 manifest 檔名、staging 目錄與發布函式，不呼叫既有 Publish()，也不使用 monorepo 的預設路徑。"
    },
    {
      "id": "F6",
      "severity": "Medium",
      "location": "note §同版資料 第2段；build_data.py 的 zoneKey 來自 cycleapple region / babelin zone（L1485-1500 一帶）；build_zones.py 用 lspl/maps.json 的 dungeon/housing/default 過濾、image URL 與 _CODE_RE 選圖（L1606-1650、L1750-1765）",
      "trigger": "cutover 後社群來源只剩天氣、高度與引導，但 note 沒寫 zoneKey 如何從 native 推出（Level.Map→Map.PlaceName？要區分上層／下層甲板），也沒寫 native Map.Id 怎麼組 image URL；dungeon/housing 的過濾在 native 只有 Map 的情況下如何保持等價也沒寫。",
      "impact": "實作者可能偷偷保留 babelin 的 zone 當 zoneKey 來源（違反來源政策），或改了選圖結果與圖片主機；逐欄對帳可以抓到差異，但 note 沒有判定何者合法的規則。",
      "minimal_fix": "note 補三點：zoneKey 的 native 推導規則；image URL 模板固定為 `https://v2.xivapi.com/api/asset/map/{Map.Id}`（與現行主機和路徑一致）；過濾規則與 maps.json 等價的依據，或是否加入 TerritoryType。"
    },
    {
      "id": "F7",
      "severity": "Medium",
      "location": "note §同版資料『先完整解析與驗證，再發布生成檔；錯誤保留前一個好產物』；build_zones.py main() 直接 open(OUT_JS,'w')、build_data.py 直接 open(OUT,'w')，兩支各自寫檔，warns 只印出、不改退出碼",
      "trigger": "驗證在第二支 generator 才失敗，或寫檔途中中斷。",
      "impact": "data/zones.js 與 data/sightseeing-data.js 可能來自不同 snapshot，或其中一檔被截斷，違反『不改好產物』。",
      "minimal_fix": "兩個產物視為同一批：全部驗證通過後寫入暫存檔，最後一起 rename；任何 warning 或缺值都非零退出。新 snapshot 的 CSV 表頭列數（現行 Adventure 用 [4:]、Dump 寫 3 列表頭）也要在 note 定死。"
    },
    {
      "id": "F8",
      "severity": "Medium",
      "location": "note §CF build『資料…source manifest』validators",
      "trigger": "CF 端不跑 Python generator，只能檢查 data/*.js 的形狀與 sources 的 SHA。",
      "impact": "有人改了 snapshot 卻沒重新生成 data，或手改 data，CF 驗證仍會通過，同版契約在出貨閘上無法證明。",
      "minimal_fix": "generator 把 source manifest 的 sha256 與 clientVersion 寫進 data/*.js 的 metadata；Node validator 核對它和 tools/sources 的 manifest 一致。"
    },
    {
      "id": "F9",
      "severity": "Medium",
      "location": "note §IndexedDB 第3段（不留假勾選）；app.js init() 同步 loadDone 後立即 render（L1100 一帶）、updateFirstVisit 以 state.done.size 判斷（L1000 一帶）、tick() 在 only/sort 開啟時每秒 render，updateCard 會把 checkbox.checked 設回 state.done 的值",
      "trigger": "改用 async IDB 後：(a) 初次 snapshot 回來前 state.done 是空的；(b) 使用者勾選後 transaction 尚未 complete 時，tick 觸發了 render。",
      "impact": "(a) first-visit 卡片、badge 與『隱藏已完成』篩選先用空集合畫出、再跳成正確值，造成 CLS 與錯誤畫面；(b) checkbox 在寫入途中被改回舊值、完成後再翻回來，使用者可能重複點擊。",
      "minimal_fix": "定義 loading 與 pending 狀態：初次 snapshot 回來前不顯示依賴完成集合的 UI（維持現有的『正在整理』狀態）；寫入中的 ID 進 pending 集合並暫時 disable／aria-busy，render 時以 pending 值顯示，complete 後再以 canonical snapshot 為準。"
    },
    {
      "id": "F10",
      "severity": "Medium",
      "location": "note §IndexedDB 第2段（保留 legacy key 不改寫不刪除；切換後只寫 IDB）",
      "trigger": "部署當下，舊版 app.js 的 tab 仍開著，遷移後繼續往 ffxiv-sightseeing-completed 寫入。",
      "impact": "這些勾選只存在 legacy key，新版本永遠不會再讀，進度會無聲遺失。",
      "minimal_fix": "遷移時在 marker 記下 legacy raw；之後每次載入若 legacy raw 與記錄不同，就顯示 codex 警告，提供合併（只加不減）或下載。至少要偵測並告知，不能無聲忽略。"
    },
    {
      "id": "F11",
      "severity": "Medium",
      "location": "note §損毀恢復；§IndexedDB 第2段；ss_storage.js readCompleted 遇損毀會 throw（L1349-1360）",
      "trigger": "legacy 損毀（例如 JSON 是 \"null\"、字串，或 array 混入非字串），或 IDB record 型別錯誤。",
      "impact": "note 沒定義以下狀態：(1) 損毀時是否允許勾選寫入；(2) legacy 損毀時要不要設 migration marker、要不要以空集合起步；(3) 非 JSON 的 structured-clone 值如何序列化下載；(4) 重置時『與備份 snapshot 相同』靠什麼比對；(5)『保留原始備份』存在哪裡。不同 tab 可能做出不同解讀，造成重置競態或資料被覆蓋。",
      "minimal_fix": "補一張狀態表：損毀時禁止寫入，只允許下載與重置；legacy 損毀時不設 marker，只保存 raw。備份時用 F1 的 revision 加 raw 指紋；reset transaction 比對 revision 與指紋，不一致就拒絕並要求重新備份；寫明 raw 備份保存在 DB 的哪個欄位或 store，且 reset 不刪除。"
    },
    {
      "id": "F12",
      "severity": "Medium",
      "location": "note §CSP『驗證 CSP 下正常圖片及失敗回饋』；_headers 註解寫『本機 dev server 不套 _headers ⇒ 只在線上生效』；index.html bootstrap 在 localhost 時 base=http://localhost:8774/…",
      "trigger": "本輪不授權部署，只能本機驗證；但本機 dev server 不送 CSP，而 localhost 分支載入的 portal 主機又不在 script-src 內。",
      "impact": "要嘛根本沒驗到 CSP，要嘛為了本機放行 localhost 而改了政策，結果驗到的不是出貨政策；正式分支（xivtc.com）下的 portal 與 error 委派從未在 enforce 狀態下跑過。",
      "minimal_fix": "note 寫明驗證方式：用能送出 _headers 原樣 CSP 的本機 server，並用非 localhost 主機名（或強制 production base）跑正式分支；記錄 console 沒有 CSP violation。"
    },
    {
      "id": "F13",
      "severity": "Medium",
      "location": "note §CSP（script-src-attr 'none'、只授權 bootstrap hash）；app.js 使用 window.FFXIVIcons.btnHTML、FFXIVHelp、FFXIVToast 等 portal 產生的 markup；portal 的 header.js、usage.js、settings-client.js 不在 materials 內",
      "trigger": "portal 的 runtime 若注入 on* 屬性、javascript: URL、inline <script> 或 eval。",
      "impact": "移除 unsafe-inline 加上 script-src-attr 'none' 後，portal header、設定、工具提示或 toast 可能悄悄失效，靜態檢查也抓不到。",
      "minimal_fix": "實作前盤點 portal 正式資產有沒有上述用法，並把結果寫進 note；有的話先修正，或明列為不支援，而不是放寬政策。【本輪不可驗：資產不在 manifest】"
    },
    {
      "id": "F14",
      "severity": "Medium",
      "location": "note §CF build；deploy-prepare.sh 頂層分類閘（L300-325）以及 `rm -rf \"$OUT\"; mkdir -p \"$OUT\"`（L298）",
      "trigger": "(a) 新增頂層 `.node-version`；(b) validator 已經通過，但後段的複製、minify 或 LEAK 閘失敗。",
      "impact": "(a) 若沒列進 deploy-deny.txt，分類閘會讓每次 build 失敗（fail-closed 但會擋出貨），deny 清單不在 materials 內，不可驗；(b) 失敗發生在 rm -rf 之後，本機上一份 _site 已經被刪，和『任一失敗保留前一個 _site』的字面不符（CF 上的前一版部署不受影響）。",
      "minimal_fix": "note 寫明 `.node-version` 列入 deny 清單；把『保留前一 _site』限定在 validator 失敗，或改成建到暫存目錄、全部閘通過後再 mv 成 _site。"
    },
    {
      "id": "F15",
      "severity": "Low",
      "location": "note §同版資料（TextCommand）；build_data.py 寫死的 EMOTEID_CMD 為英文指令（L1468-1470）",
      "trigger": "Lumina 以 TraditionalChinese slot 讀 TextCommand 時，Command 與 Alias 欄位可能是中文或英文 [INFERENCE]。",
      "impact": "emoteCmd 可能從 /lookout 這類英文指令變成在地化字串，屬於使用者可見的複製內容變更。",
      "minimal_fix": "指定使用哪個欄位（Command 或 Alias），並把現行 11 個 emote 對應列成對帳基準；有差異就列為合法變更，或讓 build 失敗。"
    },
    {
      "id": "F16",
      "severity": "Low",
      "location": "note §CSP『JSON-LD 的 SHA-256』；index.html 的 `<script type=\"application/ld+json\">`",
      "trigger": "CSP 不約束不可執行的 data block。",
      "impact": "把 JSON-LD 納入必要 hash 不增加安全性，只會讓 SEO 文案修改觸發 hash 變動；不影響正確性。",
      "minimal_fix": "hash 只要求可執行的 inline script，validator 改成『執行型 inline script 必須都有對應 hash』。"
    },
    {
      "id": "F17",
      "severity": "Low",
      "location": "note §IndexedDB（未提 versionchange）",
      "trigger": "之後 DB schema 升版時，舊 tab 仍持有連線。",
      "impact": "新 tab 的 open 一直 blocked，看起來像資料庫不可用。",
      "minimal_fix": "open 後設 db.onversionchange 關閉連線，並提示重新整理；onblocked 時顯示明確訊息。"
    }
  ],
  "contract_judgements": {
    "csp": "Conditional pass。error 委派可行：marketboard 的 ensureImgErrorHandler 在 renderInlineMap 一開始就註冊 document capture listener，早於 card() 建立 img；sightseeing 的 inline img 沒有 data-full，所以直接進入 failed 狀態，和現行 inline onerror 語意相同，沒有原圖 fallback，也不會引入縮圖造成 CLS。但缺 F3、F12、F13。",
    "same_version_data": "Fail as written。缺 F2、F3、F4、F5、F6、F7、F8；manifest 的 bytes 驗證本身不足以證明同版或內容正確。",
    "indexeddb_migration": "Conditional。單一 store 上的 readwrite 序列化能保證不同 ID 不遺失、同 ID 後者生效，marker 與集合同一 transaction 也能做到遷移冪等；但缺 F1、F9、F10、F17。",
    "corruption_reset": "Conditional。確認流程與跨 tab 失效的方向正確，但比對依據與狀態機未定義（F11，依賴 F1 的 revision）。",
    "cf_build": "Conditional。validators 放在 rm -rf 之前，符合 validator 失敗時保留產物；deployment 邊界不變；缺 F3、F8、F14。"
  },
  "no_blocker_statement": "有阻擋：F1、F2、F3 建議在實作前先修正 note。",
  "uncovered": [
    "portal 的 header.js、usage.js、settings-client.js 與 FFXIVIcons/FFXIVHelp/FFXIVToast 的實際 markup（不在 manifest）",
    "styles/90-map.css、css/style.css：.map-inline--failed 與 .ss-map-empty 是否真的顯示失敗回饋（不在 manifest）",
    "deploy-allow.txt、deploy-deny.txt、.gitattributes、git eol 設定（不在 manifest）",
    "ss_visual.js、weather.js、ss_availability.js 與既有 tests/*.mjs validator 內容",
    "tools/sources 現行 CSV 與 extracted.json 的實際格式",
    "Lumina 對 language-neutral sheet（Level/Map）在 TraditionalChinese slot 下的行為 [INFERENCE，未驗]",
    "CF zone 層設定（Rocket Loader 等）是否改寫 HTML，屬 dashboard 範圍，不可驗"
  ],
  "out_of_scope_one_liners": [
    "weather 圖示 img（.ss-wx）沒有錯誤處理，與本輪契約無關，不展開。"
  ],
  "run_metadata": {
    "actual_model": "anthropic/claude-opus-5-5（取自 harness workstation context；未經 native session 核驗）",
    "provider": "anthropic",
    "effort": "unknown",
    "native_identity": "unknown",
    "tool_rounds_used": 17,
    "commands_executed": "無；只有唯讀的 read/grep，沒有跑 build、lint、tests、formatters，也沒有寫檔",
    "sandbox": "非 OS sandbox；靠自律維持唯讀"
  }
}
```

### hardening-pre-blind-1 sha256:e5457e878126bbf20eb129b90401c30856834ea5a74da6d727656f22a3da0d2c

```json
{
  "overall_correctness": "incorrect",
  "confidence": 0.86,
  "explanation": "核准的五項 cutover 還不能照文實作。任務書 PreReview.md 與 pre-materials.md 都找不到；實際依據是 pre snapshot cc05019d…，revision health-fix-candidate3+hardening-design1，deliverySha256 f13abcef…。spec 與 blob 02e3ae4a… 的 SHA-256 一致。沒有跑 build、lint、tests 或 formatter，也沒有解包 client。CSP：只有 bootstrap 與 JSON-LD 是無 src 的 inline script；hash 生效後 unsafe-inline 失效，若再加 strict-dynamic，既有 host 不再放行 header.js／script-src 也沒有 localhost:8774。script-src-attr none 會讓現行 onerror 不執行，css 要等 map-inline--failed 才顯示座標退路；上遊 listener 遇到 dataset.full 會改 src 並 return。native：生成器依固定欄位，現有 Dump 只寫欄位子集；manifest 只對三個 JSON 做 SHA-256，缺 ffxivgame.ver 仍發佈 unknown；Publish 先刪正式 manifest 再搬檔。emoteCmd 仍是手寫表。選圖規則拆在過濾與最小 id，空 image 仍能過現行 validator。IndexedDB：整筆 put 會蓋掉其他分頁已改的不同 ID；較早的重讀會把 checkbox 設回舊值；重置若刪掉含 marker 的 record，下次會從保留的 legacy key 再遷回來。CF：.node-version 不在 deny 清單會先被分類閘擋下；rm -rf _site 在副檔名白名單之前，失敗時好產物已消失。現行 Node validator 不驗 snapshot bytes，也不拒絕空 zone.image。未覆蓋：Lumina Map.Id 對 xivapi 路徑沒有 client 實測；settings-client 沒有對 script-src-attr none 跑過；340 筆逐欄、IDB 雙 tab、下載後重置都沒有可執行證據。",
  "findings": [
    {
      "title": "CSP hash 加 strict-dynamic 會擋掉 portal 啟動",
      "priority": 1,
      "confidence": 0.9,
      "file_path": "docs/specs/2026-10-09-sightseeing-hardening.md.materials/blobs/a12dd207bfe99ef75910a175276c1e0de6295f34930ecdeddf8acbc5f2101b6e",
      "line_start": 53,
      "line_end": 62,
      "body": "觸發：依核准文移除 script-src 的 unsafe-inline，只留兩段 inline 的 SHA-256，並若再加 strict-dynamic。事實：index.html 只有 bootstrap 與 JSON-LD 沒有 src；bootstrap 在 parse 期 document.write 出 https://xivtc.com/ 的 header.js 與 usage.js，這兩支沒有 nonce。hash 一旦生效，瀏覽器忽略 unsafe-inline；strict-dynamic 再使既有 host 失效。本機分支寫 http://localhost:8774/，凍結 _headers 的 script-src 沒有這個 origin，且本機 dev server 不套 _headers。最小建議：script-src 只放兩段實際 inline 的 SHA-256 與既有 host，不要加 strict-dynamic，也不要把 localhost 寫進出貨政策；hash 檢查要掃每一個沒有 src 的 script。"
    },
    {
      "title": "圖片失敗後座標退路不會出現",
      "priority": 2,
      "confidence": 0.88,
      "file_path": "modules/map_view.js",
      "line_start": 49,
      "line_end": 50,
      "body": "觸發：script-src-attr 'none' 生效後地圖圖片載入失敗。事實：本站 map_view.js 的 inline 與 modal 圖仍用 onerror 加 map-inline--failed／map-img-failed。css/style.css 第 123–124 行要等這個 class 才把「地圖暫時無法顯示」顯出來。上遊 marketboard map_view.js 第 27–31 行在 dataset.full 存在且 src 不同時改 src 並 return，不加失敗 class；本站沒有縮圖也沒有 data-full。最小建議：在 innerHTML 之前掛 document capture listener，只對 .map-inline-img 與 .map-modal-img 加既有失敗 class，不要移植 dataset.full 與 mapThumbUrl。"
    },
    {
      "title": "native 欄位子集與 manifest 不能證明同一 client 版本",
      "priority": 3,
      "confidence": 0.9,
      "file_path": "tools/build_data.py",
      "line_start": 39,
      "line_end": 75,
      "body": "觸發：把現有 Dump 改成只輸出本工具要的欄位後直接生成。事實：build_data.py 跳過 4 列後讀 r[12] 當名稱，Level.Map 當 lv[8]、SizeFactor／Offset 當 mp[8..10]。Program.cs 的 Dump 只寫三列表頭與需要的欄。Publish 只對三個 JSON 做 SHA-256，CSV 只記列數；缺 ffxivgame.ver 仍回傳 unknown 並繼續發佈；PanicOnSheetChecksumMismatch 為 false。先刪正式 manifest 再搬檔，中斷後舊的好產物已不在。emoteCmd 仍來自第 98–99 行手寫表，validator 只釘展示→me、鼓勵→rally。最小建議：獨立輸出目錄與 manifest，每個輸出檔都有 bytes SHA-256；版本讀不到或 checksum 不合就非零退出且不呼叫現有 Publish。依欄名取欄，emoteCmd 只從同一份 TextCommand 來。"
    },
    {
      "title": "選圖規則不在 Map sheet，空圖仍能通過驗證",
      "priority": 4,
      "confidence": 0.84,
      "file_path": "tools/build_zones.py",
      "line_start": 57,
      "line_end": 72,
      "body": "觸發：改為只讀 native Map 的 Id、PlaceName、SizeFactor、Offset 來選圖。事實：現行取最小 id 的主場景圖，但 dungeon、housing、default 過濾在另一段；圖片 URL 來自 lspl/maps.json 的 image，不是 Map sheet。解析失敗時寫入空 image 與 sf 100。validate-data.mjs 只查筆數、座標 0–45 與 zoneKey 存在，不拒絕空圖；host 仍是 v2.xivapi.com 時 csp-image-hosts 也不紅。最小建議：同時保留 _valid 與過濾；URL 模板寫死現有 v2 路徑；兩份產物先寫暫存，驗證過才一起換名。"
    },
    {
      "title": "整筆寫回會蓋掉並行進度，重置會被 legacy 再遷入",
      "priority": 5,
      "confidence": 0.86,
      "file_path": "modules/app.js",
      "line_start": 474,
      "line_end": 485,
      "body": "觸發：兩個 tab 同時初始化，或一個已遷移後另一個才把預先組好的集合 put 進去；以及重置後再開頁。事實：核准文允許 transaction 外先組好結果再整筆寫回，會蓋掉其他 tab 已改的不同 ID。現行靠 storage 事件重讀；改 IndexedDB 後這個事件不再代表完成集合。updateCard 會把 checkbox 設成較早讀到的值。重置若清掉含 marker 的 record，保留且不刪的 ffxiv-sightseeing-completed 會在下次開啟時再遷回來。最小建議：同一個 readwrite transaction 內 get；已有 marker 就不得重寫集合。重置只清空完成 ID，marker 留下。重讀帶序號，較舊結果不得寫回 UI。舊版分頁仍寫 legacy key 時要提示重新整理。"
    },
    {
      "title": "CF 分類閘與提前刪除 _site 破壞保留產物",
      "priority": 6,
      "confidence": 0.92,
      "file_path": "deploy-prepare.sh",
      "line_start": 42,
      "line_end": 60,
      "body": "觸發：依核准文新增 .node-version，並讓 validator 失敗時保留前一個 _site。事實：deploy-prepare.sh 對頂層未分類名稱直接失敗；skip 清單與 deploy-deny.txt 都沒有 .node-version。第 42 行在複製前 rm -rf _site；第 130–140 行的副檔名白名單在刪除之後才跑，失敗時好產物已經沒了。現行 Node validator 不對 snapshot bytes，也不要求 zone.image 非空。最小建議：.node-version 寫進 deploy-deny.txt，並比對 node -v。組裝改到暫存目錄，白名單通過才換掉 _site。Node 閘要驗 manifest bytes，拒絕空 zone.image，並比對已提交 data/*.js 的投影雜湊。"
    }
  ]
}
```

### hardening-pre-fact-confirm-1 sha256:6c14602a51a18be8812e7c0ef5465c85b7aec1e3566cb9b96ea25efe23f02e84

```json
{
  "role": "reviewer-claude (fact) — pre confirmation，不是新初審",
  "scope": "只確認原 F1–F17 已採納的修正是否寫進 note 正文；不提新題目、不寫檔、不跑 build/lint/tests/formatter",
  "binding": {
    "before_manifest": "cc05019ddafdd56946ed05f27cde48093cda397d11081b73d9f173f4c7352178",
    "after_manifest": "6d65fbab971b205879bd7660f06b5e1e0e009b70293e3df88b1eadb825122d99（revision health-fix-candidate3+hardening-design2）",
    "coverage": "020ecea2173209b5586178358372517d616f3abe97b48b9e4d563354fbcb2c6d：changes 只有主 note 一檔，02e3ae4a… → b5e8716f…；其餘 11 檔的 sha 與 before 相同",
    "note_blob": "blobs/b5e8716f847945b43313d1efbcd51f6ab33320922e920c776e27b354b6804a09。已用 grep 確認 blob 含修訂後的段落，例如 request token、BE0F5D9A、拒絕 CRLF、列 deploy-deny；這些段落與 current note:1-80 的文字一致",
    "not_verified": "我沒有自己重算 sha256（唯讀工具無法計算），所以 blob 與 current 檔的綁定只核到內容一致，hash 值未核"
  },
  "confirmations": [
    {
      "id": "F1",
      "confirmed": "yes",
      "evidence": "§IndexedDB 第3段：所有 snapshot 重讀共用遞增 request token，只有最後發出的讀取能更新 UI（含錯誤狀態），並明說不以重讀 canonical 冒充順序保證",
      "remaining": "無"
    },
    {
      "id": "F2",
      "confirmed": "yes",
      "evidence": "§同版資料 第2段：TextCommand/PlaceName/Level/Map 四張保持 checksum hard gate；Adventure/Emote 實測 checksum 不符，改用 RawRow，先 hard-check 全部 type/offset/欄數；附 oracle（2162688、Level 4876856、Emote 22、TextCommand 423）；schema、join、有效座標或 340 筆基線任一失敗就不發布",
      "remaining": "probe 與 oracle 是 Main 的實測結果，我沒看到原始輸出，標為不可驗"
    },
    {
      "id": "F3",
      "confirmed": "yes",
      "evidence": "§同版資料 第3段：exporter 輸出 UTF-8 無 BOM、LF 後才算 SHA；沿用既有 .gitattributes 的全域 LF 與 HTML LF；Node 拒絕 CRLF 漂移",
      "remaining": "(a) .gitattributes 不在 manifest 內，『既有全域 LF』這個說法我無法核。(b) 正文只寫 exporter 明設 LF，沒寫 Python 生成器寫 data/*.js 時要用 LF。現行的 open(...,'w') 在 Windows 預設寫 CRLF；generation manifest 又綁定產物 bytes SHA，所以會被 Node CRLF 閘擋下。這是 fail-closed，不會靜默出錯；最小補充是生成器明設 newline='\\n'。"
    },
    {
      "id": "F4",
      "confirmed": "yes",
      "evidence": "§同版資料 第1段：版本為空或 unknown、或解包前後版本改變時，非零退出且不發布",
      "remaining": "無"
    },
    {
      "id": "F5",
      "confirmed": "yes",
      "evidence": "§同版資料 第1段：強制明確 --out，不用 DefaultOutDir/Publish，使用獨立的 staging/manifest/發布函式，不動 monorepo 名稱層",
      "remaining": "無"
    },
    {
      "id": "F6",
      "confirmed": "yes",
      "evidence": "§同版資料 第4段：zoneKey 路徑為 Level.Map→Map.PlaceName→PlaceName→ZONES，城市依 Map.PlaceName 分上下層；圖碼 regex 與最小 map ID 規則保留；URL 固定為 v2.xivapi.com/api/asset/map/{Id}；缺值一律失敗",
      "remaining": "無（原 maps.json 的 dungeon/housing 過濾改由圖碼 regex 加 340 筆逐欄對帳涵蓋，屬可接受的設計選擇）"
    },
    {
      "id": "F7",
      "confirmed": "yes",
      "evidence": "§同版資料 第5段：同一 CLI 在記憶體完成兩份資料並驗證後，寫暫存再發布；失敗前不開正式產物；rename 失敗會回復本批；明說不承諾跨斷電原子性；舊 CSV 固定表頭列數的假設已移除，改用具名 header",
      "remaining": "無"
    },
    {
      "id": "F8",
      "confirmed": "yes",
      "evidence": "§同版資料 第5段與 §CF build：generation manifest 綁定 native manifest SHA、clientVersion、補充來源 SHA 與產物 bytes SHA，由 CF Node 閘核對",
      "remaining": "無（CRLF 的部分見 F3 第(b)點）"
    },
    {
      "id": "F9",
      "confirmed": "yes",
      "evidence": "§IndexedDB 第3段：初次讀取完成前維持整理中狀態與首屏 min-height，不用空集合顯示 badge 或 first-visit；寫入中的 ID 進 pending，並 disabled/aria-busy，render/tick 不會翻回舊值；失敗時回滾",
      "remaining": "無"
    },
    {
      "id": "F10",
      "confirmed": "yes",
      "evidence": "§IndexedDB 第2段：每次讀取與 legacy 的 storage 事件都比對原文漂移，持續警告、提供備份並要求刷新；不靜默合併",
      "remaining": "無"
    },
    {
      "id": "F11",
      "confirmed": "yes",
      "evidence": "§損毀恢復 兩段加狀態表：損毀時禁寫；legacy 損毀時不寫 marker；用 cursor 分辨『不存在』與『值為 undefined』；非 JSON 的 structured-clone 值不冒稱已備份、不准 reset，原 DB 保留；reset 在同一 transaction 比對精確 JSON 指紋；recovery-backup key 只保存一份",
      "remaining": "無（recovery-backup 只保留最後一次，已明寫，下載檔才是完整備份）"
    },
    {
      "id": "F12",
      "confirmed": "yes",
      "evidence": "§實測方式 第1點：owned localhost server 送出 _headers 的原樣政策，用非 localhost 主機別名走正式 base；明定不放寬政策，且一般無 CSP 的本機 smoke 不能抵這項",
      "remaining": "屬 runtime 驗收，pre 階段不能驗"
    },
    {
      "id": "F13",
      "confirmed": "yes",
      "evidence": "§實測方式 第2點：實作前對 portal bootstrap 三支與 root JS 做靜態盤點（HTML handler、javascript URL、eval），正式 runtime 再驗證；發現不相容時先查來源，不放寬 CSP",
      "remaining": "盤點結果尚未產生，pre 階段不能驗"
    },
    {
      "id": "F14",
      "confirmed": "yes",
      "evidence": "§CF build：.node-version 列入 deploy-deny.txt；保留本機 _site 明確限於 Node validator 失敗；packaging 沿用現有 S 型單 writer，不宣稱任意 I/O 失敗都保留",
      "remaining": "deploy-deny.txt 不在 manifest 內，無法核實際條目。完成條件裡『注入失敗保留前一產物』應理解為 validator 注入失敗，正文已足以限定這個範圍"
    },
    {
      "id": "F15",
      "confirmed": "yes",
      "evidence": "§同版資料 第4段：emoteCmd 取同版 TextCommand.Command（英文），現行 11 組逐一對帳，並移除手寫的 EMOTEID_CMD",
      "remaining": "無"
    },
    {
      "id": "F16",
      "confirmed": "yes",
      "evidence": "§CSP：JSON-LD 是不可執行資料，不列入必要 hash；只授權可執行的 bootstrap hash",
      "remaining": "無"
    },
    {
      "id": "F17",
      "confirmed": "yes",
      "evidence": "§IndexedDB 第3段末：db.onversionchange 關閉連線並提示刷新；onblocked 明示阻擋",
      "remaining": "無"
    }
  ],
  "summary": "F1–F17 全部 yes，design 契約已補齊，沒有阻擋。只剩幾項不可驗或極小的殘留：F3(b) 生成器 LF 沒明寫（會被 fail-closed 擋下，非靜默）；.gitattributes 與 deploy-deny.txt 不在 manifest；F2 的 probe 與 oracle 原始輸出、F12/F13 的 runtime 結果都要留到實作與 post 階段核驗。",
  "independence_disclosure": "為確認 blob 綁定，我對 note blob 跑了一次 grep，輸出順帶顯示了 Record 區 L104-142 的 triage 內容，其中有 B1、B4–B6 等非本角色的條目。我沒有展開讀，也沒有把它們納入上面的判斷；判斷只依據 note 正文（L1-80）、我自己的原 findings 與 coverage refs。",
  "run_metadata": {
    "actual_model": "anthropic/claude-opus-5-5（取自 harness workstation context，未經 native 核驗）",
    "provider": "anthropic",
    "effort": "unknown",
    "native_identity": "unknown",
    "tool_rounds_used_this_confirmation": 5,
    "commands_executed": "無；只用唯讀的 read/grep"
  }
}
```

### hardening-pre-blind-confirm-1 sha256:0fc5532602cde86bbd90fe602c31b2a087a3bf4e5e0b42f2c3422d62711e5641

```json
{
  "overall_correctness": "incorrect",
  "confidence": 0.86,
  "explanation": "pre confirmation，不是新初審。B1 不重開。after 6d65fbab… 與 coverage 020ecea2… 檔名即 SHA-256；工作樹 spec 與 snapshot content SHA b5e8716f… 一致；12 個 blob 綁定 0 不符。只核正文 1–80。B2 yes：第 19 行排除 data-full／listener 在建圖前註冊並沿用既有失敗 class。B3 yes：第 23–31 行獨立 staging、不走 Publish、unknown 不發布、六張 CSV 欄名與 bytes SHA、失敗前不開正式產物。B4 no：emoteCmd、空圖、v2 URL、最小 map ID、事件／region／default 已寫上；尚缺凍結 build_zones.py 在圖碼正則之前排除的 dungeon／housing，正文改為不再讀 maps.json 卻沒寫 native 對應條件。B5 yes：第 37、45 行 reset 留 marker；第 39 行 request token；第 37、51 行 legacy 漂移警告且不重遷。B6 yes：第 57 行 Node pin、deny-list、manifest／空圖閘在刪 _site 前；保留 _site 只限 Node validator 失敗，不扭 S 型 packing 當缺口。",
  "findings": [
    {
      "title": "B4 尚缺：dungeon／housing 排除沒有承接",
      "body": "第 29 行已寫 emoteCmd 取同版 TextCommand、缺 image／sf 失敗、不回空圖／sf 100、以 Map.Id 組 v2 URL、圖碼 ^[a-z]\\d[ft]\\d$ 並排除事件／region／default、同名 PlaceName 取最小 map ID。凍結 build_zones.py 在這個正則之前還會丟掉 maps.json 的 dungeon 與 housing。正文改為不再讀 maps.json，卻沒寫這兩個旗標改由哪個 native Map 條件承接。同名 PlaceName 取最小 map ID 時，仍可能選到舊規則會丟掉的圖。這不是新題；其餘已採納文字不打回。",
      "priority": 1,
      "confidence": 0.84,
      "file_path": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md",
      "line_start": 29,
      "line_end": 29
    }
  ]
}
```

### hardening-pre-blind-confirm-2 sha256:f37424f3ed18a32b48f884f6f3146d9680dfbdfe52746afd4cc22529517468e7

```json
{"id":"ab607c0b","timestamp":"2026-10-09T11:37:56.390Z","text":["我只核 B4 未確認的地圖過濾等價結論，對照新證據、after 與 coverage，不重開已 yes 的項目。","**B4：yes。** 只補原未確認的 dungeon／housing 過濾等價，B1 不重開，B2／B3／B5／B6 維持已 yes。\n\n依據是現行 `C:/FFXIVProject/data/item_dict/lspl/maps.json`，SHA-256 `84968cd002cbb6c1ea4f0fd4f5073a7a53593be216d9ad1ecec8835e104a4231`，與證據檔一致。我重算：total 1267、`dungeon or housing` 10、其中通過 `build_zones.py` 的 `^[a-z]\\d[ft]\\d$` 為 0。這 10 筆全是 housing，圖碼是 `s1h1`、`f1h1`、`w1h1`、`e1h1`、`r1h1`，第三碼是 `h`，主場景正則本來就不會收。證據檔的斜線正則同樣是 0。先濾 flags 不改變最小 map ID 的候選集合。\n\nafter `67d74678…` 綁到 spec `ce279747…`（現行正文第 29 行：沿用該正則、native `Map.Id` 組既有 v2 URL、不混社群來源）與證據檔 `21f53e0a…`。coverage `edefcdc1…` 的 B4 仍只指向 spec。這次沒有改正文或 runtime code。\n\n界線維持證據檔自己寫的：只對這份 maps.json 等價，不保證未來 client。native 生成後仍要做全部 zone image／sf 與 340 筆逐欄對帳；那是既有完成條件，不是 B4 尚缺。"]}
```


### hardening-pre-fact-confirm-2 sha256:bd0da1980be78d5b06ee594bd27825bb9677458eb321efb920e9adf1be8b9f1f

```json
{
  "role": "reviewer-claude (fact) — pre confirmation 承接（只核額外 F6 證據與 after 綁定，不重審 F1–F17）",
  "binding": {
    "before": "cc05019ddafdd56946ed05f27cde48093cda397d11081b73d9f173f4c7352178.json",
    "after": "67d74678e477e5e76748c4a4ade14f89a8428654a4df52a283a1650a92c23095.json：revision 仍是 health-fix-candidate3+hardening-design2，共 13 個 files",
    "coverage": "edefcdc1b37c7bde607bcbe3fdd893c67e7bbe299843aba1efaad6ebc0d072df.json：after 指向 67d74678…，changes 只有主 note 一筆（02e3ae4a… → ce279747…）",
    "diff_vs_previous_after_6d65fbab": [
      "多一個 path：docs/specs/2026-10-09-sightseeing-hardening.map-filter-evidence.md，sha 為 21f53e0a…，blob 存在；blob 與磁碟上現行檔案逐字相同",
      "主 note 的 blob sha 由 b5e8716f… 變成 ce279747…，但 note 的 deliverySha256 兩版都是 b80b56ea62786ad2d5938b7fd899bca16f1935d7fe677563839f83b9e47ca62a。這與「正文沒改、只有 Record 區變動」一致 [INFERENCE：deliverySha 排除 Record 的語意未核]",
      "其餘 11 個 path 的 sha 都與前次 after 相同"
    ],
    "observation_unverified": "兩版 after 的 top-level deliverySha256 都是 31140d537e0ca2fc39c64c6f994512b80ab38bf0c05f08d9b238711c60477cf7，即使 path 從 12 個變成 13 個。若 external-gate 用它判斷 cohort 是否一致，請 Main 自行確認它的計算範圍（看起來只涵蓋 baselinePaths=note）。我無法驗證這一點，所以不列為 finding。",
    "sha_not_recomputed": "我沒有重算任何 sha256，包括 maps.json 的 84968cd0…，因為唯讀工具無法計算。"
  },
  "f6_evidence_check": {
    "verdict": "沒有矛盾，可以支持 F6 維持 yes",
    "checks": [
      {
        "claim": "原 build_zones.py:172-178 先排除 dungeon/housing，再用 _valid 套 regex",
        "result": "相符。frozen blob 08c84857… 的 L173 是 dungeon/housing 過濾，L176 是 default 過濾，L178 是 append。_valid 與 _CODE_RE 也和我初審讀到的內容一致"
      },
      {
        "claim": "{total:1267, flagged:10, flagged_field_town:0}",
        "result": "我用同一條 jq query 讀 C:/FFXIVProject/data/item_dict/lspl/maps.json 唯讀重跑，輸出相同（1267/10/0）"
      },
      {
        "claim": "IRC 說 10 筆全是 housing h 碼",
        "result": "evidence 檔本身沒寫這句，但我額外列出 10 筆 image，確實全是 h 碼：s1h1/01、02，f1h1/01、02，w1h1/01、02，e1h1/01、02，r1h1/01、02。沒有一筆是 f/t 主場景碼"
      },
      {
        "claim": "jq 的 test(\"/[a-z][0-9][ft][0-9]/\") 可代表 _valid",
        "result": "可以。這個寫法沒有錨定位置，只要兩側有斜線就算命中，所以能命中的集合包含（≥）_code()+^…$ 的嚴格比對。寬鬆版已是 0 筆，嚴格版必然也是 0，結論保守成立"
      },
      {
        "claim": "界線：只保證現行資料等價，未來須重核，靠 pinned native 逐欄對帳兜底",
        "result": "與 note §同版資料「340 筆逐欄對帳、無法解釋的差異不接受」一致，沒有越界宣稱"
      }
    ],
    "residual": "對 native Map.Id 的圖碼分類，仍要在實作後用 native 產物的 zone image/sf 逐欄對帳；這屬於 post 階段，不影響 pre 確認"
  },
  "f1_f17": "原 F1–F17 全部維持 yes。前次確認時記下的殘留照舊，沒有新增：F3(b) 生成器 LF 沒明寫，但會被 fail-closed 擋下；.gitattributes 與 deploy-deny.txt 不在 manifest 內；F2 probe 的原始輸出、F12/F13 的 runtime 結果留到實作與 post 階段核。",
  "after_sufficient": "yes。新 after 67d74678… 足以承接我前次的確認：note 正文的 deliverySha 沒變，新增的 path 只是我已核過、無矛盾的 F6 純證據。前提是 top-level deliverySha256 的計算範圍符合 gate 預期（見 binding.observation_unverified）。",
  "independence_disclosure": [
    "這一輪讀到的非指定內容：(1) coverage 的 mapping 欄位列出 hardening-pre-blind-1 的 finding ID（B2–B6），只有 ID 與 path，沒有內容；(2) evidence 檔標題與內文提到「B4」，那是 Main 指定要我讀的檔案。兩者都沒有影響我的判斷。",
    "沒有讀 Record code fence、reviews sidecar、健檢報告或其他 reviewer 的輸出。",
    "前次 confirmation 已揭露：當時 grep note blob 時，輸出順帶顯示了 Record 區 L104-142 的 triage 片段。本輪沒有再讀。"
  ],
  "run_metadata": {
    "actual_model": "anthropic/claude-opus-5-5（取自 harness workstation context，未經 native 核驗）",
    "provider": "anthropic",
    "effort": "unknown",
    "native_identity": "unknown",
    "tool_rounds_used_this_turn": 6,
    "commands_executed": "沒有執行任何命令，只用唯讀的 read（含 jq query）與 grep；沒有寫檔，沒有跑 build/lint/tests/formatter"
  }
}
```


### hardening-post-fact-1 sha256:83ccb4f1d5df45623e8ab4509eed9bd9696c7d57178e5bec58770390b8b22f9b

```json
{
  "role": "fact reviewer (reviewer-claude), full post initial, read-only",
  "snapshot": {
    "manifest": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md.materials/1f6a8ef6b62f927d3f27099c387a03e2922927180e96dc2a89d253388002b644.json",
    "sha256": "1f6a8ef6b62f927d3f27099c387a03e2922927180e96dc2a89d253388002b644",
    "revision": "health-fix-candidate3+hardening-design2",
    "mainNoteRead": "blob d606b2ce… 只讀 1–80"
  },
  "verdict": "沒有發現 blocking 或 High 等級缺陷。五項 AC 的實作都與核准契約一致；有 1 項 evidence 缺口（AC2 generator 層級的實跑證據）和 4 項 Low／有條件的發現。",
  "findings": [
    {
      "id": "F1-csp-gate-scope",
      "severity": "Low（有條件；如果 404.html 有可執行的 inline script，就升為 Medium）",
      "file_line": [
        "tools/validate-csp.mjs:10（只讀 ../index.html）",
        "_headers:13-20（`/*` 對所有回應套用 hash-only script-src）",
        "deploy-allow.txt:1（404.html 會出貨）"
      ],
      "trigger": "404.html 也會出貨，並套用同一份 `/*` CSP；但 validate-csp 只計算 index.html 的 inline hash，也只檢查 index.html 有沒有 HTML handler。404.html 不在 materials 內，無法確認它有沒有 inline `<script>` 或 `on*` attribute。",
      "impact": "[INFERENCE] 如果 404.html 有 inline bootstrap 或 handler，它在 production 會被 CSP 靜默擋下（使用者看到沒有 header 或樣式的 404 頁），而且 CF gate 不會失敗。",
      "minimal_fix": "先由 Main 確認 404.html 原文。如果有可執行的 inline script，就讓 validate-csp 一併掃描 allowlist 中的所有 .html，把它們的 hash 合併寫入 script-src，並檢查 inline handler。"
    },
    {
      "id": "F2-zone-map-join-guard",
      "severity": "Low（latent；目前 snapshot 無法重現）",
      "file_line": [
        "tools/build_zones.py:72-80（每個 PlaceName 取最小 Map key，作為 zone 的 image／sf）",
        "tools/build_data.py:52-58,67-68（x/y 用 adventure 自己的 Level.Map offset/sf 計算，只驗 place 名稱與 Id 格式）",
        "modules/app.js:196（pin 用 zone.sf 畫在 zone.image 上）"
      ],
      "trigger": "同一個 PlaceName 會有多張 map（已在 tc_Map.csv 確認：Map 11 s1t1/01 與 Map 74 s1t1/02 都是 PlaceName 28；Map 14 w1t2/01 與 Map 73 w1t2/02 都是 PlaceName 41）。如果之後某個 adventure 的 Level.Map 不是最小 key 那張，而且兩張的 SizeFactor 或 Offset 不同，generator 不會失敗。",
      "impact": "座標會依 A 圖計算，卻畫在 B 圖上，pin 位置錯誤，而 build 仍是綠的。這違反 fail-closed 原則（『任何 join／有效座標失敗均不發布』）。目前 nativeComparison 的 zoneDiffs=[]，x/y 也沒有差異，所以現有產物不受影響。",
      "minimal_fix": "在 build_entries 斷言 native_map 的 Id、SizeFactor、OffsetX、OffsetY 與 zones[zone_key] 選中的 map 一致（或直接比對 map key）；不一致就 raise ValueError。"
    },
    {
      "id": "F3-legacy-probe-blocks-valid-db",
      "severity": "Low",
      "file_line": [
        "modules/ss_storage.js:94-97（legacy() 遇到例外會 throw unavailable）",
        "modules/ss_storage.js:108-120,123-135（read 與 updateCompleted 在任何狀態都會先呼叫 legacy()）"
      ],
      "trigger": "IndexedDB 可用而且已有有效的 completed record，但 localStorage.getItem 會丟例外（例如瀏覽器停用了 DOM storage，或發生 SecurityError）。",
      "impact": "讀取和寫入都會 abort，UI 顯示『完成紀錄無法讀取，已停止寫入』，進度功能完全不能用。這和契約狀態表『有效 DB record → DB 權威』不一致：只有遷移判斷才需要 legacy 原文。不會造成資料遺失。",
      "minimal_fix": "當 exists=true 而且 completedRecord 有效時，legacy 讀取失敗只關閉 drift 偵測並顯示警告，不要 abort；!exists 的遷移路徑維持 fail-closed。"
    },
    {
      "id": "F4-rescue-doc-recovery-backup",
      "severity": "Low（文件）",
      "file_line": [
        "README.md:45（說明重置會存到 progress → recovery-backup）",
        "README.md:47-89（人工救援只接受下載的備份 JSON，key 必須是 completed）"
      ],
      "trigger": "使用者重置後找不到下載的備份檔，只剩 DB 內的 recovery-backup。",
      "impact": "文件提到有 DB 內備份，卻沒有說明怎麼讀出 recovery-backup 再還原，這條救援路徑實際上走不通。另外 snippet 的 indexedDB.open 沒有處理 onupgradeneeded／onblocked；只有在 DB 還不存在時才會 hang，而 app 載入時就會建立 DB，所以一般情況到不了 [INFERENCE]。",
      "minimal_fix": "在 README 加一段：用 readonly transaction 讀 `progress`/`recovery-backup`，取它的 record 或 legacyRaw，再走現有的 completedRecord／parseLegacyProgress 驗證流程。"
    }
  ],
  "acceptance": {
    "AC1_CSP": {
      "status": "covered（尚待確認 F1）",
      "evidence": "_headers 的 script-src 沒有 unsafe-inline，只保留既有 host、一個 sha256，以及 script-src-attr 'none'；style-src 保留 unsafe-inline。validate-csp 會跳過 JSON-LD 與 src script。map_view.js:11-24 的 capture error listener 在 renderInlineMap 與 openMapModal 建立圖片前就已註冊；所有 shipping modules 和 data 都 grep 不到 on*= 或 javascript:。css/style.css:129-130 在 failed 時顯示 fallback。runtime evidence：exact policy 下 0 violations，forced 404 時兩個 failed class 都會加上。",
      "not_verified_by_me": "沒有手算 bootstrap 的 SHA-256 是否等於 header 中的值，依賴 runtime 證據；404.html 未覆蓋。"
    },
    "AC2_native_same_version": {
      "status": "uncertain（程式碼符合；generator 層級的實跑證據不在 verification JSON 中）",
      "evidence": "SightseeingDump.cs：Adventure/Emote 用 RawRow 逐欄 hard-check type、offset 與欄數；四張 typed sheet 保持 checksum gate；join、座標與 340 筆缺一律 throw；版本前後各檢查一次；先 staging 再發布，失敗逆序回復。Program.cs:43-51 在 --sightseeing 模式強制 --out。我交叉比對了 SHA：native-manifest 列的六張 CSV、generation-manifest 列的 native manifest、兩份補充來源與兩份輸出，全部等於 materials blob 的 SHA。oracle 也已確認：tc_Adventure 2162688 = 4876856 / 22 / 800 / 1159 / 梭魚碼頭；Emote 22 = 張望 → 423 = /lookout。build_data.py 先在記憶體完整建好結果，才 os.replace，發生 OSError 時回復；load_snapshot 只讀 tools/sources。",
      "gap": "verification JSON 中搜尋 build_data、generator、standalone、identical 都是 0 筆，所以沒有『獨立 checkout 生成成功、bytes 重跑完全一致、缺必要資料時 generator 非零且保留好產物』的觀察證據。CF 的五種注入失敗只證明 Node gate 這一層。"
    },
    "AC3_atomic_IDB": {
      "status": "covered",
      "evidence": "ss_storage.js:62-91 在單一 readwrite transaction 內用 cursor 讀取、套用一個 ID 再 put，中間不跨 await，complete 後才 resolve；read() 在同一個 transaction 內遷移，marker 就是 record 本身；inspect 不過濾未知 ID，並保留 legacyRaw 原文。app.js:379-401 讓成功與錯誤共用同一個 readToken；app.js:252-256,505-518 處理 pending／disabled／aria-busy，失敗時回滾；另外有 BroadcastChannel、visibility／pageshow 與 storage 事件觸發重讀。evidence 涵蓋 concurrent（82 筆、沒有遺失）、sameId、abort、readRace、errorRace、versionChange、interruptedMigration。",
      "residual": "onblocked 沒有實際注入測試；version 1 固定時理論上很難觸發。"
    },
    "AC4_corruption_recovery": {
      "status": "covered",
      "evidence": "ss_progress_data.js:43-65 會拒絕 JSON 無法忠實表示的值（undefined、-0、sparse、非 plain、共用參照）；ss_progress_ui.js 下載後才設 fingerprint，必須勾選確認、再經 danger modal；任何 render 時只要 snapshot 不同就 invalidate。ss_storage.js:153-164 在同一個 transaction 內比對 fingerprint、確認狀態仍是 corrupt，寫入 recovery-backup 與空集合，保留 legacyRaw；偏好不受影響。evidence 涵蓋 cancel、stale、reset、corruptDB、unrepresentable、unavailable 與 mobile。"
    },
    "AC5_CF_gate": {
      "status": "covered（有環境限制）",
      "evidence": "deploy-prepare.sh 在 `rm -rf $OUT` 之前、set -eu 之下跑完六個 Node checks；allowlist、tracked ls-files、symlink、leak 白名單與 single-writer 都沒變；.node-version 22.16.0 已列入 deploy-deny；沒有引入 Python、.NET 或 sibling。27 檔與 allowlist 推算的數量一致。",
      "limits": "實跑環境是 Node v24.15.0 加 Git Bash，不是 pinned 的 22.16 與 dash；我 grep 過，validators 沒有用到 Node 24 才有的 API。無法驗證『isolated tracked checkout』在沒有 commit 的情況下怎麼建立；也沒有部署。"
    }
  },
  "uncovered_and_unverifiable": [
    "404.html 原文（不在 materials 內；見 F1）",
    "inline bootstrap 的 SHA-256 數值：沒有獨立計算",
    "TextCommand 451 → `/lounge`（arr#11、arr#36 原本是 `sit`）：snapshot 的 Command 欄沒有 `/sit`，實作符合『取 TextCommand.Command』的契約；但 `/lounge` 在 TC client 能不能直接使用，無法用 materials 驗證，建議用 xivapi 或實機確認一次",
    "HW–DT 高度補充是依 babelin 陣列位置對應（build_data.py:76-80），不是用 key；目前比對沒有 z 差異，但結構上依賴排序",
    "Python generator 實跑、原始 log 與 owned smoke 原文（依規定不讀）",
    "ss-storage.test.mjs 與 run-all 的內容沒有逐一審查；依 canonical 9/9 證據"
  ],
  "out_of_scope_one_liners": [
    "functions/_middleware.js 的 handoff nonce CSP 不在本輪範圍，未審",
    "state.done 在 unavailable 時保留上次已知的勾選外觀，只影響顯示；不是資料遺失"
  ],
  "run_metadata": {
    "model": "anthropic/claude-opus-5-5（取自 workstation context）",
    "provider": "anthropic",
    "requested_effort": "med",
    "actual_effort": "unknown",
    "native_session_id": "unknown",
    "parent_session": "01a11f91-915f-7476-b519-66610c9e4f42（caller 提供）",
    "tool_calls": "約 38 次，都是唯讀 read／grep",
    "executed": "沒有跑 build、lint、tests 或 formatter，沒有寫入或部署"
  }
}
```

### hardening-post-blind-1 sha256:42094bb32d848f9827fa6b67fe61bf9977bb2e59ee38f2442029e313e02504e7

```json
{
  "overall_correctness": "incorrect",
  "confidence": 0.84,
  "explanation": "依固定 snapshot 1f6a8ef6b62f927d3f27099c387a03e2922927180e96dc2a89d253388002b644（revision health-fix-candidate3+hardening-design2）對照主 note 正文 1–80 與 blob 原文。有 2 個具體缺陷，不拋住整體五項合約，但損毀重置的「其他 tab 改 legacy 則舊備份失效」沒有關死。F1 medium：modules/ss_storage.js reset() 在 cursor callback 讀到 legacy raw L1 並排入 put 之後、transaction commit 之前，另一個旧版分頁可對 localStorage ffxiv-sightseeing-completed 寫入 L2。localStorage 不在 IndexedDB transaction 內，storage event 要等回到 event loop 才到達，此時已 commit。結果仍清空 completed，已下載備份與 recovery-backup 只有 L1。最小修法：最後一個 put 的 onsuccess 再讀一次 legacy()，不同就設 failure 並 abort()，交出 ProgressStorageError('changed')。F2 low：ss_progress_ui.js 開啟 danger dialog 後、按確認前可取消「我已確認備份檔案保存完成」；確認 handler 不再讀 saved.checked，資料未再變時仍會 reset。最小修法：呼叫 store.reset 前再要求 saved.checked 且 fingerprint 未變且 kind 仍為 corrupt。AC：(1) CSP covered（原始碼；瀏覽器 smoke 未重跑）。script-src 無 unsafe-inline、script-src-attr none；style-src 依契約保留 unsafe-inline；map_view capture error listener 在建立圖片前註冊，失敗 class 換成座標仍可用的空圖。(2) 同版資料 covered（版控 snapshot；native client 未重跑）。Adventure/Emote RawRow type/offset/欄數 hard-check，四張 typed sheet 維持 checksum gate；空/unknown 或解包前後版本改變在 Publish 前失敗；generator 只讀版控 snapshot，validate-sources 核對 bytes、同一 clientVersion 與產物 hash。(3) IndexedDB covered（原始碼；未實跑）。同一 transaction 讀改寫一個 ID；不同 ID 串行合併，同 ID 後者生效；readToken/pending/BroadcastChannel/visibilitychange/pageshow/storage 都在；loading 時不以空集合顯示 badges。(4) 損毀備份與重置 uncertain，因 F1。取消 dialog、無法產生 JSON、commit 前的 IDB 變更會拒絕；偏好與 legacy key 不刪除。README 人工救援使用實際 DB ffxiv-sightseeing / progress / completed，且沒把回寫 legacy key 說成 rollback。(5) CF build covered（腳本與已觀察摘要；未重跑）。validators 在 rm -rf _site 之前；.node-version 22.16.0 列 deploy-deny。已觀察摘要：Git Bash、Node v24.15.0、成功 27 檔；onblocked 未人工注入。未覆蓋：未重跑 build/lint/tests/雙分頁/CSP smoke/CF packaging；實機 sqpack 未重做 checksum probe；跨裝置、斷電零遺失、dashboard、縮圖不在範圍。deploy-prepare 在 validator 通過並刪除 _site 後才發現 git 不可用會留空 _site，契約已排除 packaging 階段保留保證，不列 finding。實跑 metadata：post initial blind；請求 effort med；actual model Grok 4.7；provider、本 agent native identity、實際 effort unknown；母 session 01a11f91-915f-7476-b519-66610c9e4f42。未執行任何測試或建置指令。",
  "findings": [
    {
      "title": "reset commit 前的 legacy raw 改變仍會清空完成集合",
      "body": "severity: medium。觸發：損毀狀態下 Tab A 已下載備份並通過確認。reset() 在 cursor callback 讀到 legacy raw L1、指紋相符，把 recovery-backup 與空的 completed 排進同一個 readwrite transaction。commit 前 Tab B 對 ffxiv-sightseeing-completed 呼叫 setItem 寫入 L2。localStorage 不在 IndexedDB transaction 內；storage event 要等回到 event loop 才送到 Tab A，此時 transaction 已 commit。影響：契約要求任何 legacy raw 改變都拒絕重置並重備份，這裡仍會清空 completed。已下載檔與 recovery-backup 只有 L1，L2 只留在 localStorage。成功訊息已顯示；之後雖會出現 legacy drift，但不會把 L2 補進已確認的備份。最小修法：在最後一個 put 的 onsuccess（transaction 仍可 abort）再讀一次 legacy()；與已封存的 raw 不同就設定 failure 並 abort()，讓 tx.onabort 交出 ProgressStorageError('changed')。這只消掉等待 put I/O 的空檔；最後一次讀取返回之後、commit 之前的跨程序寫入仍擋不住。",
      "priority": 2,
      "confidence": 0.82,
      "file_path": "modules/ss_storage.js",
      "line_start": 156,
      "line_end": 168
    },
    {
      "title": "確認框開啟後取消備份勾選仍會重置",
      "body": "severity: low。觸發：勾選「我已確認備份檔案保存完成」、打開 danger dialog 後、按確認前，把勾選取消。這段期間 working 仍是 false，checkbox 可改。確認 handler 用的是開啟當下複製的 approvedFingerprint，不再讀 saved.checked。影響：使用者已撤回「檔案已保存」的確認，但資料若未再變，reset() 的指紋比對會通過並清空完成集合。取消 dialog 本身不會寫入。最小修法：確認 handler 在 store.reset 之前再要求 saved.checked && fingerprint === approvedFingerprint && current?.kind === 'corrupt'；否則關閉 dialog，不呼叫 reset。",
      "priority": 3,
      "confidence": 0.9,
      "file_path": "modules/ss_progress_ui.js",
      "line_start": 81,
      "line_end": 113
    }
  ]
}
```

### hardening-post-fact-confirm-1 sha256:f32bb96558b549bcff94f2be60d7184816bc6e642bf939512c25e75a9b079dfc

```json
{
  "kind": "fix confirmation（同一 post initial；不是新的初審）",
  "binding": {
    "before": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md.materials/1f6a8ef6b62f927d3f27099c387a03e2922927180e96dc2a89d253388002b644.json",
    "after": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md.materials/6b9ee2fe1a38a301bf749318acb1bb4358548f5f851c78758cb378f219418369.json",
    "coverage": "external/ffxiv-tw-sightseeing/docs/specs/2026-10-09-sightseeing-hardening.md.materials/7166ecacf03e298ea0e01a2a013e511618a52659a41a26b7b9dd9cc63b6c4b7c.json",
    "coverage_check": "coverage 的 before.sha256 與 after.sha256 都等於各自的檔名 SHA，initialIds 含 hardening-post-fact-1。changes 那一列被截斷，沒有逐列核對。",
    "after_blobs_read": {
      "tools/build_data.py": "221069502c6172dedb3de58cd6b711417eaaff7b7d0e91a29125d4430311b6be",
      "tools/build_zones.py": "7de6c9c1a66e00c8762c4426472e34269022b19e4244f6e6a8102000e616f4d7",
      "README.md": "ef54789c6aea826becb2c6a1f2982af94c84b52103b1fef3b159e7d83cd74e35",
      "docs/verification/2026-10-09-sightseeing-hardening.json": "0b19d7f90b614b7a3a7b8ab22a4e8b37af808c283c3f465c9d5dcda9a4f6ae2e"
    }
  },
  "confirmations": [
    {
      "id": "F2-zone-map-join-guard",
      "resolved": "yes",
      "basis": [
        "build_zones.py（after）第 84-92 行：除了 zones 之外，現在也回傳每個 zone 選中的 map_keys（同名 PlaceName 時仍取最小 Map key，選圖規則沒變）。",
        "build_data.py（after）第 40 行：build_entries 多了 zone_map_keys 參數；第 62-65 行：用 float 逐欄比較 native_map 與 selected_map 的 SizeFactor、OffsetX、OffsetY，任一不同就 raise ValueError（\"native map does not match zone image\"）。比的是幾何而不是 Map key，所以同幾何的另一層圖（Main 說明的 2162701）仍可通過；這符合我原本 minimal fix 中「或比對幾何」那個選項。",
        "verification（after）第 423-434 行：generator.failures 含 \"mismatched native map SizeFactor/Offset geometry\"，allFailedWithoutChangingGoodOutputs=true；standalone 欄位寫明「outside monorepo: two JS outputs and generation manifest bytes-identical」。"
      ],
      "residual": "沒有直接讀到 main() 的呼叫點（是否改成 `zones, map_keys = build_zones(...)` 並傳入 build_entries）。間接依據：如果呼叫點沒改，build_entries 會因參數不符而 TypeError，但 verification 記錄的 generator exit 0 且產物 bytes 一致，所以應該已改 [INFERENCE]。before 的 fixture（Level.Map 74，OffsetX 100）仍會發布、after 會拒絕的具體細節在 verification 第 435-442 行，這段沒有讀。"
    },
    {
      "id": "F4-rescue-doc-recovery-backup",
      "resolved": "yes",
      "basis": [
        "README（after）第 47 行：新增「下載檔遺失時」的段落，說明 recovery-backup 只保存最後一次、不是累積歷史，也不保證能還原損毀內容；產生同格式的備份後先另存，再走下方的驗證救援，「不直接覆寫」。",
        "第 52-64 行：用 readonly transaction 讀 progress/recovery-backup；onupgradeneeded 會 abort，不建立空 DB；onblocked 會 reject 並提示關閉其他分頁；沒有 progress store 時會 close 並 reject；讀不到值時 reject「沒有重置備份」。",
        "第 91-99 行：後續仍走原本的格式驗證，以及 completedRecord／parseLegacyProgress 驗證和 confirm 流程，不會猜測損毀內容。"
      ],
      "residual": "第 65-90 行（把 recovery 值轉成 {database, snapshot} 格式的程式碼）沒有讀，所以無法在 source 層面確認 ids:[null]、extra 與 legacy 都完整保留。這一點只依據 Main 描述的 owned 實跑結果，我沒有在 verification 中定位到對應欄位。"
    },
    {
      "id": "AC2_native_same_version evidence gap",
      "resolved": "yes",
      "basis": [
        "verification（after）第 423-446 行：新增 generator 區塊，內容包括 command（map-join-smoke.py --reject 與 native-smoke.py）、exit 0、standalone 在 monorepo 外產生的兩份 JS 與 generation manifest bytes-identical，以及五種失敗情境：缺 Level 4876856、X 非有限值、Level bytes SHA 不符、第二個輸出 rename 回滾、map 幾何不符，全部都沒有改動好產物；另附 rawLogSha256 的 before／after。",
        "第 513 行：materialEncoding 說明 content-addressed blob 以 -text 保留原始 bytes，兩個 CRLF native blob 已依原始內容精確還原。after manifest 中有 .gitattributes blob 46f62b9a…，但我沒有讀它的內容。"
      ],
      "residual": "原始 log 沒有讀，也沒有比對 log 的 SHA（依規定不讀）。命令所用的 scratch 腳本位於 C:/dev-tmp，不在 materials 內，無法審查 fixture 內容。AC2 由 uncertain 改為 covered（依據是已觀察的證據）。"
    }
  ],
  "not_adopted_acknowledged": {
    "F1": "Main 表示已實際確認 404.html 沒有 script 或 handler，相關證據在 verification 中。我這次沒有讀那段，不重新審查。",
    "F3": "Main 不採納，理由是 legacy 讀不到時應 fail-closed。我接受這是設計取捨，不再爭議。"
  },
  "run_metadata": {
    "model": "anthropic/claude-opus-5-5（取自 workstation context）",
    "provider": "anthropic",
    "requested_effort": "med",
    "actual_effort": "unknown",
    "native_session_id": "unknown",
    "tool_calls": "本輪共 5 次唯讀呼叫；本 session 累計已超過 packet 的 45 次上限，因此上述 residual 中沒讀的範圍沒有再補讀",
    "executed": "沒有執行 build、lint、tests 或 formatter，沒有寫入或部署；沒有讀其他 reviewer 的報告"
  }
}
```

### hardening-post-blind-confirm-1 sha256:21212fabe23ecc07c9e2ca937d3442f3c71e899e34345b0a068118d55d2a1280

```json
{
  "overall_correctness": "correct",
  "confidence": 0.9,
  "explanation": "B2-consent: yes。同一 post initial 修正確認，不是新初審；只確認原 findings[1]「確認框開啟後取消備份勾選仍會重置」。B1-legacy-commit 不在本次待確認項目。\n\n觸發：對話框已開啟後，[data-reset-confirm] click。after blob modules/ss_progress_ui.js SHA-256 43bb0e0944b722f557f1066568a8de528f520a4335a0ef48b75cf294788b21ed（LF，與 after manifest 條目與 blob 一致）。L81–L87 仍只把關開啟：working 或 current.kind!=='corrupt' 或 !fingerprint 或 !saved.checked 則 return，並把當下 fingerprint 記成 approvedFingerprint。L108–L113 在 store.reset 之前再驗：!saved.checked || fingerprint!==approvedFingerprint || current?.kind!=='corrupt' 則 close()、feedback「未重置完成紀錄：備份確認已撤回或原始資料已變更，請重新備份。」並 return。等價於要求 saved.checked && fingerprint===approvedFingerprint && current.kind==='corrupt' 才繼續；不符則關閉且明示不重置，L118 await store.reset(approvedFingerprint) 不會執行。L77 saved change 只呼叫 controls()；L34 resetButton.disabled = working || !fingerprint || !saved.checked，取消勾選後面板重置鍵禁用。對話框內的確認鍵是另一顆，拒絕點在 click 當下重讀 DOM saved.checked。\n\nconsent 證據（verification blob SHA-256 0b19d7f90b614b7a3a7b8ab22a4e8b37af808c283c3f465c9d5dcda9a4f6ae2e 的 consent，injection 皆為 withdraw saved checkbox while confirmation open）：before recordExists true、record.ids []、legacyRaw \"{corrupt-consent\"、saved false、warningVisible false（空 completed marker）；after recordExists false、record null、legacyRaw 同為 \"{corrupt-consent\"、saved false、warningVisible true（無 completed record、legacy 原文不變、warning 仍在）。consent 物件沒有 resetDisabled、也沒有 Chromium 版本；reset disabled 不能從該 JSON 欄位直接讀出，只能由 saved:false 加 L34/L77 得出面板重置鍵會禁用。recovery.stale / unrepresentable / mobile 的 resetDisabled 不屬本次 consent。同檔可得 native metadata：capturedAt 2026-10-09T13:19:30.969Z；scope 「2026-10-09-sightseeing-hardening owned fixture verification; no deployment or Owner data writes」；limitations 含 「Native and browser proof are owned fixtures; no reset of Owner data」。\n\ncoverage 綁定：7166ecacf03e298ea0e01a2a013e511618a52659a41a26b7b9dd9cc63b6c4b7c（檔名即 SHA-256，已核）。controlsSha256 498c72619dce111375e5a4d081f7c2af8222472b8c963d445b521c6da5a9e7dc 與 after manifest 相同。after manifest 6b9ee2fe1a38a301bf749318acb1bb4358548f5f851c78758cb378f219418369（檔名即 SHA-256，已核）。mapping source hardening-post-blind-1、finding B2-consent、paths 為上述 verification json 與 ss_progress_ui.js；coverage.changes 的 afterSha256 與 manifest/blob 一致（ui before e464cfc63af74715f26aae247e87585af5e4bc3d2674a0b89abe0bf6d3baa94a；verification before 7508be77c7c38e34e22a9293d6c2ea5bbd5bef70f429066c1b0040479f262171）。before manifest 1f6a8ef6b62f927d3f27099c387a03e2922927180e96dc2a89d253388002b644 檔名即 SHA-256，僅核對檔名，未讀內文。",
  "findings": []
}
```
