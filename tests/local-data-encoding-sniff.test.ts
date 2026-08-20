import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  decodeBuffer,
  decodeFileSample,
  detectEncoding,
  ENCODING_FALLBACKS,
} from '../src/commands/data-integration/local-data/encoding.js';
import {
  inspectLocalDataInput,
  selectDataSet,
  sniffDelimiter,
  sniffFormat,
} from '../src/commands/data-integration/local-data/input.js';
import { profileLocalData } from '../src/commands/data-integration/local-data/profile.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

assert.deepEqual(ENCODING_FALLBACKS, ['utf-8', 'gbk', 'gb2312', 'latin1']);
assert.equal(decodeBuffer(Buffer.from('hello', 'utf8'), 'utf-8'), 'hello');

// GBK/GB2312 fixture is detected and decoded back to the original business data.
const gbkPath = fixture('07_gbk_encoding.csv');
const gbkEncoding = detectEncoding(gbkPath);
assert.ok(['gbk', 'gb2312'].includes(gbkEncoding), `unexpected encoding ${gbkEncoding}`);
assert.match(decodeFileSample(gbkPath, gbkEncoding), /姓名/);
assert.match(decodeFileSample(gbkPath, gbkEncoding), /分数/);

const gbk = await inspectLocalDataInput(gbkPath);
assert.equal(gbk.encoding, gbkEncoding);
assert.equal((await profileLocalData(gbk, selectDataSet(gbk), 'Asia/Shanghai')).row_count, 3);

// .txt content is sniffed: CSV vs NDJSON.
assert.deepEqual(sniffFormat(fixture('16_txt_csv_content.txt')), { format: 'csv', delimiter: ',' });
assert.equal(sniffDelimiter(fixture('16_txt_csv_content.txt')), ',');
assert.deepEqual(sniffFormat(fixture('20_txt_ndjson_content.txt')), { format: 'jsonl' });
assert.deepEqual(sniffFormat(fixture('15_tsv_data.tsv')), { format: 'tsv', delimiter: '\t' });

const txtCsv = await inspectLocalDataInput(fixture('16_txt_csv_content.txt'));
assert.equal(txtCsv.format, 'csv');
assert.equal(txtCsv.delimiter, ',');
assert.equal((await profileLocalData(txtCsv, selectDataSet(txtCsv), 'Asia/Shanghai')).row_count, 3);

const txtNdjson = await inspectLocalDataInput(fixture('20_txt_ndjson_content.txt'));
assert.equal(txtNdjson.format, 'jsonl');
assert.equal((await profileLocalData(txtNdjson, selectDataSet(txtNdjson), 'Asia/Shanghai')).row_count, 3);

const tsv = await inspectLocalDataInput(fixture('15_tsv_data.tsv'));
assert.equal(tsv.format, 'tsv');
assert.equal((await profileLocalData(tsv, selectDataSet(tsv), 'Asia/Shanghai')).row_count, 3);

process.stdout.write('local data encoding and sniff tests: passed\n');
