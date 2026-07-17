# 資料契約（data schema）— 探索筆記工具

> CC 維護的單一契約。`sightseeing-data.js`（grok）與 `app.js`/`weather.js`（codex）都遵此。

## 1. `data/zones.js`（CC 已產出，勿改）

```js
window.SIGHTSEEING_ZONES = {
  "<zoneKey>": {
    tc: "利姆薩·羅敏薩上層甲板",  // 繁中服正名（已對 tc_PlaceName 校過）
    image: "https://xivapi.com/m/s1t1/s1t1.01.jpg",  // xivapi 底圖 URL
    sf: 200,                     // sizeFactor（餵 map_view.gameCoordToPercent）
    weatherZone: "Limsa Lominsa",// weather.js ZONE_WEATHER 的 key（DT 為 ""＝無天氣資料）
    exp: "arr"                   // arr|hw|sb|shb|ew|dt
  }, ...
}
```

共 60 個 zoneKey。**zoneKey 是 data 與 zones 的連接鍵**，必須存在於 zones.js。

## 2. `data/sightseeing-data.js`（grok 產出）

```js
window.SIGHTSEEING_DATA = {
  arr: [ <entry>, ... ],  // 80 筆
  hw:  [ <entry>, ... ],  // 62 筆
  sb:  [ <entry>, ... ],  // 62 筆
  shb: [ <entry>, ... ],  // 45 筆
  ew:  [ <entry>, ... ],  // 46 筆
  dt:  [ <entry>, ... ],  // 45 筆
};
```

### entry 欄位

| 欄位 | 型別 | ARR | HW–DT | 說明 |
|---|---|:--:|:--:|---|
| `no` | int | ✓ | ✓ | 該版本內序號（1..N），來自來源 id |
| `zoneKey` | string | ✓ | ✓ | **必對應 zones.js**；用 `tmp/zone-mapping.md` 對照表 |
| `name` | string | ✓ | — | 探索點繁中名（ARR 取 cycleapple `name`）；HW–DT 無名 → 省略或 `""` |
| `x` | number | ✓ | ✓ | 顯示座標（1~42）。ARR 取 cycleapple（小數，準）；HW–DT 取 babelin |
| `y` | number | ✓ | ✓ | 同上 |
| `z` | number\|null | — | 選填 | HW–DT 高度（babelin 有）；ARR 省略 |
| `weathers` | string[] | ✓ | `[]` | 天氣需求；**ARR 取 cycleapple `weather` 陣列原值**（帶空格英文，如 `"Clear Skies"`）。HW–DT 一律 `[]` |
| `timeStart` | int\|null | ✓ | 多為 null | 開始時（0-23）。ARR 取 cycleapple `time.start` 換算成「時」(800→8)。HW–DT 一般 null，除非 babelin `note` 標時間 |
| `timeEnd` | int\|null | ✓ | 多為 null | 結束時（0-23）。ARR 取 cycleapple `time.end`（1200→12） |
| `emote` | string | ✓ | ✓ | 繁中表情名（來源原值，如 `"張望"`） |
| `emoteCmd` | string | ✓ | ✓ | 英文指令（不含斜線，如 `"lookout"`）；查下方對照表，查無填 `""` |
| `note` | string | 選填 | 選填 | 額外提示（如 `"⚠ 超短時間"`）；空則省略或 `""` |

### 天氣鍵（weathers 值，帶空格；ARR 直接沿用 cycleapple）
`Clear Skies` `Fair Skies` `Clouds` `Fog` `Wind` `Gales` `Rain` `Showers` `Thunder` `Thunderstorms` `Dust Storms` `Heat Waves` `Snow` `Blizzards` `Gloom`

### 表情繁中→emoteCmd 對照
| 繁中 | emoteCmd |
|---|---|
| 張望 | lookout |
| 祈禱 | pray |
| 坐下 | sit |
| 敬禮 | salute |
| 指指點點 / 指向 | point |
| 激勵 | psych |
| 打盹 | doze |
| 安慰 | comfort |
| 下跪 | kneel |
| 鼓勵 | `""`（非標準，CC 校對） |
| 展示 | `""`（非標準，CC 校對） |

### note 解析（babelin）
- `⏰ HH:MM–HH:MM` → 拆成 `timeStart`/`timeEnd`（整數時），note 可清空或保留原字。
- `⚠ 超短時間` → 保留為 `note`，不動 time。

## 2c. `data/guides.js`（引導說明，手動維護，非 AUTO-GEN）
```js
window.SIGHTSEEING_GUIDES = { "<exp>-<no三位>": "引導說明字串", ... };
```
- 有些探索點較難抵達，補一句怎麼過去。key＝卡片 `data-id`（如 `hw-012`）。
- **不會被 build 覆寫**（獨立於 sightseeing-data.js）；卡片只在該 id 有說明時顯示「引導」欄。

## 3. 來源檔（grok 讀）
- **ARR（80）唯一權威**：`refsite/data_sightseeing-data.js`（cycleapple）— 有 name/region(英)/x,y(小數)/weather/time/emote。region→zoneKey 見 `tmp/zone-mapping.md`。
- **HW–DT（260）唯一權威**：`refsite/babelin_sightseeing.html` 內 `const ALL_DATA = {...}` 的 hw/sb/shb/ew/dt 陣列 — 有 zone(繁中)/x,y/z/emote/note。zone→zoneKey 見 `tmp/zone-mapping.md`。
- ⚠️ **ARR 不要用 babelin**（其 ARR 座標被截成整數，精度差）。

## 4. 引擎契約（codex 讀，供對齊）
- `weather.js`：`window.Weather.getWeatherForZone(weatherZone, unixSec)` → 天氣字串（帶空格）；`getWeatherNameTC(w)` → 繁中；`getWeatherIconUrl(w)`；`findNextWeather(weatherZone, targets, maxPeriods)`。移植 cycleapple `refsite/js_weather.js`（canonical 種子演算法＋ZONE_WEATHER 表，涵蓋 ARR–EW）。
- `eorzea-time.js`：`window.EorzeaTime.getCurrentEorzeaTime(ms)` / `formatTime` / `getTimeUntilNextWeather` / `getTimeUntilRange(start,end,ms)` / `formatWaitTime`。移植 cycleapple `refsite/js_eorzea-time.js`。
- 地圖：`import { renderInlineMap, openMapModal } from './map_view.js'`（vendored，勿改）。marker.x/y＝顯示座標，sf 取 `zones[zoneKey].sf`，img 取 `zones[zoneKey].image`。
