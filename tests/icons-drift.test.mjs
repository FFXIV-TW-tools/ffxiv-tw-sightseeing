import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const generator = fileURLToPath(new URL('../../ffxiv-tw-tools-portal/tools/gen-site-icons.mjs', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

test('探索筆記圖示產物與 portal 正典一致', t => {
  if (!existsSync(generator)) return t.skip('CI 沒有 portal 圖示產生器');
  const result = spawnSync(process.execPath, [generator, '--config', 'tools/icons.config.json', '--check'], { cwd: root, encoding: 'utf8' });
  if (result.status === 2) return t.skip(`CI 沒有 portal 圖示正典（${result.stderr.trim()}）`);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
