// 純可進行判定：依賴由 caller 傳入，不載入 DOM 或啟動 app。
/**
 * @typedef {{timeStart?: unknown, timeEnd?: unknown, weathers?: string[]}} Entry
 * @typedef {{weatherZone?: string}} Zone
 * @typedef {{inRange?: boolean, waitMs?: number | null}} TimeResult
 * @typedef {{time?: number | null, msUntil?: number | null}} WeatherResult
 * @typedef {{WEATHER_PERIOD_MS?: number, getTimeUntilRange?: (start: number | null, end: number | null, now: number) => TimeResult}} TimeAPI
 * @typedef {{SCAN_PERIODS?: number, getWeatherForZone?: (zone: string, seconds: number) => string, getWeatherNameTC?: (weather: string) => string, getWeatherIconUrl?: (weather: string) => string, findNextWeather?: (zone: string, targets: string[], scan: number | undefined, now: number) => WeatherResult | null}} WeatherAPI
 * @typedef {{value: string, name: string, icon: string}} CurrentWeather
 * @typedef {{result: WeatherResult, time?: number | null, msUntil: number}} UpcomingWeather
 * @typedef {{available: boolean, status: string, nextMs: number | null, time: {gated: boolean, inRange: boolean, waitMs: number | null}, weather: {gated: boolean, current: CurrentWeather | null, matches: boolean, next: UpcomingWeather | null, wanted: string[]}}} Availability
 */
/** @param {unknown} ms @returns {ms is number} */
const finite = ms => typeof ms === 'number' && Number.isFinite(ms);
/** @param {unknown} value @returns {number | null} */
export const timeValue = value => { if (value == null || value === '') return null; const n = Number(value); return Number.isFinite(n) ? (n < 24 ? Math.round(n) * 100 : n) : null; };
/** @param {Entry} entry @returns {string[]} */
const targets = entry => Array.isArray(entry.weathers) ? entry.weathers.filter(Boolean) : [];
/** @param {Entry} entry @returns {boolean} */
export const hasTime = entry => timeValue(entry.timeStart) !== null && timeValue(entry.timeEnd) !== null;
/** @param {unknown} ms @returns {string} */
export const formatMMSS = ms => { if (!finite(ms) || ms < 0) return '--:--'; const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
/** @param {unknown} ms @param {((ms: number) => string)} [formatter] @returns {string} */
export const wait = (ms, formatter) => !finite(ms) ? '無法推算' : ms <= 0 ? '現在' : typeof formatter === 'function' ? formatter(ms) : formatMMSS(ms);

/** @param {Zone} z @param {number} now @param {WeatherAPI} WT @returns {CurrentWeather | null} */
function currentWeather(z, now, WT) {
  if (!z.weatherZone || typeof WT.getWeatherForZone !== 'function') return null;
  try {
    const value = WT.getWeatherForZone(z.weatherZone, Math.floor(now / 1000));
    return value && value !== 'Unknown' ? { value, name: typeof WT.getWeatherNameTC === 'function' ? WT.getWeatherNameTC(value) : value, icon: typeof WT.getWeatherIconUrl === 'function' ? WT.getWeatherIconUrl(value) : '' } : null;
  // quality-allow: 天氣失敗必須回未知，由 availability 呈現條件資料不足而非誤報可進行。
  } catch { return null; }
}
/** @param {Zone} z @param {string[]} wanted @param {number} now @param {WeatherAPI} WT @returns {UpcomingWeather | null} */
function nextWeather(z, wanted, now, WT) {
  if (!z.weatherZone || !wanted.length || typeof WT.findNextWeather !== 'function') return null;
  try {
    const result = WT.findNextWeather(z.weatherZone, wanted, WT.SCAN_PERIODS, now);
    if (!result) return null;
    // null/undefined 不可 Number()：未知不是 0；只有有限 epoch 才可提供等待。
    const ms = finite(result.msUntil) ? Math.max(0, result.msUntil) : finite(result.time) ? Math.max(0, result.time - now) : null;
    return finite(ms) ? { result, time: result.time, msUntil: ms } : null;
  // quality-allow: 預測失敗以未知傳回，UI 必須誠實顯示無法推算而非現在。
  } catch { return null; }
}
// 掃「天氣 ∩ 時間窗」第一刻；不可用 max(兩閘等待)，也不可包含天氣週期的右端。
/** @param {Entry} entry @param {Zone} z @param {string[]} wanted @param {number} now @param {TimeAPI} ET @param {WeatherAPI} WT @returns {number | null} */
function nextBothOK(entry, z, wanted, now, ET, WT) {
  if (!z.weatherZone || typeof WT.getWeatherForZone !== 'function' || typeof ET.getTimeUntilRange !== 'function') return null;
  const period = ET.WEATHER_PERIOD_MS;
  const scan = WT.SCAN_PERIODS;
  if (!finite(period) || period <= 0 || !finite(scan)) return null;
  try {
    const first = Math.floor(now / period) * period;
    for (let i = 0; i < scan; i++) {
      const pStart = first + i * period;
      const pEnd = pStart + period;
      if (!wanted.includes(WT.getWeatherForZone(z.weatherZone, Math.floor(pStart / 1000)))) continue;
      const from = Math.max(pStart, now);
      const result = ET.getTimeUntilRange(timeValue(entry.timeStart), timeValue(entry.timeEnd), from) || {};
      const open = result.inRange ? from : finite(result.waitMs) ? from + result.waitMs : null;
      if (finite(open) && open < pEnd) return open;
    }
  // quality-allow: 交集計算失敗回未知，不能用零或單閘等待虛構可進行時間。
  } catch { return null; }
  return null;
}
/** @param {Entry} entry @param {Zone} z @param {number} now @param {TimeAPI} ET @param {WeatherAPI} WT @returns {Availability} */
export function availability(entry, z, now, ET, WT) {
  const timeGate = hasTime(entry);
  const wanted = targets(entry);
  const weatherGate = wanted.length > 0;
  let time = { gated: timeGate, inRange: !timeGate, waitMs: timeGate ? null : 0 };
  if (timeGate && typeof ET.getTimeUntilRange === 'function') {
    try {
      const result = ET.getTimeUntilRange(timeValue(entry.timeStart), timeValue(entry.timeEnd), now) || {};
      time = { gated: true, inRange: Boolean(result.inRange), waitMs: finite(result.waitMs) ? Math.max(0, result.waitMs) : null };
    } catch { time = { gated: true, inRange: false, waitMs: null }; }
  }
  const current = weatherGate ? currentWeather(z, now, WT) : null;
  const weatherOK = !weatherGate || Boolean(current && wanted.includes(current.value));
  const next = weatherGate && !weatherOK ? nextWeather(z, wanted, now, WT) : null;
  const unknown = (timeGate && time.waitMs === null) || (weatherGate && !weatherOK && (!current || !next));
  const available = !unknown && time.inRange && weatherOK;
  /** @type {number | null} */
  let nextMs;
  if (unknown) nextMs = null;
  else if (available) nextMs = 0;
  else if (timeGate && weatherGate) { const open = nextBothOK(entry, z, wanted, now, ET, WT); nextMs = open === null ? null : Math.max(0, open - now); }
  else nextMs = timeGate ? time.waitMs : next?.msUntil ?? null;
  return { available, status: unknown ? '等待中（條件資料不足）' : !timeGate && !weatherGate ? '隨時可進行' : available ? '現在可進行' : '目前不可進行', nextMs, time, weather: { gated: weatherGate, current, matches: weatherOK, next, wanted } };
}
