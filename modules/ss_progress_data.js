/** @typedef {{ids: string[], legacyRaw: string | null}} CompletedRecord */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** @param {unknown} value @returns {value is unknown[]} */
function denseArray(value) {
  if (!Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === value.length && Reflect.ownKeys(value).length === value.length + 1
    && keys.every((key, index) => key === String(index));
}

/** @param {unknown} value @returns {value is string[]} */
function stringIds(value) {
  return denseArray(value) && value.every(id => typeof id === 'string');
}

/** @param {string | null} raw @returns {string[]} */
export function parseLegacyProgress(raw) {
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (stringIds(value)) return [...new Set(value)];
  if (plainObject(value)) return Object.keys(value).filter(id => value[id]);
  throw new Error('舊版完成紀錄不是字串陣列或物件');
}

/** @param {unknown} value @returns {CompletedRecord} */
export function completedRecord(value) {
  if (!plainObject(value) || Reflect.ownKeys(value).length !== 2 || !stringIds(value.ids)
      || !(value.legacyRaw === null || typeof value.legacyRaw === 'string')) {
    throw new Error('IndexedDB 完成紀錄格式損毀');
  }
  return { ids: [...new Set(value.ids)], legacyRaw: value.legacyRaw };
}

/**
 * JSON cannot faithfully represent arbitrary structured clones. Refuse lossy backup, never guess/reset.
 * @param {unknown} value
 * @param {Set<object>} seen
 * @returns {boolean}
 */
function jsonValue(value, seen) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  let valid;
  if (Array.isArray(value)) {
    valid = denseArray(value) && value.every(item => jsonValue(item, seen));
  } else {
    valid = plainObject(value) && Reflect.ownKeys(value).length === Object.keys(value).length
      && Object.values(value).every(item => jsonValue(item, seen));
  }
  return valid;
}

/** @param {boolean} exists @param {unknown} value @param {string | null} legacyRaw @returns {string} */
export function progressSnapshotJson(exists, value, legacyRaw) {
  if (exists && !jsonValue(value, new Set())) throw new Error('原始資料含 JSON 無法完整表示的值，無法安全備份或重置');
  return JSON.stringify({ format: 1, recordExists: exists, record: exists ? value : null, legacyRaw });
}
