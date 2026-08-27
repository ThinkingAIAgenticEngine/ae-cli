import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const skill = readFileSync(join(root, 'skills/ae-data-integration/SKILL.md'), 'utf8');
const source = readFileSync(join(root, 'skills/ae-data-integration/references/source-inspect.md'), 'utf8');
const plan = readFileSync(join(root, 'skills/ae-data-integration/references/tracking-plan.md'), 'utf8');
const transform = readFileSync(join(root, 'skills/ae-data-integration/references/transform.md'), 'utf8');
const sink = readFileSync(join(root, 'skills/ae-data-integration/references/sink-upload.md'), 'utf8');
const upload = readFileSync(join(root, 'skills/ae-data-integration/references/sync-json-upload.md'), 'utf8');
const routing = readFileSync(join(root, 'skills/ae-data-integration/references/ue-routing.md'), 'utf8');
const analysis = readFileSync(join(root, 'skills/ae-data-integration/references/local-analysis.md'), 'utf8');
const mapping = readFileSync(join(root, 'skills/ae-data-integration/references/ue-mapping.md'), 'utf8');

// Renamed master skill: ae-data-integration with a four-submodule pipeline
// (Source → Tracking plan → Transform → Sink).
assert.match(skill, /name: ae-data-integration/);
assert.match(skill, /Source/);
assert.match(skill, /Tracking plan/);
assert.match(skill, /Transform/);
assert.match(skill, /Sink/);
assert.match(skill, /references\/source-inspect\.md/);
assert.match(skill, /references\/tracking-plan\.md/);
assert.match(skill, /references\/transform\.md/);
assert.match(skill, /references\/sink-upload\.md/);
assert.match(skill, /data governance shift-left/i);
assert.match(skill, /LogBus/);
assert.match(skill, /DataX/);

// Safety rules stay in the orchestrator.
assert.match(skill, /explicitly confirmed that upload/i);
assert.match(skill, /second, explicit clean-subset decision/i);
assert.match(skill, /never resume automatically/i);
assert.match(skill, /50 MB/);
assert.match(skill, /Do not create or execute an Agent conversation/);
assert.doesNotMatch(skill, /automatically upload|auto-upload/i);

// Submodule commands are documented in their own references.
assert.match(source, /data-integration inspect/);
assert.match(transform, /data-integration convert/);
assert.match(sink, /data-integration upload/);

// Source: advanced input surface and nested flattening.
assert.match(source, /--headers/);
assert.match(source, /--headerless/);
assert.match(source, /--merge-sheets/);
assert.match(source, /--type-resolutions/);
assert.match(source, /TSV/);
assert.match(source, /TXT/);
assert.match(source, /NDJSON/);
assert.match(source, /GBK/);
assert.match(source, /nested_tree/);
assert.match(source, /cell-relative/);
assert.match(source, /Review the recommended mapping's per-field decision/i);
assert.match(source, /Never keep the `col_1\.\.col_N` placeholders/i);
assert.match(source, /propose a meaningful name/i);

// Tracking plan: plan-before-ingest, single confirmation gate, delegated to
// ae-generate-tracking-plan with a dry-run / data-sample path.
assert.match(plan, /ae-generate-tracking-plan/);
assert.match(plan, /before.*transform.*upload/i);
assert.match(plan, /single, one pass/i);
assert.match(plan, /dry-run/i);
assert.match(plan, /data sample as input/i);
assert.match(plan, /sdk_integration_mode=none/);
assert.match(plan, /Merge with the existing plan/i);

// Transform: system-field mapping and property confirmation, then convert + salvage.
assert.match(transform, /#account_id/);
assert.match(transform, /#distinct_id/);
assert.match(transform, /identity_candidates/);
assert.match(transform, /never infer a decision from a column name alone/i);
assert.match(transform, /value_mapping/);
assert.match(transform, /scan the distinct values/i);
assert.match(transform, /Before saving, present the complete mapping/);
assert.match(transform, /zone_offset_value/);
assert.match(transform, /zone_offset_field/);
assert.match(transform, /--input-file '<a\.csv>' --input-file '<b\.csv>'/);
assert.match(transform, /--salvage-from/);

// Sink: destination resolution and confirmed upload.
assert.match(sink, /project info list/);
assert.match(sink, /project info get/);
assert.match(sink, /project timezone get/);
assert.match(sink, /-web-/);
assert.match(sink, /unverified/);
assert.match(sink, /--dry-run/);
assert.match(sink, /--allow-clean-subset/);
assert.match(sink, /Upload is always one manifest at a time/);

// Upload contract is unchanged.
assert.match(upload, /No AE access token, CLI token, Authorization header/);
assert.match(upload, /receiver accepted the batch, not durable storage/);
assert.match(upload, /--retry/);
assert.match(upload, /--compress gzip/);
assert.match(upload, /HTTP 5xx/);
assert.match(upload, /never retried/);
assert.match(upload, /resume_from_after_verification/);
assert.match(upload, /--resume-from <verified-offset>/);

// Routing and local analysis are unchanged.
assert.match(routing, /Route to local analysis/);
assert.match(analysis, /Observed facts/);
assert.match(analysis, /never embed APPID, receiver, or tokens/);

// Extended mapping contract: eight record types and overlay fields.
assert.match(mapping, /user_setOnce/);
assert.match(mapping, /user_add/);
assert.match(mapping, /user_unset/);
assert.match(mapping, /user_del/);
assert.match(mapping, /user_append/);
assert.match(mapping, /user_uniq_append/);
assert.match(mapping, /value_mapping/);
assert.match(mapping, /random_pool/);
assert.match(mapping, /time_format/);
assert.match(mapping, /exclude_columns/);
assert.match(mapping, /flatten_rules/);
assert.match(mapping, /headers/);
assert.match(mapping, /US format/);
assert.match(mapping, /EU format/);
assert.match(mapping, /#distinct_id/);
assert.match(mapping, /identity_candidates/);
assert.match(mapping, /#zone_offset/);
assert.match(mapping, /zone_offset_value/);
assert.match(mapping, /zone_offset_field/);
assert.match(mapping, /inside `properties`/i);
assert.match(mapping, /cell-relative/);
assert.match(mapping, /Never use inspect's `col_1\.\.col_N` placeholders/i);

// No example command in the ae-data-integration skill may use --yes: upload is a
// plain `write` command, so only explicit user confirmation gates it.
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

for (const file of markdownFiles(join(root, 'skills/ae-data-integration'))) {
  assert.doesNotMatch(
    readFileSync(file, 'utf8'),
    /--yes/,
    `${file.replace(root, '.')} must not use --yes`,
  );
}

process.stdout.write('data integration skill contract tests: passed\n');
