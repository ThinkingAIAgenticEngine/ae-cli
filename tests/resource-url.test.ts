/**
 * resource-url unit tests (F-015)
 *
 * Run:
 *   npx tsx tests/resource-url.test.ts
 *
 * get_resource_url returns RELATIVE links from the server; these must be rewritten to absolute
 * (host-prefixed) so they are clickable in a local ae-cli / terminal context.
 */

import assert from 'node:assert/strict';
import { absolutizeRelativeUrls, normalizeResourceUrlFields } from '../src/commands/te-common/resource/get-resource-url.ts';

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

const HOST = 'https://inner-audit.thinkingdata.cn';

process.stdout.write('\nresource-url tests\n');

// absolutizeRelativeUrls
test('bare relative path → absolute', () => {
  assert.equal(absolutizeRelativeUrls('/#/panel/panel/3_10', HOST), `${HOST}/#/panel/panel/3_10`);
});

test('markdown relative link target → absolute', () => {
  assert.equal(
    absolutizeRelativeUrls('[View Resource](/#/panel/panel/3_10)', HOST),
    `[View Resource](${HOST}/#/panel/panel/3_10)`,
  );
});

test('already-absolute http URL → unchanged', () => {
  const s = `${HOST}/#/panel/panel/3_10`;
  assert.equal(absolutizeRelativeUrls(s, HOST), s);
});

test('protocol-relative // → unchanged (not treated as a path)', () => {
  assert.equal(absolutizeRelativeUrls('//cdn.example.com/x.png', HOST), '//cdn.example.com/x.png');
});

test('host with trailing slash → no double slash', () => {
  assert.equal(absolutizeRelativeUrls('/#/panel/panel/3_10', `${HOST}/`), `${HOST}/#/panel/panel/3_10`);
});

// normalizeResourceUrlFields (object walk, real server shape)
test('normalizeResourceUrlFields rewrites raw_url + markdown_link, leaves other fields', () => {
  const payload = {
    success: true,
    message: 'Success',
    data: {
      markdown_link: '[View Resource](/#/panel/panel/3_10)',
      raw_url: '/#/panel/panel/3_10',
    },
  };
  normalizeResourceUrlFields(payload, HOST);
  assert.equal(payload.data.raw_url, `${HOST}/#/panel/panel/3_10`);
  assert.equal(payload.data.markdown_link, `[View Resource](${HOST}/#/panel/panel/3_10)`);
  assert.equal(payload.success, true, 'non-string untouched');
  assert.equal(payload.message, 'Success', 'non-url string untouched');
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
