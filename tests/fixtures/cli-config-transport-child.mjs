import { performance } from 'node:perf_hooks';

const { fetchCliConfig } = await import('../../src/core/compat-check.js');
const started = performance.now();
const report = (event, data = {}) => {
  process.stdout.write(`${JSON.stringify({ event, elapsed: performance.now() - started, ...data })}\n`);
};

process.once('beforeExit', () => report('before-exit'));
report('request-started');
const configuration = fetchCliConfig(process.argv[2], 'cli_transport_fixture').then(result => {
  report('configuration-settled', { result });
});
const unrelated = process.argv[3]
  ? fetch(process.argv[3]).then(async response => {
      report('unrelated-settled', { status: response.status, body: await response.text() });
    })
  : Promise.resolve();

await Promise.all([configuration, unrelated]);
