export const COMPLETED_KEY = 'ffxiv-sightseeing-completed';

/** @param {string} raw @returns {Set<string> | null} 舊版曾存「id→true」物件，兩種格式都收；其餘形狀算損毀。 */
function parse(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { return null; } // quality-allow: null 即損毀，由 loadCompleted 回報 ok:false
  if (Array.isArray(value)) return new Set(value.filter(id => typeof id === 'string'));
  if (value && typeof value === 'object') return new Set(Object.keys(value).filter(key => value[key]));
  return null;
}

/**
 * ok:false＝讀不到或原值損毀：畫面當空集合，但呼叫端不得寫回，避免蓋掉原紀錄。
 * @returns {{ids: Set<string>, ok: boolean}}
 */
export function loadCompleted() {
  let raw;
  try { raw = window.localStorage.getItem(COMPLETED_KEY); } catch { return { ids: new Set(), ok: false }; } // quality-allow: 以 ok:false 回報
  if (raw === null) return { ids: new Set(), ok: true };
  const ids = parse(raw);
  return ids ? { ids, ok: true } : { ids: new Set(), ok: false };
}

/** @param {Set<string>} ids @returns {boolean} 是否寫入成功 */
export function saveCompleted(ids) {
  // quality-allow: 失敗以回傳值交給呼叫端顯示提示，不吞掉
  try { window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([...ids])); return true; } catch { return false; }
}
