/**
 * 共用可視地圖 modal — xivapi 底圖 + 座標 pin。
 * 掉落(source_view) 與 採集(gather_view) 共用。純渲染，無資料抓取。
 *
 * 座標→像素公式（對齊 ffxiv-item-search-tc MapModal.tsx，§5）：
 *   percent = (coord - 1) * sizeFactor / 40.96
 */
import { escHtml } from './esc.js';

/** 遊戲座標 → 地圖圖上百分比位置（left/top 共用）。 */
export function gameCoordToPercent(coord, sf) {
  return (coord - 1) * sf / 40.96;
}

/**
 * 內嵌小地圖（回 HTML 字串，供卡片內嵌）。xivapi 底圖 + 座標小點。
 * clickToEnlarge=true 時帶 data-map，點擊可開 openMapModal 放大（由呼叫端 event delegation 綁定）。
 * @param {{img:string, sf:number, markers:Array<{x:number,y:number,label?:string}>, title?:string, clickToEnlarge?:boolean}} opts
 * @returns {string}
 */
export function renderInlineMap({ img, sf, markers, title, clickToEnlarge, caption, aetherytes }) {
  if (!img) return '';
  const sff = sf || 100;
  // 不掛 title：原生 hover tooltip 樣式不可控、會被誤讀成裁切（user 回報「X:3」）；座標已常駐圖底全寬條
  const dots = (markers || []).map(m => {
    const x = Number(m.x), y = Number(m.y);
    const pos = `left:${gameCoordToPercent(x, sff)}%;top:${gameCoordToPercent(y, sff)}%`;
    return m.icon
      ? `<img class="map-pin-img map-pin-img--sm" src="${escHtml(m.icon)}" alt="" loading="lazy" style="${pos}">`
      : `<span class="map-inline-pin" style="${pos}"></span>`;
  }).join('');
  const single = (markers && markers.length === 1) ? markers[0] : null;
  const coordOverlay = single
    ? `<span class="map-inline-coord">X:${Number(single.x)}, Y:${Number(single.y)}</span>`
    : '';
  // 傳送點放進 payload（放大 modal 才標圖示，小圖保持乾淨）
  const data = clickToEnlarge
    ? ` data-map="${encodeURIComponent(JSON.stringify({ img, sf: sff, title: title || '', markers: markers || [], aetherytes: aetherytes || [] }))}"`
    : '';
  const cls = `map-inline${clickToEnlarge ? ' map-inline--clickable' : ''}`;
  const ttl = clickToEnlarge ? ' title="點擊放大（含傳送點）"' : '';
  // 可放大時讓觸發器鍵盤/SR 可及（a11y A1）：role=button + tabindex；consumer 綁 keydown(Enter/Space)
  const a11y = clickToEnlarge ? ' role="button" tabindex="0" aria-label="放大地圖（含傳送點）"' : '';
  // 地名 caption 在圖上方、一行（CSS nowrap ellipsis）
  const cap = caption ? `<div class="map-inline-cap"><span class="map-cap-place">${escHtml(caption)}</span></div>` : '';
  return `<div class="map-inline-wrap">
    ${cap}
    <div class="${cls}"${data}${ttl}${a11y}>
      <img class="map-inline-img" src="${escHtml(img)}" alt="${escHtml(title || '地圖')}" loading="lazy"
           onerror="this.closest('.map-inline').classList.add('map-inline--failed')">
      ${dots}
      ${coordOverlay}
    </div>
  </div>`;
}

let _overlay = null;
let _prevFocus = null;  // 開啟前焦點，關閉時還原（a11y A1，複製 dialog.js 範式）

