import { spawnSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const result = spawnSync(process.execPath, ['self-check/scan.mjs', '--json'], {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (!result.stdout.trim()) {
  throw new Error(`self-check did not produce JSON output: ${result.stderr || '(empty stderr)'}`);
}

const output = JSON.parse(result.stdout);
const overlayDocFindings = output.findings.filter((finding) =>
  ['P1', 'P2'].includes(finding.level) &&
  finding.msg.includes('ae-analysis') &&
  finding.msg.includes('list_query_clusters')
);

if (overlayDocFindings.length > 0) {
  throw new Error(
    `self-check should route +list_query_clusters to ae-analysis-global, not base ae-analysis:\n` +
    overlayDocFindings.map((finding) => `- [${finding.level}] ${finding.dim}: ${finding.msg}`).join('\n')
  );
}

console.log('OK: self-check respects ae-analysis-global overlay command ownership.');
