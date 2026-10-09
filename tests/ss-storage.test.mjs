import { test } from 'node:test';
import assert from 'node:assert/strict';

const data = new Map();
let failWrite = false;
globalThis.window = /** @type {any} */ ({ localStorage: {
  /** @param {string} key */ getItem: key => (data.has(key) ? data.get(key) : null),
  /** @param {string} key @param {string} value */ setItem: (key, value) => { if (failWrite) throw new Error('quota'); data.set(key, value); },
} });
const { loadCompleted, saveCompleted, COMPLETED_KEY } = await import('../modules/ss_storage.js');

test('陣列與舊版 truthy 物件都能讀；缺值是正常空集合', () => {
  data.set(COMPLETED_KEY, '["arr-001","arr-001","hw-002"]');
  assert.deepEqual([...loadCompleted().ids], ['arr-001', 'hw-002']);
  data.set(COMPLETED_KEY, '{"arr-001":true,"arr-002":false}');
  assert.deepEqual(loadCompleted(), { ids: new Set(['arr-001']), ok: true });
  data.delete(COMPLETED_KEY);
  assert.deepEqual(loadCompleted(), { ids: new Set(), ok: true });
});

test('損毀（壞 JSON、字串、數字、null）回 ok:false，不把字串拆成字元 ID', () => {
  for (const raw of ['{broken', '"arr-001"', '4', 'null']) {
    data.set(COMPLETED_KEY, raw);
    assert.deepEqual(loadCompleted(), { ids: new Set(), ok: false }, raw);
  }
});

test('寫入成功往返；寫入失敗回 false', () => {
  assert.equal(saveCompleted(new Set(['arr-001'])), true);
  assert.deepEqual([...loadCompleted().ids], ['arr-001']);
  failWrite = true;
  assert.equal(saveCompleted(new Set(['x'])), false);
});
