import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { availability, wait, formatMMSS } from '../modules/ss_availability.js';

/** @type {import('../modules/ss_availability.js').TimeAPI} */
const ET = new Function('window', readFileSync(new URL('../modules/eorzea-time.js', import.meta.url), 'utf8') + '\nreturn window.EorzeaTime;')({});
/** @type {import('../modules/ss_availability.js').WeatherAPI} */
const WT = new Function('window', readFileSync(new URL('../modules/weather.js', import.meta.url), 'utf8') + '\nreturn window.Weather;')({});

/** @param {number} hour @returns {number} */
const atHour = hour => 1000 * 4200000 + hour * 175000;

test('真實時間窗 consumer 在窗首加入、窗尾移除；跨午夜同樣半開', () => {
  for (const [start, end] of [[5, 8], [18, 5]]) {
    const entry = { timeStart: start, timeEnd: end };
    const opened = availability(entry, {}, atHour(start), ET, WT);
    const closed = availability(entry, {}, atHour(end), ET, WT);
    assert.equal(opened.available, true);
    assert.equal(opened.nextMs, 0);
    assert.equal(closed.available, false);
    assert.ok(closed.nextMs !== null && closed.nextMs > 0);
    assert.equal(availability(entry, {}, atHour(end) + (closed.nextMs || 0) + 1, ET, WT).available, true);
  }
});

test('API 的 null waitMs/msUntil/time 留未知，合法 zero 不能被當未知', () => {
  const timed = { timeStart: 5, timeEnd: 8 };
  const unknown = availability(timed, {}, 0, { getTimeUntilRange: () => ({ inRange: false, waitMs: null }) }, {});
  assert.equal(unknown.nextMs, null);
  assert.equal(unknown.available, false);
  const weather = { weathers: ['Rain'] };
  const zone = { weatherZone: 'fixture' };
  const missing = availability(weather, zone, 0, {}, {
    getWeatherForZone: () => 'Clouds', findNextWeather: () => ({ msUntil: null, time: null }),
  });
  assert.equal(missing.nextMs, null);
  assert.equal(missing.weather.next, null);
  const zero = availability(weather, zone, 0, {}, {
    getWeatherForZone: () => 'Clouds', findNextWeather: () => ({ msUntil: 0, time: 0 }),
  });
  assert.equal(zero.weather.next?.msUntil, 0);
  assert.equal(zero.nextMs, 0);
  assert.equal(availability({}, {}, 0, {}, {}).available, true);
  assert.notEqual(wait(null), wait(0));
  assert.notEqual(formatMMSS(null), formatMMSS(0));
});

test('指定 now 的真實天氣預測與時間一致，抵达 predicted instant 真的可進行', () => {
  const zone = { weatherZone: 'South Shroud' };
  const entry = { weathers: ['Thunderstorms'] };
  for (const now of [0, 1400000 - 1, 1234567890123, 1900000000000]) {
    const result = availability(entry, zone, now, ET, WT);
    assert.ok(result.nextMs !== null && result.nextMs >= 0);
    assert.equal(availability(entry, zone, now + (result.nextMs || 0), ET, WT).available, true);
  }
});

test('time ∩ weather 在目前週期右端相接但不重疊，不可回報該交集', () => {
  const entry = { timeStart: 5, timeEnd: 8, weathers: ['Rain'] };
  const result = availability(entry, { weatherZone: 'fixture' }, 0, {
    WEATHER_PERIOD_MS: 100,
    getTimeUntilRange: () => ({ inRange: false, waitMs: 100 }),
  }, {
    SCAN_PERIODS: 1,
    getWeatherForZone: () => 'Rain',
  });
  assert.equal(result.available, false);
  assert.equal(result.nextMs, null);
});
