import { parseLegacyProgress, completedRecord, progressSnapshotJson } from './ss_progress_data.js';

const DB_NAME = 'ffxiv-sightseeing';
const STORE_NAME = 'progress';
const COMPLETED_KEY = 'completed';
const BACKUP_KEY = 'recovery-backup';
const LEGACY_KEY = 'ffxiv-sightseeing-completed';
/** @typedef {{kind: 'ready' | 'corrupt', ids: string[], legacyDrift: boolean, exists: boolean, value: unknown, legacyRaw: string | null, message: string}} ProgressSnapshot */

export class ProgressStorageError extends Error {
  /** @param {'unavailable'|'blocked'|'refresh'|'changed'|'corrupt'|'backup'} code @param {string} message */
  constructor(code, message) { super(message); this.code = code; }
}

/** @param {unknown} error @returns {string} */
const errorText = error => error instanceof Error ? error.message : String(error);

export function createProgressStore() {
  /** @type {Promise<IDBDatabase> | null} */
  let connection = null;
  let needsRefresh = false;
  /** @type {Set<() => void>} */
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  /** @type {BroadcastChannel | null} */
  let channel = null;
  try { if (typeof BroadcastChannel === 'function') channel = new BroadcastChannel('ffxiv-sightseeing-progress'); }
  catch (error) { console.warn('跨分頁通知不可用；回到分頁時仍會重讀進度：' + errorText(error)); }
  if (channel) channel.onmessage = notify;

  /** @returns {Promise<IDBDatabase>} */
  function open() {
    if (needsRefresh) return Promise.reject(new ProgressStorageError('refresh', '資料庫版本已變更，請重新整理頁面。'));
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new ProgressStorageError('unavailable', '此瀏覽器無法使用 IndexedDB，不能保存完成紀錄。')); return; }
      let settled = false;
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onblocked = () => {
        settled = true;
        reject(new ProgressStorageError('blocked', '其他分頁阻擋資料庫開啟，請關閉舊分頁後重新整理。'));
      };
      request.onerror = () => { settled = true; reject(new ProgressStorageError('unavailable', '完成紀錄資料庫無法開啟：' + errorText(request.error))); };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        settled = true;
        db.onversionchange = () => { needsRefresh = true; db.close(); notify(); };
        resolve(db);
      };
    });
    return connection;
  }

  /**
   * The only read/modify/write boundary. Cursor distinguishes missing from a stored undefined value.
   * @template T
   * @param {IDBTransactionMode} mode
   * @param {(exists: boolean, value: unknown, store: IDBObjectStore) => T} operation
   * @param {boolean} changed
   * @returns {Promise<T>}
   */
  async function transaction(mode, operation, changed = false) {
    const db = await open();
    return new Promise((resolve, reject) => {
      /** @type {T | undefined} */
      let result;
      /** @type {unknown} */
      let failure;
      let tx;
      try { tx = db.transaction(STORE_NAME, mode); }
      catch (error) { reject(new ProgressStorageError('unavailable', '完成紀錄無法存取：' + errorText(error))); return; }
      tx.onabort = () => reject(failure instanceof ProgressStorageError ? failure
        : new ProgressStorageError('unavailable', '完成紀錄交易未完成：' + errorText(failure ?? tx.error)));
      tx.oncomplete = () => {
        if (result === undefined) { reject(new ProgressStorageError('unavailable', '完成紀錄交易沒有讀取結果。')); return; }
        resolve(result);
        if (changed && channel) {
          try { channel.postMessage('changed'); }
          catch (error) { console.warn('進度已提交，但跨分頁通知失敗：' + errorText(error)); }
        }
      };
      const store = tx.objectStore(STORE_NAME);
      const cursor = store.openCursor(COMPLETED_KEY);
      cursor.onsuccess = () => {
        try { result = operation(cursor.result !== null, cursor.result?.value, store); }
        catch (error) { failure = error; tx.abort(); }
      };
    });
  }

  /** @returns {string | null} */
  function legacy() {
    try { return localStorage.getItem(LEGACY_KEY); }
    catch (error) { throw new ProgressStorageError('unavailable', '舊版原文無法讀取，未遷移或覆寫：' + errorText(error)); }
  }

  /** @param {boolean} exists @param {unknown} value @param {string | null} raw @returns {ProgressSnapshot} */
  function inspect(exists, value, raw) {
    try {
      const record = exists ? completedRecord(value) : { ids: parseLegacyProgress(raw), legacyRaw: raw };
      return { kind: 'ready', ids: record.ids, legacyDrift: record.legacyRaw !== raw, exists, value, legacyRaw: raw, message: '' };
    } catch (error) {
      return { kind: 'corrupt', ids: [], legacyDrift: false, exists, value, legacyRaw: raw, message: errorText(error) };
    }
  }

  /** @returns {Promise<ProgressSnapshot>} */
  function read() {
    return transaction('readwrite', (exists, value, store) => {
      const raw = legacy();
      const snapshot = inspect(exists, value, raw);
      if (!exists && snapshot.kind === 'ready') {
        const record = { ids: snapshot.ids, legacyRaw: raw };
        store.put(record, COMPLETED_KEY);
        snapshot.exists = true;
        snapshot.value = record;
      }
      return snapshot;
    });
  }

  /** @param {string} id @param {boolean} checked @returns {Promise<boolean>} */
  function updateCompleted(id, checked) {
    if (typeof id !== 'string' || typeof checked !== 'boolean') return Promise.reject(new TypeError('完成 ID／勾選值格式錯誤'));
    return transaction('readwrite', (exists, value, store) => {
      const snapshot = inspect(exists, value, legacy());
      if (snapshot.kind !== 'ready') throw new ProgressStorageError('corrupt', '原始進度損毀，未套用本次變更。');
      const ids = new Set(snapshot.ids);
      if (checked) ids.add(id); else ids.delete(id);
      // Keep the original migration raw string even if an old localStorage tab changed it later.
      const legacyRaw = exists ? completedRecord(value).legacyRaw : snapshot.legacyRaw;
      store.put({ ids: [...ids], legacyRaw }, COMPLETED_KEY);
      return true;
    }, true);
  }

  /** @returns {Promise<{json: string, fingerprint: string}>} */
  async function backup() {
    return transaction('readonly', (exists, value) => {
      try {
        const fingerprint = progressSnapshotJson(exists, value, legacy());
        const json = JSON.stringify({ database: { name: DB_NAME, store: STORE_NAME, key: COMPLETED_KEY },
          snapshot: JSON.parse(fingerprint) }, null, 2) + '\n';
        return { json, fingerprint };
      } catch (error) {
        if (error instanceof ProgressStorageError) throw error;
        throw new ProgressStorageError('backup', errorText(error));
      }
    });
  }

  /** @param {string} fingerprint @returns {Promise<boolean>} */
  function reset(fingerprint) {
    return transaction('readwrite', (exists, value, store) => {
      const raw = legacy();
      let current;
      try { current = progressSnapshotJson(exists, value, raw); }
      catch (error) { throw new ProgressStorageError('backup', errorText(error)); }
      if (current !== fingerprint) throw new ProgressStorageError('changed', '其他分頁已修改原始進度，請重新下載備份後再確認。');
      if (inspect(exists, value, raw).kind !== 'corrupt') throw new ProgressStorageError('changed', '目前進度已可正常讀取，不重置有效資料。');
      store.put({ recordExists: exists, record: exists ? value : null, legacyRaw: raw }, BACKUP_KEY);
      store.put({ ids: [], legacyRaw: raw }, COMPLETED_KEY);
      return true;
    }, true);
  }

  /** @param {() => void} listener */
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  return { read, updateCompleted, backup, reset, subscribe };
}
