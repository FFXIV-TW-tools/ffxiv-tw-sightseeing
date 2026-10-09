import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyProgress, completedRecord, progressSnapshotJson } from '../modules/ss_progress_data.js';

test('舊版陣列與 truthy object 遷移保留未知 ID，僅去重已完成 ID', () => {
  assert.deepEqual(parseLegacyProgress(null), []);
  assert.deepEqual(parseLegacyProgress('["arr-001","future-999","arr-001"]'), ['arr-001', 'future-999']);
  assert.deepEqual(parseLegacyProgress('{"arr-001":true,"arr-002":false,"future-999":1,"hw-001":null}'), ['arr-001', 'future-999']);
});

test('損毀 legacy 拒絕遷移，不當成空集合', () => {
  for (const raw of ['{broken', 'null', 'false', '4', '"text"', '[false]', '["arr-001",null]']) {
    assert.throws(() => parseLegacyProgress(raw));
  }
});

test('完成 record 保留遷移原文，缺失或非字串 ID 拒絕讀取', () => {
  const raw = ' { \"future-999\" : true }\\n';
  assert.deepEqual(completedRecord({ ids: ['future-999', 'future-999'], legacyRaw: raw }), { ids: ['future-999'], legacyRaw: raw });
  for (const value of [undefined, null, [], { ids: [] }, { ids: [true], legacyRaw: null },
    { ids: [], legacyRaw: 0 }, { ids: [], legacyRaw: null, extra: true }]) {
    assert.throws(() => completedRecord(value));
  }
});

test('備份完整保留損毀 JSON 與 legacy 原文，區分缺失 record 與 null record', () => {
  const raw = '{broken\\n\"原文\"';
  const value = { bad: { ids: [null, false, 'future-999'] } };
  assert.deepEqual(JSON.parse(progressSnapshotJson(true, value, raw)), { format: 1, recordExists: true, record: value, legacyRaw: raw });
  assert.notEqual(progressSnapshotJson(false, undefined, raw), progressSnapshotJson(true, null, raw));
  assert.notEqual(progressSnapshotJson(true, value, raw), progressSnapshotJson(true, value, raw + ' '));
});

test('JSON 不可忠實表示的 structured clone 拒絕備份，不能為重置默默丟資料', () => {
  /** @type {Record<string, unknown>} */
  const cycle = {};
  cycle.self = cycle;
  const shared = { id: 'arr-001' };
  const extraArray = Object.assign(['arr-001'], { extra: true });
  const hidden = Object.defineProperty({}, 'id', { value: 'arr-001' });
  for (const value of [undefined, NaN, Infinity, -0, new Date(), new Map(), new Set(), cycle,
    { a: shared, b: shared }, { id: undefined }, new Array(1), extraArray, hidden, { [Symbol('id')]: 'arr-001' }]) {
    assert.throws(() => progressSnapshotJson(true, value, null), /無法完整表示/);
  }
});
