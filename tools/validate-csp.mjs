// node tools/validate-csp.mjs [--check|--write] — 同步可執行 inline script 的精確 bytes hash。
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !['--check', '--write'].includes(args[0]))) {
  console.error('用法：node tools/validate-csp.mjs [--check|--write]');
  process.exit(1);
}
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const headersPath = new URL('../_headers', import.meta.url);
let headers = fs.readFileSync(headersPath, 'utf8');
const hashes = new Set();
const executableTypes = new Set(['', 'module', 'importmap', 'text/javascript', 'application/javascript',
  'text/ecmascript', 'application/ecmascript']);
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
  const attrs = match[1];
  if (/(?:^|\s)src(?=\s|=|$)/i.test(attrs)) continue;
  const typeAttr = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  const type = (typeAttr?.[1] ?? typeAttr?.[2] ?? typeAttr?.[3] ?? '').trim().toLowerCase();
  if (!executableTypes.has(type)) continue;
  hashes.add("'sha256-" + createHash('sha256').update(match[2], 'utf8').digest('base64') + "'");
}

const cspLine = /^([ \t]*Content-Security-Policy:[ \t]*)([^\r\n]*)/gmi;
if (args[0] === '--write') {
  headers = headers.replace(cspLine, (_line, prefix, policy) => {
    const directive = /((?:^|;)\s*script-src\s+)([^;]+)/i.exec(policy);
    if (!directive) throw new Error('CSP 缺 script-src，不能更新');
    const hosts = directive[2].trim().split(/\s+/).filter(token => token !== "'unsafe-inline'"
      && !/^'sha(?:256|384|512)-/.test(token));
    policy = policy.replace(directive[0], directive[1] + [...hosts, ...hashes].join(' '));
    if (/(?:^|;)\s*script-src-attr\s+/i.test(policy)) {
      policy = policy.replace(/((?:^|;)\s*script-src-attr\s+)[^;]+/i, "$1'none'");
    } else {
      policy += (policy.endsWith(';') ? ' ' : '; ') + "script-src-attr 'none'";
    }
    return prefix + policy;
  });
}

const errors = [];
let policies = 0;
for (const match of headers.matchAll(cspLine)) {
  policies++;
  const policy = match[2];
  const sources = /(?:^|;)\s*script-src\s+([^;]+)/i.exec(policy)?.[1].trim().split(/\s+/) ?? [];
  if (!sources.length) errors.push('CSP 缺 script-src');
  if (sources.includes("'unsafe-inline'")) errors.push('script-src 不得有 unsafe-inline');
  const actual = sources.filter(token => /^'sha(?:256|384|512)-/.test(token));
  if (actual.length !== hashes.size || actual.some(token => !hashes.has(token))) {
    errors.push('可執行 inline script 的 hash 不符；執行 node tools/validate-csp.mjs --write');
  }
  const attr = /(?:^|;)\s*script-src-attr\s+([^;]+)/i.exec(policy)?.[1].trim();
  if (attr !== "'none'") errors.push("script-src-attr 必須是 'none'");
}
if (!policies) errors.push('_headers 沒有 CSP');
if (/<[a-z][^>]*\s+on[a-z]+\s*=/i.test(html)) errors.push('index.html 不得有 HTML inline event handler');
if (errors.length) {
  for (const error of errors) console.error('✗ ' + error);
  process.exit(1);
}
if (args[0] === '--write') fs.writeFileSync(headersPath, headers, 'utf8');
console.log(`✓ CSP：${hashes.size} 個 inline script 精確 hash、script-src-attr none（${policies} 份政策）`);
