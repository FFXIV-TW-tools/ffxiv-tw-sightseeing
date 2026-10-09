
import { renderInlineMap, openMapModal } from './map_view.js';
import './eorzea-time.js';
import './weather.js';
import { iconSVG, fillStaticIcons } from './ss_visual.js';
import { formatTimeWindow, formatUnfinishedList } from './ss_list.js';
import { availability, hasTime, wait, formatMMSS } from './ss_availability.js';
import { loadCompleted, saveCompleted, COMPLETED_KEY } from './ss_storage.js';

const DATA = window.SIGHTSEEING_DATA || {};
const ZONES = window.SIGHTSEEING_ZONES || {};
const GUIDES = window.SIGHTSEEING_GUIDES || {};
const EXPS = ['arr', 'hw', 'sb', 'shb', 'ew', 'dt'];
const EXP_NAMES = { arr: '新生', hw: '蒼天', sb: '紅蓮', shb: '漆黑', ew: '曉月', dt: '黃金' };
const VER = { arr: '2.x', hw: '3.x', sb: '4.x', shb: '5.x', ew: '6.x', dt: '7.x' };
const PREFS = 'ffxiv-sightseeing-prefs'; // 記住檢視偏好（隱藏已完成 / 僅可進行 / 依時間排序）跨重整不清除
const UNREADABLE = '完成紀錄讀不到或已損毀；為免蓋掉原紀錄，本頁勾選不會儲存。';
const SOON_MS = 15 * 60 * 1000; // 「即將開放」門檻：15 分鐘內
const ET = window.EorzeaTime || {};
const WT = window.Weather || {};
const TABS = ['all', 'arr-front', 'arr-back'].concat(EXPS.filter(exp => exp !== 'arr'));
const state = { exp: 'all', done: new Set(), visible: new Map(), composing: false, hintOpen: { now: false, next: false } };

EXPS.forEach(exp => (Array.isArray(DATA[exp]) ? DATA[exp] : []).forEach(entry => { entry._exp = exp; }));
const ALL = EXPS.flatMap(exp => Array.isArray(DATA[exp]) ? DATA[exp] : []);
// 2.0/ARR 依遊戲機制拆兩個「版本分類」分頁：前半 No.1–20、後半 No.21–80（前半全解才開放後半）
const ARR = Array.isArray(DATA.arr) ? DATA.arr : [];
const ARR_FRONT = ARR.filter(entry => entry.no <= 20);
const ARR_BACK = ARR.filter(entry => entry.no >= 21);

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = value => String(value == null ? '' : value).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
const pad = value => String(value == null ? '' : value).padStart(3, '0');
const entries = () => state.exp === 'all' ? ALL : state.exp === 'arr-front' ? ARR_FRONT : state.exp === 'arr-back' ? ARR_BACK : (Array.isArray(DATA[state.exp]) ? DATA[state.exp] : []);
const zone = entry => ZONES[entry && entry.zoneKey] || {};
const expOf = entry => entry && entry._exp || state.exp;
const itemId = entry => expOf(entry) + '-' + pad(entry.no);
const itemName = entry => String(entry.name || '').trim() || (EXP_NAMES[expOf(entry)] || String(expOf(entry)).toUpperCase()) + ' #' + pad(entry.no);
const weatherTC = value => { try { return typeof WT.getWeatherNameTC === 'function' ? WT.getWeatherNameTC(value) : value; } catch { return value; } };
const timeLabel = entry => hasTime(entry) ? formatTimeWindow(entry) : '';

