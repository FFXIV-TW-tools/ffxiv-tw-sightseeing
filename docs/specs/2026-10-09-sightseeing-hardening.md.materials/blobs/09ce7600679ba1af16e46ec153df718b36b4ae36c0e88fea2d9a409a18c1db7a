import { ICONS } from './ss_icons.js';

export function iconSVG(name, cls = '') {
  if (!Object.hasOwn(ICONS, name)) throw new Error(`未知探索筆記圖示：${name}`);
  return `<svg class="codex-ico${cls ? ' ' + cls : ''}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

export function fillStaticIcons() {
  document.querySelectorAll('[data-ss-icon]').forEach(element => {
    const name = element.dataset.ssIcon;
    if (element instanceof SVGElement) element.innerHTML = ICONS[name];
    else element.innerHTML = iconSVG(name);
  });
}
