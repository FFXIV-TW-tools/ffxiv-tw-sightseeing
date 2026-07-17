
import { renderInlineMap, openMapModal } from './map_view.js';
import './eorzea-time.js';
import './weather.js';

const DATA = window.SIGHTSEEING_DATA || {};
const ZONES = window.SIGHTSEEING_ZONES || {};
const GUIDES = window.SIGHTSEEING_GUIDES || {};
const EXPS = ['arr', 'hw', 'sb', 'shb', 'ew', 'dt'];
const EXP_NAMES = { arr: '新生', hw: '蒼天', sb: '紅蓮', shb: '漆黑', ew: '曉月', dt: '黃金' };
const VER = { arr: '2.x', hw: '3.x', sb: '4.x', shb: '5.x', ew: '6.x', dt: '7.x' };
const STORE = 'ffxiv-sightseeing-completed';
const SOON_MS = 15 * 60 * 1000; // 「即將開放」門檻：15 分鐘內
const ET = window.EorzeaTime || {};
const WT = window.Weather || {};
const TABS = ['all'].concat(EXPS);
const state = { exp: 'all', done: new Set(), visible: new Map() };

EXPS.forEach(exp => (Array.isArray(DATA[exp]) ? DATA[exp] : []).forEach(entry => { entry._exp = exp; }));
const ALL = EXPS.flatMap(exp => Array.isArray(DATA[exp]) ? DATA[exp] : []);

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = value => String(value == null ? '' : value).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
const pad = value => String(value == null ? '' : value).padStart(3, '0');
const entries = () => state.exp === 'all' ? ALL : (Array.isArray(DATA[state.exp]) ? DATA[state.exp] : []);
const zone = entry => ZONES[entry && entry.zoneKey] || {};
const expOf = entry => entry && entry._exp || state.exp;
const itemId = entry => expOf(entry) + '-' + pad(entry.no);
const itemName = entry => String(entry.name || '').trim() || (EXP_NAMES[expOf(entry)] || String(expOf(entry)).toUpperCase()) + ' #' + pad(entry.no);
const timeValue = value => { if (value == null || value === '') return null; const n = Number(value); return Number.isFinite(n) ? (n < 24 ? Math.round(n) * 100 : n) : null; };
const hasTime = entry => timeValue(entry.timeStart) !== null && timeValue(entry.timeEnd) !== null;
const targets = entry => Array.isArray(entry.weathers) ? entry.weathers.filter(Boolean) : [];
const hasWeather = entry => targets(entry).length > 0;
// ⚠ 同 wait()：不可用 Number(ms) 收斂（Number(null)===0 會讓未知印成 00:00）。鐵則 7。
const formatMMSS = ms => { if (!Number.isFinite(ms) || ms < 0) return '--:--'; const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
// ⚠ 不可寫成 Number.isFinite(Number(ms))：Number(null)===0（不是 NaN）會逃過守門、被印成「現在」——
// 而 null 的語義是「未知／找不到」。2026-07-17 南林區雷雨誤顯示「下一次 現在」的根因。
const wait = ms => !Number.isFinite(ms) ? '計算中' : ms <= 0 ? '現在' : typeof ET.formatWaitTime === 'function' ? ET.formatWaitTime(ms) : formatMMSS(ms);
const weatherTC = value => { try { return typeof WT.getWeatherNameTC === 'function' ? WT.getWeatherNameTC(value) : value; } catch { return value; } };
const timeLabel = entry => { if (!hasTime(entry)) return ''; const f = value => String(Math.floor(Number(value) < 24 ? Number(value) : Number(value) / 100)).padStart(2, '0') + ':00'; return f(entry.timeStart) + '–' + f(entry.timeEnd); };

function currentWeather(z, now) {
  if (!z.weatherZone || typeof WT.getWeatherForZone !== 'function') return null;
  try {
    const value = WT.getWeatherForZone(z.weatherZone, Math.floor(now / 1000));
    return value && value !== 'Unknown' ? { value: value, name: weatherTC(value), icon: typeof WT.getWeatherIconUrl === 'function' ? WT.getWeatherIconUrl(value) : '' } : null;
  } catch { return null; }
}
function getWeatherWait(next, now) {
  const result = next && next.result ? next.result : next;
  const msUntil = Number(result && result.msUntil);
  if (Number.isFinite(msUntil)) return Math.max(0, msUntil);
  const time = Number(result && result.time);
  return Number.isFinite(time) ? Math.max(0, time - now) : null;
}
function nextWeather(z, wanted, now) {
  if (!z.weatherZone || !wanted.length || typeof WT.findNextWeather !== 'function') return null;
  try {
    const result = WT.findNextWeather(z.weatherZone, wanted);
    if (!result) return null;
    const ms = getWeatherWait({ result: result }, now);
    return Number.isFinite(ms) ? { result: result, time: result.time, msUntil: ms } : null;
  } catch { return null; }
}
// 掃未來天氣週期，回「天氣符合 ∩ 時間窗開啟」的第一刻（epoch ms）；掃描窗內找不到回 null。
// ⚠ 絕不可退回 Math.max(時間等待, 天氣等待)：ET 一天＝4200 秒＝剛好 3 個天氣週期，兩個閘各自
//    循環，max 只保證「較晚那個到了」，不保證那一刻另一個還成立 —— 天氣週期只有 23分20秒，
//    等到時間窗開時該天氣多半早就過了。2026-07-17 實測：80/80 個 both-gated 條目、67.5% 給錯時間。
// 跨午夜窗（18–5，21 個條目）不自行推算，一律交給已處理 wrap 的 ET.getTimeUntilRange，避免平行實作。
function nextBothOK(entry, z, wanted, now) {
  if (!z.weatherZone || typeof WT.getWeatherForZone !== 'function' || typeof ET.getTimeUntilRange !== 'function') return null;
  const period = Number(ET.WEATHER_PERIOD_MS);
  const scan = Number(WT.SCAN_PERIODS);
  if (!Number.isFinite(period) || !Number.isFinite(scan)) return null;
  const start = timeValue(entry.timeStart);
  const end = timeValue(entry.timeEnd);
  try {
    const first = Math.floor(now / period) * period;
    for (let i = 0; i < scan; i++) {
      const pStart = first + i * period;
      const pEnd = pStart + period;
      // 天氣在整個週期內固定（種子按 8 ET 小時算），取週期起點判定即可
      if (!wanted.includes(WT.getWeatherForZone(z.weatherZone, Math.floor(pStart / 1000)))) continue;
      const from = Math.max(pStart, now);
      const result = ET.getTimeUntilRange(start, end, from) || {};
      const open = result.inRange ? from : from + Number(result.waitMs);
      if (Number.isFinite(open) && open < pEnd) return open; // 窗在這個天氣週期內開啟＝兩閘同時成立
    }
  } catch { return null; }
  return null;
}
function availability(entry, z, now) {
  const timeGate = hasTime(entry);
  const weatherGate = hasWeather(entry);
  let time = { gated: timeGate, inRange: !timeGate, waitMs: timeGate ? null : 0 };
  if (timeGate && typeof ET.getTimeUntilRange === 'function') {
    try {
      const result = ET.getTimeUntilRange(timeValue(entry.timeStart), timeValue(entry.timeEnd), now) || {};
      time = { gated: true, inRange: Boolean(result.inRange), waitMs: Number.isFinite(Number(result.waitMs)) ? Math.max(0, Number(result.waitMs)) : null };
    } catch { time = { gated: true, inRange: false, waitMs: null }; }
  }
  const wanted = targets(entry);
  const current = weatherGate ? currentWeather(z, now) : null;
  const weatherOK = !weatherGate || Boolean(current && wanted.includes(current.value));
  const next = weatherGate && !weatherOK ? nextWeather(z, wanted, now) : null;
  // 天氣未知＝要看天氣但「現在天氣讀不到」或「掃描窗內找不到下一次符合」。
  // ⚠ 後者絕不可當 0：0 的語義是「不用等」，會讓下游把「算不出來」顯示成「現在／不必等」。
  const weatherUnknown = weatherGate && !weatherOK && (!current || !next);
  const unknown = (timeGate && time.waitMs === null) || weatherUnknown;
  const available = !unknown && time.inRange && weatherOK;
  // 兩閘都有＝必須掃交集（單閘才能直接用該閘的等待時間）。
  // 走到 else 若 !weatherOK 則 next 必非 null（否則已被 weatherUnknown 攔成 unknown）。
  let nextMs;
  if (unknown) nextMs = null;
  else if (available) nextMs = 0;
  else if (timeGate && weatherGate) { const open = nextBothOK(entry, z, wanted, now); nextMs = open === null ? null : Math.max(0, open - now); }
  else nextMs = timeGate ? time.waitMs : next.msUntil;
  return { available: available, status: unknown ? '等待中（條件資料不足）' : !timeGate && !weatherGate ? '隨時可進行' : available ? '現在可進行' : '目前不可進行', nextMs: nextMs, time: time, weather: { gated: weatherGate, current: current, matches: weatherOK, next: next, wanted: wanted } };
}
function loadDone() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORE) || '[]');
    return new Set(Array.isArray(value) ? value : Object.keys(value || {}).filter(key => value[key]));
  } catch { return new Set(); }
}
function saveDone() { try { window.localStorage.setItem(STORE, JSON.stringify(Array.from(state.done))); } catch {} }
function uiElements() {
  return { grid: $('#log-grid'), tabs: $('#exp-tabs'), search: $('#search-input'), zone: $('#zone-filter'), hide: $('#hide-completed'), only: $('#only-available'), sort: $('#sort-by-time'), et: $('#et-clock'), local: $('#local-time'), countdown: $('#weather-countdown'), visible: $('#visible-count'), total: $('#total-count'), completed: $('#completed-count'), completedTotal: $('#completed-total'), percent: $('#completed-percent'), active: $('#active-count') };
}
function badges() { EXPS.forEach(exp => { const el = $('#badge-' + exp); if (el) el.textContent = String(Array.isArray(DATA[exp]) ? DATA[exp].length : 0); }); const all = $('#badge-all'); if (all) all.textContent = String(ALL.length); }
function nhItem(item, trailHTML) {
  const entry = item.entry, exp = expOf(entry);
  return '<button type="button" class="ss-nh-item" data-target="' + esc(item.id) + '">' +
    '<span class="ss-nh-ver">' + esc(VER[exp] || '') + ' ' + esc(EXP_NAMES[exp] || '') + '</span>' +
    '<span class="ss-nh-ord">#' + esc(pad(entry.no)) + '</span>' +
    '<span class="ss-nh-name">' + esc(itemName(entry)) + '</span>' +
    '<span class="ss-nh-zone">' + esc((item.zone || {}).tc || '') + '</span>' +
    (trailHTML || '') +
  '</button>';
}
function nhGroup(cls, label, itemsHTML) {
  return '<div class="ss-nh-group ' + cls + '"><span class="ss-nh-key">' + label + '</span><div class="ss-nh-list">' + itemsHTML + '</div></div>';
}
function updateNextHint(ui) {
  const hint = $('#next-hint');
  if (!hint) return;
  // 現在可執行＝有時間/天氣限制（2.0 為主）且此刻正好在窗口內的；下一個可執行＝即將到來的
  const now = [], next = [];
  state.visible.forEach(item => {
    const a = item.availability;
    if (!a) return;
    if (a.available && (a.time.gated || a.weather.gated)) now.push(item);
    else if (Number.isFinite(a.nextMs) && a.nextMs > 0) next.push({ item: item, ms: a.nextMs });
  });
  next.sort((a, b) => a.ms - b.ms);
  if (!now.length && !next.length) { hint.hidden = true; hint.innerHTML = ''; return; }
  hint.hidden = false;
  let html = '';
  if (now.length) html += nhGroup('ss-nh-group--now codex-tint-panel codex-tint-panel--success', '現在可執行',
    now.slice(0, 3).map(item => nhItem(item, '<span class="ss-nh-wait ss-nh-wait--now">進行中</span>')).join(''));
  if (next.length) html += nhGroup('ss-nh-group--next codex-tint-panel codex-tint-panel--warn', '下一個可執行',
    next.slice(0, 3).map(c => nhItem(c.item, '<span class="ss-nh-wait">' + esc(wait(c.ms)) + '</span>')).join(''));
  hint.innerHTML = html;
}
function updateZones(ui) {
  if (!ui.zone) return;
  const old = ui.zone.value;
  const keys = Array.from(new Set(entries().map(entry => entry.zoneKey).filter(Boolean))).sort((a, b) => String((ZONES[a] || {}).tc || a).localeCompare(String((ZONES[b] || {}).tc || b), 'zh-Hant'));
  ui.zone.replaceChildren(new Option('全部地區', ''));
  keys.forEach(key => ui.zone.append(new Option((ZONES[key] || {}).tc || key, key)));
  ui.zone.value = keys.includes(old) ? old : '';
}
function filtered(ui) {
  const query = ui.search ? ui.search.value.trim().toLocaleLowerCase() : '';
  const zoneKey = ui.zone ? ui.zone.value : '';
  const now = Date.now();
  const list = entries().map((entry, index) => {
    const z = zone(entry);
    const id = itemId(entry);
    const a = availability(entry, z, now);
    return { entry: entry, zone: z, id: id, index: index, completed: state.done.has(id), availability: a };
  }).filter(item => {
    const text = (itemName(item.entry) + ' ' + (item.entry.name || '') + ' ' + (item.zone.tc || '') + ' ' + (item.entry.zoneKey || '')).toLocaleLowerCase();
    return (!query || text.includes(query)) && (!zoneKey || item.entry.zoneKey === zoneKey) && (!ui.hide || !ui.hide.checked || !item.completed) && (!ui.only || !ui.only.checked || item.availability.available);
  });
  if (ui.sort && ui.sort.checked) list.sort((a, b) => (a.availability.nextMs == null ? Infinity : a.availability.nextMs) - (b.availability.nextMs == null ? Infinity : b.availability.nextMs) || a.index - b.index);
  return { list: list, now: now };
}
function mapHTML(entry, z) {
  try { return renderInlineMap({ img: z.image, sf: z.sf, markers: [{ x: entry.x, y: entry.y }], title: z.tc, clickToEnlarge: true }); } catch { return ''; }
}
function row(key, valueHTML, options) {
  const o = options || {};
  const label = o.labelHTML || esc(key);
  const trail = o.trailHTML || '';
  return '<div class="ss-row' + (o.cond ? ' ss-row--cond' : '') + '"><dt class="ss-k">' + label + '</dt><dd class="ss-v' + (o.vClass ? ' ' + o.vClass : '') + '"' + (o.live ? ' data-live="' + o.live + '"' : '') + '>' + valueHTML + '</dd>' + trail + '</div>';
}
function copyBtn(attr, value) {
  return '<button class="ss-copy" type="button" ' + attr + '="' + esc(value) + '" aria-label="複製">⧉</button>';
}
function card(item) {
  const entry = item.entry;
  const z = item.zone;
  const a = item.availability;
  const command = String(entry.emoteCmd || '').trim();
  const zoneName = esc(z.tc || entry.zoneKey || '未知地區');
  const coordHTML = '<span class="ss-xy">X <b>' + esc(entry.x) + '</b></span><span class="ss-xy">Y <b>' + esc(entry.y) + '</b></span>' + (entry.z == null ? '' : '<span class="ss-xy">Z <b>' + esc(entry.z) + '</b></span>');
  const rows = [];
  rows.push(row('位置', '<span class="ss-zone-name">' + zoneName + '</span>', { vClass: 'ss-v--zone' }));
  rows.push(row('座標', coordHTML, { vClass: 'ss-v--coord', trailHTML: copyBtn('data-copy', (z.tc || '') + ' (' + entry.x + ', ' + entry.y + ')') }));
  rows.push(row('指令', (command ? '<code class="ss-cmd">/' + esc(command) + '</code>' : '') + '<span class="ss-emote-tc">' + esc(entry.emote || '—') + '</span>', { vClass: 'ss-v--emote', trailHTML: command ? copyBtn('data-copy-emote', '/' + command) : '' }));
  if (a.weather.gated) rows.push('<div class="ss-row ss-row--cond"><dt class="ss-k">天氣</dt><dd class="ss-v ss-v--wx"><img class="ss-wx" data-live="weather-icon" alt="" loading="lazy"><span data-live="weather">讀取中</span></dd><span class="ss-req">需 ' + esc(a.weather.wanted.map(weatherTC).join('／')) + '</span></div>');
  if (a.time.gated) rows.push(row('時間', esc(timeLabel(entry)), { cond: true, live: 'time', labelHTML: '<span class="ss-clock" aria-hidden="true">◷</span>時間' }));
  const guide = String(GUIDES[item.id] || '').trim();
  const template = document.createElement('template');
  template.innerHTML = '<article class="ss-card' + (item.completed ? ' completed' : '') + '" data-id="' + esc(item.id) + '" data-available="' + String(a.available) + '">' +
    '<header class="ss-head"><span class="ss-ord">' + esc(pad(entry.no)) + '</span><h2 class="ss-title"><span>' + esc(itemName(entry)) + '</span></h2><span class="ss-done-badge">✓ 已完成</span><label class="ss-done"><input class="ss-complete-input" type="checkbox"' + (item.completed ? ' checked' : '') + ' aria-label="標記完成"><span class="ss-done-txt">完成</span></label></header>' +
    '<div class="ss-body">' +
      '<div class="ss-map">' + (mapHTML(entry, z) || '<div class="ss-map-empty">地圖資料暫缺</div>') + '</div>' +
      '<dl class="ss-ledger">' + rows.join('') + '</dl>' +
    '</div>' +
    '<p class="ss-guide' + (guide ? '' : ' ss-guide--empty') + '"><span class="ss-guide-key">引導</span><span class="ss-guide-txt">' + (guide ? esc(guide) : '—') + '</span></p>' +
    (entry.note ? '<p class="ss-note">' + esc(entry.note) + '</p>' : '') +
    '<footer class="ss-foot"><span class="ss-dot" aria-hidden="true"></span><span class="ss-state" data-live="status"></span><span class="ss-next" data-live="next"></span></footer>' +
    '</article>';
  return template.content.firstElementChild;
}
function updateCard(element, item, now) {
  if (!item) return;
  const a = availability(item.entry, item.zone, now);
  item.availability = a;
  element.dataset.available = String(a.available);
  element.classList.toggle('ss-card--available', a.available);
  element.classList.toggle('ss-card--soon', !a.available && Number.isFinite(a.nextMs) && a.nextMs > 0 && a.nextMs <= SOON_MS);
  const status = $('[data-live="status"]', element);
  if (status) { status.textContent = a.status; status.classList.toggle('ss-status--success', a.available); status.classList.toggle('ss-status--muted', !a.available); }
  const next = $('[data-live="next"]', element);
  // 判準與 updateNextHint／排序／ss-card--soon 一致：只有「確定要等且等得到」才顯示時間。
  // ⚠ 舊寫法 a.nextMs === 0 才隱藏 → nextMs=null（未知）不等於 0，反而印出「下次可進行：現在」。
  if (next) { next.textContent = Number.isFinite(a.nextMs) && a.nextMs > 0 ? '下次可進行：' + wait(a.nextMs) : ''; next.hidden = !next.textContent; }
  const time = $('[data-live="time"]', element);
  if (time && a.time.gated) time.textContent = a.time.inRange ? timeLabel(item.entry) + ' · 符合' : timeLabel(item.entry) + ' · 下一時段 ' + wait(a.time.waitMs);
  const weather = $('[data-live="weather"]', element);
  const icon = $('[data-live="weather-icon"]', element);
  if (weather && a.weather.gated) { weather.textContent = a.weather.current ? a.weather.current.name + (a.weather.matches ? ' · 符合' : ' · 下一次 ' + wait(a.weather.next && a.weather.next.msUntil)) : '天氣資料暫缺'; if (icon) { icon.src = a.weather.current && a.weather.current.icon || ''; icon.alt = a.weather.current && a.weather.current.name || ''; icon.hidden = !icon.src; } }
}
function stats(ui, list) {
  const all = entries();
  const done = all.filter(entry => state.done.has(itemId(entry))).length;
  if (ui.visible) ui.visible.textContent = String(list.length);
  if (ui.total) ui.total.textContent = String(all.length);
  if (ui.completed) ui.completed.textContent = String(done);
  if (ui.completedTotal) ui.completedTotal.textContent = String(all.length);
  if (ui.percent) ui.percent.textContent = all.length ? String(Math.round(done * 100 / all.length)) : '0';
  if (ui.active) ui.active.textContent = String(list.filter(item => item.availability.available).length);
}
function render(ui) {
  const result = filtered(ui);
  state.visible = new Map(result.list.map(item => [item.id, item]));
  const fragment = document.createDocumentFragment();
  result.list.forEach(item => fragment.append(card(item)));
  if (!result.list.length) { const empty = document.createElement('p'); empty.className = 'ss-empty codex-body'; empty.textContent = entries().length ? '沒有符合條件的探索筆記。' : '目前版本沒有可用資料。'; fragment.append(empty); }
  ui.grid.replaceChildren(fragment);
  $$('.ss-card', ui.grid).forEach(element => updateCard(element, state.visible.get(element.dataset.id), result.now));
  stats(ui, result.list);
  updateNextHint(ui);
}
function tick(ui, now) {
  if (ui.et && typeof ET.getCurrentEorzeaTime === 'function' && typeof ET.formatTime === 'function') { try { ui.et.textContent = ET.formatTime(ET.getCurrentEorzeaTime(now)); } catch { ui.et.textContent = '--:--'; } }
  if (ui.local) { const d = new Date(now); ui.local.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  if (ui.countdown && typeof ET.getTimeUntilNextWeather === 'function') { try { ui.countdown.textContent = formatMMSS(ET.getTimeUntilNextWeather(now).ms); } catch { ui.countdown.textContent = '--:--'; } }
  // 效能：每秒只刷「有 gating（時間/天氣）」的卡；無條件的卡狀態靜態（隨時可進行），免逐秒重算
  $$('.ss-card', ui.grid).forEach(element => {
    const item = state.visible.get(element.dataset.id);
    if (!item) return;
    const a = item.availability;
    if (a && !a.time.gated && !a.weather.gated) return;
    updateCard(element, item, now);
  });
  stats(ui, Array.from(state.visible.values()));
  updateNextHint(ui);
}
function init() {
  const ui = uiElements();
  if (!ui.grid) return;
  state.done = loadDone();
  badges();
  updateZones(ui);
  $$('.ss-tab[data-exp]', ui.tabs || document).forEach(tab => tab.addEventListener('click', () => {
    state.exp = TABS.includes(tab.dataset.exp) ? tab.dataset.exp : 'all';
    $$('.ss-tab[data-exp]', ui.tabs || document).forEach(other => { const active = other.dataset.exp === state.exp; other.setAttribute('aria-pressed', String(active)); other.classList.toggle('active', active); });
    updateZones(ui);
    render(ui);
  }));
  if (ui.search) ui.search.addEventListener('input', () => render(ui));
  [ui.zone, ui.hide, ui.only, ui.sort].filter(Boolean).forEach(control => control.addEventListener('change', () => render(ui)));
  ui.grid.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const map = target.closest('.map-inline--clickable');
    if (map) { try { openMapModal(JSON.parse(decodeURIComponent(map.dataset.map))); } catch {} return; }
    const copy = target.closest('[data-copy], [data-copy-emote]');
    if (copy && navigator.clipboard) navigator.clipboard.writeText(copy.dataset.copy || copy.dataset.copyEmote).then(() => { const old = copy.textContent; copy.textContent = '已複製'; setTimeout(() => { copy.textContent = old; }, 1200); }).catch(() => {});
  });
  ui.grid.addEventListener('keydown', event => {
    const target = event.target instanceof Element ? event.target : null;
    const map = target && target.closest('.map-inline--clickable');
    if (!map || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    try { openMapModal(JSON.parse(decodeURIComponent(map.dataset.map))); } catch {}
  });
  ui.grid.addEventListener('change', event => {
    const input = event.target instanceof HTMLInputElement ? event.target.closest('.ss-complete-input') : null;
    if (!input) return;
    const element = input.closest('.ss-card');
    if (input.checked) state.done.add(element.dataset.id); else state.done.delete(element.dataset.id);
    element.classList.toggle('completed', input.checked);
    saveDone();
    // 開著「隱藏已完成」時，剛勾成完成的卡立即移除（免重整才消失）
    if (input.checked && ui.hide && ui.hide.checked) {
      state.visible.delete(element.dataset.id);
      element.remove();
      updateNextHint(ui);
    }
    stats(ui, Array.from(state.visible.values()));
  });
  const hint = $('#next-hint');
  if (hint) hint.addEventListener('click', event => {
    const it = event.target instanceof Element ? event.target.closest('.ss-nh-item') : null;
    const id = it && it.dataset.target;
    const el = id && $$('.ss-card', ui.grid).find(card => card.dataset.id === id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ss-card--flash'); setTimeout(() => el.classList.remove('ss-card--flash'), 1400); }
  });
  const toTop = $('#to-top');
  if (toTop) {
    const syncToTop = () => { toTop.classList.toggle('is-visible', window.scrollY >= 400); };
    window.addEventListener('scroll', syncToTop, { passive: true });
    syncToTop();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  const onlyWrap = $('#only-available-wrap');
  if (onlyWrap) onlyWrap.hidden = false;
  $$('.ss-tab[data-exp]', ui.tabs || document).forEach(tab => { const active = tab.dataset.exp === state.exp; tab.setAttribute('aria-pressed', String(active)); tab.classList.toggle('active', active); });
  render(ui);
  tick(ui, Date.now());
  setInterval(() => tick(ui, Date.now()), 1000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();

// 純函式對外導出，供 tools/validate-availability.mjs 迴歸測試（瀏覽器端不使用，無執行期影響）
export { wait, availability, timeValue, formatMMSS };