/** @typedef {{entry: import('./ss_availability.js').Entry & {no: number, name?: string}, zone: import('./ss_availability.js').Zone, id: string, index: number, completed: boolean, availability: ReturnType<typeof availability>}} VisibleItem */
/** @param {Element | null} element @param {string} text */
function updateText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}
/** @param {string} message @param {string} [tone] */
function feedback(message, tone = 'warn') {
  const region = $('#ss-feedback');
  const toast = window.FFXIVToast;
  if (region) {
    region.textContent = message;
    region.classList.toggle('codex-sr-only', typeof toast?.show === 'function');
  }
  if (typeof toast?.show === 'function') toast.show(message, tone);
}
/** @param {string} value @param {string} message @returns {Promise<boolean>} */
async function copyText(value, message) {
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    feedback(message, 'ok');
    return true;
  } catch {
    feedback('複製失敗，請手動選取');
    return false;
  }
}
function loadPrefs() { try { const v = JSON.parse(window.localStorage.getItem(PREFS) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { feedback('檢視偏好無法讀取，本頁使用預設檢視。'); return {}; } }
function pressed(control) { return control?.getAttribute('aria-pressed') === 'true'; }
function setPressed(control, value) { if (control) control.setAttribute('aria-pressed', String(value)); }
function savePrefs(ui) { try { window.localStorage.setItem(PREFS, JSON.stringify({ exp: state.exp, hide: pressed(ui.hide), only: pressed(ui.only), sort: pressed(ui.sort) })); } catch { feedback('檢視偏好無法儲存；變更僅在本頁生效。'); } }
function uiElements() {
  return { grid: $('#log-grid'), tabs: $('#exp-tabs'), search: $('#search-input'), zone: $('#zone-filter'), hide: $('#hide-completed'), only: $('#only-available'), sort: $('#sort-by-time'), copy: $('#copy-visible'), et: $('#et-clock'), local: $('#local-time'), countdown: $('#weather-countdown'), visible: $('#visible-count'), total: $('#total-count'), completed: $('#completed-count'), completedTotal: $('#completed-total'), percent: $('#completed-percent'), active: $('#active-count') };
}
function badges() {
  const groups = { all: ALL, 'arr-front': ARR_FRONT, 'arr-back': ARR_BACK };
  EXPS.filter(exp => exp !== 'arr').forEach(exp => { groups[exp] = Array.isArray(DATA[exp]) ? DATA[exp] : []; });
  TABS.forEach(key => {
    const list = groups[key], el = $('#badge-' + key);
    if (el) el.textContent = list.filter(entry => state.done.has(itemId(entry))).length + '/' + list.length;
  });
}
function nhItem(item, trailHTML) {
  const entry = item.entry, exp = expOf(entry);
  // mini-card：上排 版本/編號/等待（等待固定右上），下排 名稱/地區獨佔一行 → 各卡等高、不因名稱長短跳行
  return '<button type="button" class="ss-nh-item" data-target="' + esc(item.id) + '">' +
    '<span class="ss-nh-top">' +
      '<span class="ss-nh-ver">' + esc(VER[exp] || '') + ' ' + esc(EXP_NAMES[exp] || '') + '</span>' +
      '<span class="ss-nh-ord">#' + esc(pad(entry.no)) + '</span>' +
      (trailHTML || '') +
    '</span>' +
    '<span class="ss-nh-body">' +
      '<span class="ss-nh-name">' + esc(itemName(entry)) + '</span>' +
      '<span class="ss-nh-zone">' + esc((item.zone || {}).tc || '') + '</span>' +
    '</span>' +
  '</button>';
}
function nhGroup(cls, label, count, bodyHTML) {
  const tone = cls.includes('--now') ? 'var(--color-success)' : 'var(--color-warn)';
  return '<div class="ss-nh-group ' + cls + '"><div class="codex-group-head" style="--group-tone:' + tone + '"><span class="codex-group-head__title">' + label + '</span><span class="codex-count">' + count + '</span></div><div class="ss-nh-list">' + bodyHTML + '</div></div>';
}
// 預設只列前 NH_LIMIT 個，展開狀態保留在 state；倒數不替換 membership 未變的提示 DOM。
const NH_LIMIT = 3;
function nhMore(group, total, expanded) {
  const extra = total - NH_LIMIT;
  if (extra <= 0) return '';
  return '<button type="button" class="codex-btn codex-btn--ghost" data-group="' + group + '">' + (expanded ? '收合' : '顯示其餘 ' + extra + ' 筆') + '</button>';
}
function updateNextHint(ui) {
  const hint = $('#next-hint');
  if (!hint) return;
  // 只有提示 membership／順序改變才替換；此時保留焦點與橫向捲動。
  const active = hint.contains(document.activeElement) ? document.activeElement : null;
  const focusItem = active?.dataset.target;
  const focusGroup = active?.dataset.group;
  const scroll = {
    now: $('.ss-nh-group--now .ss-nh-list', hint)?.scrollLeft || 0,
    next: $('.ss-nh-group--next .ss-nh-list', hint)?.scrollLeft || 0
  };
  // 現在可執行＝有時間/天氣限制（2.0 為主）且此刻正好在窗口內的；下一個可執行＝即將到來的
  /** @type {VisibleItem[]} */
  const now = [];
  /** @type {{item: VisibleItem, ms: number}[]} */
  const next = [];
  state.visible.forEach(item => {
    if (state.done.has(item.id)) return; // 已完成不進提示（現在/下一個可執行皆排除）
    const a = item.availability;
    if (!a) return;
    if (a.available && (a.time.gated || a.weather.gated)) now.push(item);
    else if (Number.isFinite(a.nextMs) && a.nextMs > 0) next.push({ item: item, ms: a.nextMs });
  });
  next.sort((a, b) => a.ms - b.ms);
  const members = JSON.stringify([now.map(item => item.id), next.map(c => c.item.id), state.hintOpen]);
  if (hint.dataset.members === members) {
    const waits = new Map(next.map(c => [c.item.id, wait(c.ms, ET.formatWaitTime)]));
    $$('.ss-nh-group--next .ss-nh-item', hint).forEach(button => {
      updateText($('.ss-nh-wait', button), waits.get(button.dataset.target) || '');
    });
    return;
  }
  hint.dataset.members = members;
  if (!now.length && !next.length) { hint.hidden = true; hint.replaceChildren(); return; }
  hint.hidden = false;
  let html = '';
  if (now.length) {
    const open = state.hintOpen.now;
    const body = (open ? now : now.slice(0, NH_LIMIT)).map(item => nhItem(item, '<span class="ss-nh-wait ss-nh-wait--now">進行中</span>')).join('') + nhMore('now', now.length, open);
    html += nhGroup('ss-nh-group--now codex-tint-panel codex-tint-panel--success', '現在可進行', now.length, body);
  }
  if (next.length) {
    const open = state.hintOpen.next;
    const body = (open ? next : next.slice(0, NH_LIMIT)).map(c => nhItem(c.item, '<span class="ss-nh-wait">' + esc(wait(c.ms, ET.formatWaitTime)) + '</span>')).join('') + nhMore('next', next.length, open);
    html += nhGroup('ss-nh-group--next codex-tint-panel codex-tint-panel--warn', '接下來可進行', next.length, body);
  }
  hint.innerHTML = html;
  for (const group of ['now', 'next']) {
    const list = $('.ss-nh-group--' + group + ' .ss-nh-list', hint);
    if (list && scroll[group]) list.scrollLeft = scroll[group];
  }
  if (active) {
    const replacement = focusItem
      ? $$('.ss-nh-item', hint).find(el => el.dataset.target === focusItem)
      : $$('[data-group]', hint).find(el => el.dataset.group === focusGroup);
    replacement?.focus({ preventScroll: true });
  }
}
function updateZones(ui) {
  if (!ui.zone) return;
  const old = ui.zone.value;
  const keys = Array.from(new Set(entries().map(entry => entry.zoneKey).filter(Boolean))).sort((a, b) => String((ZONES[a] || {}).tc || a).localeCompare(String((ZONES[b] || {}).tc || b), 'zh-Hant'));
  ui.zone.replaceChildren(new Option('全部地區', ''));
  keys.forEach(key => ui.zone.append(new Option((ZONES[key] || {}).tc || key, key)));
  ui.zone.value = keys.includes(old) ? old : '';
}
/** @param {ReturnType<typeof uiElements>} ui @param {number} [now] @returns {{list: VisibleItem[], now: number}} */
function filtered(ui, now = Date.now()) {
  const query = ui.search ? ui.search.value.trim().toLocaleLowerCase() : '';
  const zoneKey = ui.zone ? ui.zone.value : '';
  const list = entries().map((entry, index) => {
    const z = zone(entry);
    const id = itemId(entry);
    return { entry, zone: z, id, index, completed: state.done.has(id) };
  }).filter(item => {
    const text = (itemName(item.entry) + ' ' + (item.entry.name || '') + ' ' + (item.zone.tc || '') + ' ' + (item.entry.zoneKey || '')).toLocaleLowerCase();
    return (!query || text.includes(query)) && (!zoneKey || item.entry.zoneKey === zoneKey) && (!pressed(ui.hide) || !item.completed);
  }).map(item => ({ ...item, availability: availability(item.entry, item.zone, now, ET, WT) }))
    .filter(item => !pressed(ui.only) || item.availability.available);
  if (pressed(ui.sort)) list.sort((a, b) => (a.availability.nextMs == null ? Infinity : a.availability.nextMs) - (b.availability.nextMs == null ? Infinity : b.availability.nextMs) || a.index - b.index);
  return { list, now };
}
function mapHTML(entry, z) {
  try {
    const html = renderInlineMap({ img: z.image, sf: z.sf, markers: [{ x: entry.x, y: entry.y, label: itemName(entry) }], title: (z.tc || entry.zoneKey || '未知地區') + '・No.' + pad(entry.no) + ' ' + itemName(entry), clickToEnlarge: true });
    return html && html + '<div class="ss-map-empty">地圖暫時無法顯示，仍可使用 X／Y 座標尋找。</div>';
  } catch { return ''; }
}
function row(key, valueHTML, options) {
  const o = options || {};
  const label = o.labelHTML || esc(key);
  const trail = o.trailHTML || '';
  return '<div class="ss-row' + (o.cond ? ' ss-row--cond' : '') + '"><dt class="ss-k">' + label + '</dt><dd class="ss-v' + (o.vClass ? ' ' + o.vClass : '') + '"' + (o.live ? ' data-live="' + o.live + '"' : '') + '>' + valueHTML + '</dd>' + trail + '</div>';
}
// 複製鈕＝共用 `.codex-icon-btn`（B-027 就是為這個用途做的：當時複製鈕在 5 個 repo 各刻一份、
// glyph 還四種不一致）。點擊行為綁 `[data-copy]` 屬性、與圖示無關，故換元件不動接線。
// ⚠️ 降級路徑不是防禦性過度設計：portal 的 CSS/JS 走跨網域 CDN，「工具已部署、portal 還沒」
//    是已知會發生的狀態（同 marketboard `modules/clipboard.js` 的處置）；JS 這層降回 ⧉ 與改之前一樣。
/** @param {string} attr @param {string} value @param {string} label */
function copyBtn(attr, value, label) {
  const attrs = { class: 'codex-icon-btn--sm', 'data-copy-label': label, [attr]: value };
  if (window.FFXIVIcons) return window.FFXIVIcons.btnHTML('copy', label, attrs);
  return '<button type="button" class="codex-icon-btn codex-icon-btn--sm" '
    + attr + '="' + esc(value) + '" data-copy-label="' + esc(label) + '" aria-label="' + esc(label) + '">⧉</button>';
}
function card(item) {
  const entry = item.entry;
  const z = item.zone;
  const a = item.availability;
  const command = String(entry.emoteCmd || '').trim();
  const context = 'No.' + pad(entry.no) + ' ' + itemName(entry);
  const zoneName = esc(z.tc || entry.zoneKey || '未知地區');
  const coordHTML = '<span class="ss-xy">X <b>' + esc(entry.x) + '</b></span><span class="ss-xy">Y <b>' + esc(entry.y) + '</b></span>' + (entry.z == null ? '' : '<span class="ss-xy">Z <b>' + esc(entry.z) + '</b></span>');
  const rows = [];
  rows.push(row('位置', '<span class="ss-zone-name">' + zoneName + '</span>', { vClass: 'ss-v--zone' }));
  rows.push(row('座標', coordHTML, { vClass: 'ss-v--coord', trailHTML: copyBtn('data-copy', (z.tc || '') + ' (' + entry.x + ', ' + entry.y + ')', '複製座標：' + context) }));
  rows.push(row('指令', (command ? '<code class="ss-cmd">/' + esc(command) + '</code>' : '') + '<span class="ss-emote-tc">' + esc(entry.emote || '—') + '</span>', { vClass: 'ss-v--emote', trailHTML: command ? copyBtn('data-copy-emote', '/' + command, '複製指令：' + context) : '' }));
  if (a.weather.gated) rows.push('<div class="ss-row ss-row--cond"><dt class="ss-k">天氣</dt><dd class="ss-v ss-v--wx"><img class="ss-wx" data-live="weather-icon" alt="" loading="lazy"><span data-live="weather">讀取中</span></dd><span class="ss-req">需 ' + esc(a.weather.wanted.map(weatherTC).join('／')) + '</span></div>');
  if (a.time.gated) rows.push(row('時間', esc(timeLabel(entry)), { cond: true, live: 'time', labelHTML: '<span class="ss-clock" aria-hidden="true">◷</span>時間' }));
  const guide = String(GUIDES[item.id] || '').trim();
  const template = document.createElement('template');
  template.innerHTML = '<article tabindex="-1" class="codex-card ss-card' + (item.completed ? ' completed' : '') + '" data-id="' + esc(item.id) + '" data-available="' + String(a.available) + '">' +
    '<header class="ss-head"><span class="ss-ord">' + esc(pad(entry.no)) + '</span><h2 class="ss-title"><span>' + esc(itemName(entry)) + '</span></h2><span class="ss-done-badge codex-badge codex-badge--success codex-badge--hollow">✓ 已完成</span><label class="ss-done"><input class="ss-complete-input" type="checkbox"' + (item.completed ? ' checked' : '') + ' aria-label="' + esc('標記完成：' + context) + '"><span class="ss-done-txt">標記完成</span></label></header>' +
    '<div class="ss-body">' +
      '<div class="ss-map">' + (mapHTML(entry, z) || '<div class="ss-map-empty">地圖暫時無法顯示，仍可使用 X／Y 座標尋找。</div>') + '</div>' +
      '<dl class="ss-ledger">' + rows.join('') + '</dl>' +
    '</div>' +
    '<p class="ss-guide' + (guide ? '' : ' ss-guide--empty') + '"><span class="ss-guide-key">引導</span><span class="ss-guide-txt">' + (guide ? esc(guide) : '—') + '</span></p>' +
    (entry.note ? '<p class="ss-note">' + esc(entry.note) + '</p>' : '') +
    '<footer class="ss-foot"><span class="ss-dot" aria-hidden="true"></span><span class="ss-state" data-live="status"></span><span class="ss-next" data-live="next"></span></footer>' +
    '</article>';
  const map = $('.map-inline--clickable', template.content);
  if (map) map.setAttribute('aria-label', '放大地圖：' + context);
  return template.content.firstElementChild;
}
function updateCard(element, item) {
  if (!item) return;
  const a = item.availability;
  element.classList.toggle('completed', item.completed);
  const checkbox = $('.ss-complete-input', element);
  if (checkbox) checkbox.checked = item.completed;
  element.dataset.available = String(a.available);
  element.classList.toggle('ss-card--available', a.available);
  element.classList.toggle('ss-card--soon', !a.available && Number.isFinite(a.nextMs) && a.nextMs > 0 && a.nextMs <= SOON_MS);
  const status = $('[data-live="status"]', element);
  if (status) { updateText(status, a.status); status.classList.toggle('ss-status--success', a.available); status.classList.toggle('ss-status--muted', !a.available); }
  const next = $('[data-live="next"]', element);
  // 判準與 updateNextHint／排序／ss-card--soon 一致：只有「確定要等且等得到」才顯示時間。
  // ⚠ 舊寫法 a.nextMs === 0 才隱藏 → nextMs=null（未知）不等於 0，反而印出「下次可進行：現在」。
  if (next) { updateText(next, Number.isFinite(a.nextMs) && a.nextMs > 0 ? '下次可進行：' + wait(a.nextMs, ET.formatWaitTime) : ''); next.hidden = !next.textContent; }
  const time = $('[data-live="time"]', element);
  if (time && a.time.gated) updateText(time, a.time.inRange ? timeLabel(item.entry) + ' · 符合' : timeLabel(item.entry) + ' · 下一時段 ' + wait(a.time.waitMs, ET.formatWaitTime));
  const weather = $('[data-live="weather"]', element);
  const icon = $('[data-live="weather-icon"]', element);
  if (weather && a.weather.gated) {
    updateText(weather, a.weather.current ? a.weather.current.name + (a.weather.matches ? ' · 符合' : ' · 下一次 ' + wait(a.weather.next && a.weather.next.msUntil, ET.formatWaitTime)) : '天氣資料暫缺');
    if (icon) {
      const src = a.weather.current && a.weather.current.icon || '';
      if (icon.getAttribute('src') !== src) { if (src) icon.setAttribute('src', src); else icon.removeAttribute('src'); }
      icon.alt = a.weather.current && a.weather.current.name || '';
      icon.hidden = !src;
    }
  }
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
function emptyState(ui) {
  const list = entries();
  const noData = ALL.length === 0;
  const noVersion = !noData && list.length === 0;
  const allDone = list.length > 0 && list.every(entry => state.done.has(itemId(entry)));
  const completedOnly = allDone && pressed(ui.hide) && !ui.search.value.trim() && !ui.zone.value && !pressed(ui.only);
  const headline = noData ? '探索筆記資料載入失敗，請重新整理頁面。' : noVersion ? '此版本目前沒有點位，請切換其他版本。' : completedOnly ? '這個版本的筆記都完成了！' : '找不到符合條件的探索筆記。';
  const hint = noData || noVersion || completedOnly ? '' : '<p>試著清除搜尋與篩選。</p>';
  const action = noVersion ? '' : '<button type="button" class="codex-btn codex-btn--ghost" data-ss-clear="' + (noData ? 'reload' : completedOnly ? 'completed' : 'filters') + '">' + (noData ? '重新整理' : completedOnly ? '顯示已完成筆記' : '清除搜尋與篩選') + '</button>';
  const empty = document.createElement('div');
  empty.className = 'codex-empty ss-empty-state';
  empty.innerHTML = '<span class="codex-empty__icon" aria-hidden="true">' + iconSVG(noData ? 'warning' : 'binoculars') + '</span><strong>' + headline + '</strong>' + hint + action;
  return empty;
}
function updateCopyAvailability(ui) {
  if (!ui.copy) return;
  const hasItems = Array.from(state.visible.values()).some(item => !item.completed);
  ui.copy.setAttribute('aria-disabled', String(!hasItems));
  ui.copy.dataset.help = hasItems ? '複製目前顯示、尚未完成的筆記' : '目前沒有可複製的未完成筆記';
}
/** @param {ReturnType<typeof uiElements>} ui */
function updateFirstVisit(ui) {
  const visit = $('#first-visit');
  if (!visit) return;
  visit.hidden = state.done.size !== 0 || !state.visible.size || !!ui.search.value.trim() || !!ui.zone.value || pressed(ui.hide) || pressed(ui.only);
  if (visit.hidden) return;
  const action = $('#first-visit-action');
  if (!action) return;
  let available = false;
  for (const item of state.visible.values()) { if (item.availability.available) { available = true; break; } }
  updateText(action, available ? '查看現在可進行' : '瀏覽全部點位');
  action.dataset.ssVisit = available ? 'available' : 'all';
}
function render(ui, now = Date.now(), ticking = false) {
  const result = filtered(ui, now);
  state.visible = new Map(result.list.map(item => [item.id, item]));
  /** @type {HTMLElement[]} */
  const previous = $$('.ss-card', ui.grid);
  const active = document.activeElement instanceof HTMLElement && ui.grid.contains(document.activeElement) ? document.activeElement : null;
  const focusedCard = active?.closest('.ss-card');
  const focusIndex = previous.findIndex(element => element === focusedCard);
  const cards = new Map(previous.map(element => [element.dataset.id, element]));
  previous.forEach(element => { if (!state.visible.has(element.dataset.id)) element.remove(); });
  if (!result.list.length) {
    if (!ticking || !$('.ss-empty-state', ui.grid)) ui.grid.replaceChildren(emptyState(ui));
  } else {
    $$('.ss-empty-state', ui.grid).forEach(element => element.remove());
    result.list.forEach((item, index) => {
      const element = cards.get(item.id) || card(item);
      if (ui.grid.children[index] !== element) ui.grid.insertBefore(element, ui.grid.children[index] || null);
      updateCard(element, item);
    });
  }
  if (active && active.isConnected && document.activeElement !== active) active.focus({ preventScroll: true });
  else if (active && !active.isConnected) {
    const remaining = $$('.ss-card', ui.grid);
    const destination = remaining[Math.min(Math.max(0, focusIndex), remaining.length - 1)];
    ($('.ss-complete-input', destination || ui.grid) || $('[data-ss-clear]', ui.grid) || ui.search)?.focus({ preventScroll: true });
  }
  stats(ui, result.list);
  updateCopyAvailability(ui);
  updateFirstVisit(ui);
  updateNextHint(ui);
}
function tick(ui, now) {
  if (ui.et && typeof ET.getCurrentEorzeaTime === 'function' && typeof ET.formatTime === 'function') { try { ui.et.textContent = ET.formatTime(ET.getCurrentEorzeaTime(now)); } catch { ui.et.textContent = '--:--'; } }
  if (ui.local) { const d = new Date(now); ui.local.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  if (ui.countdown && typeof ET.getTimeUntilNextWeather === 'function') { try { ui.countdown.textContent = formatMMSS(ET.getTimeUntilNextWeather(now).ms); } catch { ui.countdown.textContent = '--:--'; } }
  if (state.composing) return;
  // only／sort 的 membership 或順序取決於時間，才重新篩選；其他檢視只更新 gated 卡。
  if (pressed(ui.only) || pressed(ui.sort)) { render(ui, now, true); return; }
  $$('.ss-card', ui.grid).forEach(element => {
    const item = state.visible.get(element.dataset.id);
    if (!item || (!item.availability.time.gated && !item.availability.weather.gated)) return;
    item.availability = availability(item.entry, item.zone, now, ET, WT);
    updateCard(element, item);
  });
  updateText(ui.active, String(Array.from(state.visible.values()).filter(item => item.availability.available).length));
  updateFirstVisit(ui);
  updateNextHint(ui);
}
function init() {
  const ui = uiElements();
  if (!ui.grid) return;
  const loaded = loadCompleted();
  state.done = loaded.ids;
  if (!loaded.ok) feedback(UNREADABLE);
  const prefs = loadPrefs();
  setPressed(ui.hide, !!prefs.hide);
  setPressed(ui.only, !!prefs.only);
  setPressed(ui.sort, !!prefs.sort);
  if (typeof prefs.exp === 'string' && TABS.includes(prefs.exp)) state.exp = prefs.exp; // 版本分頁選擇跨重整保留
  badges();
  fillStaticIcons();
  updateZones(ui);
  const tabs = $$('.codex-tab[data-exp]', ui.tabs || document);
  const syncTabs = () => {
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.exp === state.exp)));
    const note = $('#arr-back-note');
    if (note) note.hidden = state.exp !== 'arr-back';
  };
  syncTabs();
  const selectedTab = tabs.find(tab => tab.dataset.exp === state.exp);
  if (selectedTab && ui.tabs) ui.tabs.scrollLeft = Math.max(0, selectedTab.offsetLeft - ui.tabs.offsetLeft - ui.tabs.clientWidth + selectedTab.offsetWidth);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    state.exp = TABS.includes(tab.dataset.exp) ? tab.dataset.exp : 'all';
    syncTabs();
    savePrefs(ui);
    updateZones(ui);
    render(ui);
  }));
  if (ui.search) {
    ui.search.addEventListener('compositionstart', () => { state.composing = true; });
    ui.search.addEventListener('compositionend', () => { state.composing = false; render(ui); });
    ui.search.addEventListener('input', event => { if (!state.composing && !event.isComposing) render(ui); });
  }
  if (ui.zone) ui.zone.addEventListener('change', () => render(ui));
  [ui.hide, ui.only, ui.sort].filter(Boolean).forEach(control => control.addEventListener('click', () => {
    setPressed(control, !pressed(control));
    savePrefs(ui);
    render(ui);
  }));
  document.addEventListener('keydown', event => {
    if (state.composing || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === '/' && !target?.closest('input, textarea, select, [contenteditable]') && !document.querySelector('.map-modal-overlay, .codex-modal-overlay')) {
      event.preventDefault();
      ui.search?.focus();
    } else if (event.key === 'Escape' && target === ui.search && !document.querySelector('.map-modal-overlay, .codex-modal-overlay') && ui.search.value) {
      ui.search.value = '';
      render(ui);
    }
  });
  ui.grid.addEventListener('click', event => {
    const clear = event.target instanceof Element && event.target.closest('[data-ss-clear]');
    if (!clear) return;
    if (clear.dataset.ssClear === 'reload') { location.reload(); return; }
    if (clear.dataset.ssClear === 'completed') setPressed(ui.hide, false);
    else { ui.search.value = ''; ui.zone.value = ''; setPressed(ui.hide, false); setPressed(ui.only, false); }
    savePrefs(ui);
    render(ui);
  });
  $('#first-visit-action')?.addEventListener('click', event => {
    setPressed(ui.only, event.currentTarget.dataset.ssVisit === 'available');
    savePrefs(ui);
    render(ui);
  });
  ui.copy?.addEventListener('click', () => {
    if (ui.copy.getAttribute('aria-disabled') === 'true') { feedback(ui.copy.dataset.help); return; }
    const text = formatUnfinishedList(Array.from(state.visible.values()), weatherTC);
    if (!text) return;
    void copyText(text, '已複製待探索清單');
  });
  ui.grid.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const map = target.closest('.map-inline--clickable');
    if (map) { try { openMapModal(JSON.parse(decodeURIComponent(map.dataset.map))); } catch {} return; }
    const copy = target.closest('[data-copy], [data-copy-emote]');
    // 成功回饋走共用元件的 .is-ok（打勾轉綠 1.2s），**不動按鈕內容**。
    // 舊寫法是 `copy.textContent = '已複製'`，有兩個缺陷：
    //   ① 三個字塞進 20px 的圖示鈕 → 直排（emoji 版的 1.6rem 方框就已經會）
    //   ② textContent 會刪掉 SVG 子節點，而還原時 old 是空字串（SVG 無文字）⇒ 按鈕**永久空白**
    // 圖示鈕的回饋只能靠顏色/圖形，不能塞字（Owner 2026-08-18 實機回報）。
    if (copy) {
      const value = copy.dataset.copy || copy.dataset.copyEmote;
      void copyText(value, '已複製：' + value).then(ok => {
        if (!ok) return;
        copy.classList.add('is-ok');
        const label = copy.dataset.copyLabel;
        copy.setAttribute('aria-label', '已複製：' + label);
        setTimeout(() => { copy.classList.remove('is-ok'); copy.setAttribute('aria-label', label); }, 1200);
      });
    }
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
    const id = input.closest('.ss-card').dataset.id;
    // 寫入前重讀，只改本次 ID：另一分頁剛勾的不會被本頁舊快照蓋掉。
    const current = loadCompleted();
    if (current.ok) state.done = current.ids;
    if (input.checked) state.done.add(id); else state.done.delete(id);
    if (!current.ok) feedback(UNREADABLE);
    else if (!saveCompleted(state.done)) feedback('完成紀錄無法儲存；變更僅在本頁生效。');
    badges();
    render(ui);
  });
  window.addEventListener('storage', event => {
    if (event.key !== COMPLETED_KEY && event.key !== null) return;
    const current = loadCompleted();
    if (current.ok) state.done = current.ids;
    badges();
    render(ui);
  });
  const hint = $('#next-hint');
  if (hint) hint.addEventListener('click', /** @param {MouseEvent} event */ event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const more = target.closest('[data-group]');
    if (more instanceof HTMLElement) { const g = more.dataset.group; if (g === 'now' || g === 'next') { state.hintOpen[g] = !state.hintOpen[g]; updateNextHint(ui); } return; }
    const it = target.closest('.ss-nh-item');
    const id = it instanceof HTMLElement && it.dataset.target;
    const el = id && $$('.ss-card', ui.grid).find(card => card.dataset.id === id);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); el.classList.add('ss-card--flash'); setTimeout(() => el.classList.remove('ss-card--flash'), 1400); }
  });
  const toTop = $('#to-top');
  if (toTop) {
    const syncToTop = () => { toTop.classList.toggle('is-visible', window.scrollY >= 400); };
    window.addEventListener('scroll', syncToTop, { passive: true });
    syncToTop();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  }
  window.FFXIVHelp?.setup();
  render(ui);
  tick(ui, Date.now());
  setInterval(() => tick(ui, Date.now()), 1000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