function _close() {
  if (_overlay) { _overlay.remove(); _overlay = null; }
  document.removeEventListener('keydown', _onKey, true);
  window.removeEventListener('hashchange', _close);
  if (_prevFocus && typeof _prevFocus.focus === 'function') _prevFocus.focus();
  _prevFocus = null;
}
function _onKey(e) {
  if (e.key === 'Escape') { _close(); return; }
  if (e.key === 'Tab' && _overlay) {
    // 最小焦點圈：Tab 不離開 modal（背景被 overlay 蓋住，焦點跑出去沒意義）
    const focusables = _overlay.querySelectorAll('button, [tabindex="0"], a[href]');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/**
 * 開地圖 modal。
 * @param {{img:string, sf:number, markers:Array<{x:number,y:number,label?:string}>, title?:string}} opts
 */
export function openMapModal({ img, sf, markers, title, aetherytes }) {
  if (!img) return;
  _close();
  _prevFocus = document.activeElement;  // 記住觸發元素，關閉後還原焦點
  const sff = sf || 100;
  const pins = (markers || []).map(m => {
    const x = Number(m.x);
    const y = Number(m.y);
    const pos = `left:${gameCoordToPercent(x, sff)}%;top:${gameCoordToPercent(y, sff)}%`;
    if (m.icon) {
      return `<img class="map-pin-img" src="${escHtml(m.icon)}" alt="" loading="lazy" style="${pos}" title="X:${x}, Y:${y}">`;
    }
    const lbl = m.label ? `<span class="map-pin-label codex-body">${escHtml(m.label)}</span>` : '';
    return `<div class="map-pin" style="${pos}" title="X:${x}, Y:${y}">📍${lbl}</div>`;
  }).join('');
  // 傳送點圖示（主水晶 060453 / 以太之光 060430，xivapi icon）；v1 圖示 only 無名
  const aes = (aetherytes || []).map(a => {
    const ax = Number(a.x), ay = Number(a.y);
    const isMain = a.t === 0;
    const icon = isMain ? '060453' : '060430';
    const sz = isMain ? 22 : 15;
    return `<img class="map-ae" src="https://xivapi.com/i/060000/${icon}.png" alt="傳送點" width="${sz}" height="${sz}" loading="lazy" style="left:${gameCoordToPercent(ax, sff)}%;top:${gameCoordToPercent(ay, sff)}%" title="${isMain ? '主水晶' : '以太之光'}">`;
  }).join('');

  _overlay = document.createElement('div');
  _overlay.className = 'map-modal-overlay';
  _overlay.innerHTML = `
    <div class="map-modal" role="dialog" aria-modal="true" aria-label="${escHtml(title || '地圖')}">
      <header class="map-modal-header">
        <h3 class="codex-h3">${escHtml(title || '地圖')}</h3>
        <button class="map-modal-close codex-btn codex-btn--ghost" aria-label="關閉地圖">✕</button>
      </header>
      <div class="map-modal-canvas">
        <img class="map-modal-img" src="${escHtml(img)}" alt="${escHtml(title || '地圖')}" loading="lazy"
             onerror="this.closest('.map-modal').classList.add('map-img-failed')">
        ${aes}${pins}
      </div>
      <div class="map-modal-foot codex-body">
        ${(markers || []).map(m => { const x = Number(m.x); const y = Number(m.y); return `<span class="map-foot-coord">📍 X:${x}, Y:${y}${m.label ? ' · ' + escHtml(m.label) : ''}</span>`; }).join('')}
      </div>
    </div>`;
  // 點背景 / 關閉鈕 → 關
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay || e.target.closest('.map-modal-close')) _close();
  });
  document.addEventListener('keydown', _onKey, true);
  window.addEventListener('hashchange', _close);  // SPA 換頁時關掉 modal（overlay 掛在 body，不隨 #app 重繪消失）
  document.body.appendChild(_overlay);
  // 開啟時把焦點移進 modal（關閉鈕），Tab 焦點圈 + Esc 關閉 + 還原焦點皆備（a11y A1）
  const closeBtn = _overlay.querySelector('.map-modal-close');
  if (closeBtn) closeBtn.focus();
}
