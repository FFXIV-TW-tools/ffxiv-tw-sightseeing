import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/settings-api/[[path]].js';

// 缺 binding 不得改走公開 URL：否則上游看到的是代理 IP，會共用全站配額。
test('設定代理缺 binding 時 fail-closed，不嘗試網路 fallback', async () => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('unexpected network fallback'); };
  try {
    const response = await onRequest({ request: new Request('https://sight.xivtc.com/settings-api/health'), env: {} });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'binding_missing' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('設定代理失敗不洩漏上游錯誤，失敗回應不可快取', async () => {
  const response = await onRequest({
    request: new Request('https://sight.xivtc.com/settings-api/health'),
    env: { SETTINGS_API: { fetch: async () => { throw new Error('private upstream details'); } } },
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'proxy_upstream_failed' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('設定代理保留上游衝突拒絕且禁止快取個人設定', async () => {
  const response = await onRequest({
    request: new Request('https://sight.xivtc.com/settings-api/settings/opaque-id', { method: 'PUT', body: '{}' }),
    env: { SETTINGS_API: { fetch: async () => new Response('{"error":"conflict"}', {
      status: 412, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    }) } },
  });
  assert.equal(response.status, 412);
  assert.deepEqual(await response.json(), { error: 'conflict' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
