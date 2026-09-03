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
const errors = readFileSync(join(root, 'skills/ae-data-integration/references/error-handling.md'), 'utf8');

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

// Source: a date-formatted Excel cell reads as a timestamp, and the resulting warning must be
// documented as a question — an AE property already received as a number cannot become datetime.
assert.match(source, /Excel date cells/);
assert.match(source, /not as the Excel serial number/i);
assert.match(source, /its type is now locked/i);
assert.match(source, /Ask whether the column was uploaded before/i);
assert.match(source, /\[h\]:mm:ss/);

// Source: hidden worksheets are excluded by default, and the exclusion must be reported —
// otherwise a lower row count looks like a parse failure. The .xls gap must stay disclosed.
assert.match(source, /Hidden worksheets/);
assert.match(source, /excluded_sheets/);
assert.match(source, /left out of `header_consistency`/);
assert.match(source, /stays readable when the user names it in `--data-set`/);
assert.match(source, /LOCAL_DATA_ALL_DATA_SETS_HIDDEN/);
assert.match(source, /covers XLSX only/i);
assert.match(source, /every visible worksheet in file order/);

// Source: a formula's cached result is the value (including 0 and ""), and a formula with no
// cached result is missing data the tool must never invent. Both halves must stay documented,
// because the counts are the only trace of a cell skipped inside a row that was kept.
assert.match(source, /Excel formula cells/);
assert.match(source, /never evaluates a formula and never guesses a result/i);
assert.match(source, /unreadable_cells/);
assert.match(source, /export values instead of formulas/i);

// Source: a title row above the header costs every column name, so the detection must be
// documented together with the reason it is only reported — and with the flag that resolves it.
assert.match(source, /Title rows above the header/);
assert.match(source, /leading_title_rows/);
assert.match(source, /--skip-rows N/);
assert.match(source, /skip_rows` into the recommended mapping/);
assert.match(source, /header_signal/);
assert.match(source, /never the cell text/i);
assert.match(source, /no flag that puts a header row back/i);
// An unresolved title row must reach the confirmation gate rather than being graded as a
// count-only note, because the mapping's column names are wrong until the user answers.
assert.match(errors, /leading_title_rows/);

// Source: a merged label leaves every row below the block empty, and hidden rows/columns are read as
// data. All three are reported and none changes the read, so the flags and the mapping fields that
// carry a decision into convert must stay documented together with the reason there is no default.
assert.match(source, /Merged cells, hidden rows, and hidden columns/);
assert.match(source, /xlsx_structure/);
assert.match(source, /merged_covered_cells/);
assert.match(source, /hidden_row_samples/);
assert.match(source, /--fill-merged-cells/);
assert.match(source, /--exclude-hidden-rows/);
assert.match(source, /not a forward fill/i);
assert.match(source, /Neither is on by default/i);
assert.match(source, /fill_merged_cells` \/ `exclude_hidden_rows/);
assert.match(source, /`convert` has no read flags of its own/);
// The samples locate a block in Excel; the cell's text is the thing that must never be printed.
assert.match(source, /references such as `A3:A5`, never cell text/);

// Source: value frequency and the numeric distribution are what makes a column's values judgeable
// before they are locked into an AE property, so the field names, the reason a high-cardinality
// column reports no table, and the "do not paste it" rule must all stay documented.
assert.match(source, /value_frequency/);
assert.match(source, /numeric_summary/);
assert.match(source, /quantiles_approximate/);
assert.match(source, /`unique_count` is the field to read instead/);
assert.match(source, /cumulative snapshot rather than a per-row measure/);
assert.match(source, /do not paste the whole table/i);
// The manifest carries the mapping, not the file's values; that boundary is the reason both fields
// are inspect-only and must not drift into a promise that convert reports them.
assert.match(source, /never in the convert manifest/);

// Source: a 合计 / 小计 row is a fabricated event once uploaded, and it is only recognizable before
// then. The signals, the row-ordinal semantics, and the reason no flag drops the row must all stay
// documented — a detector whose finding is not actionable would just be noise.
assert.match(source, /Summary and total rows/);
assert.match(source, /summary_rows/);
assert.match(source, /total_label/);
assert.match(source, /column_total/);
assert.match(source, /label_column/);
assert.match(source, /total_columns/);
assert.match(source, /no flag that drops a data row/);
assert.match(source, /but never the cell text/);
// The manifest is what upload reads, so the finding has to be documented as reaching it.
assert.match(source, /manifest\.output\.summary_rows/);
// Summary rows are detected now, so they must be off the "not checked" list and on the severity
// table instead — the list is a promise about what the tool does not look at.
assert.match(errors, /`summary_rows` names rows that read as a summary line/);
assert.doesNotMatch(errors, /detector yet[\s\S]{0,200}summary/i);

// Source: a repeated business key is a doubled event once uploaded, and it is only recognizable
// before then. The key columns, the row ordinals, the "report, never remove" rule, and the reason
// no value is ever printed must all stay documented — a repeat is sometimes a real pair of records.
assert.match(source, /Repeated business keys/);
assert.match(source, /duplicate_keys/);
assert.match(source, /key_columns/);
assert.match(source, /checked_rows/);
assert.match(source, /duplicate_groups/);
assert.match(source, /extra_rows/);
assert.match(source, /key_hash/);
assert.match(source, /no way to un-send/);
assert.match(source, /compared as written/);
assert.match(source, /separate observations/);
// The manifest is what upload reads, so the finding has to be documented as reaching it.
assert.match(source, /manifest\.output\.duplicate_keys/);
// Duplicate keys are detected now, so they must be off the "not checked" list and on the severity
// table instead — the list is a promise about what the tool does not look at.
assert.match(errors, /`duplicate_keys` names rows the source repeated/);
assert.doesNotMatch(errors, /detector yet[\s\S]{0,200}duplicate/i);

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
// Transform: the manifest's conservation equation is the one check that catches a row dropped or
// duplicated between the source and the output, and it must stay documented next to the counts.
assert.match(transform, /source_rows/);
assert.match(transform, /conservation equation/);
assert.match(transform, /valid_records \+ invalid_records/);

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

// Data-safety rules that keep bad data out of AE rather than out of the report.
// 1. Mapping fill-in options may not be used to zero out a validation failure.
assert.match(skill, /never to make a validation failure disappear/i);
assert.match(skill, /never shrink the upload scope to manufacture a pass/i);
// 2. A parseable time column does not establish the metric's native granularity.
assert.match(routing, /Time coverage is not native granularity/i);
assert.match(routing, /Do not infer it from the file name/i);
assert.match(routing, /cumulative snapshot/i);
// 3. Matching headers do not prove the sources are disjoint.
assert.match(source, /mutually exclusive partitions/i);
assert.match(transform, /mutually exclusive partitions/i);
// 4. File-level quality grading, honest about what has no detector yet.
assert.match(errors, /File-level data-quality severity/i);
assert.match(errors, /Critical/);
assert.match(errors, /never tell the user the tool checked\s+something it did not/i);
// The "no detector yet" list is a promise about what the tool does not check; formula cells left
// it when the detector landed, so they must now be graded instead.
assert.match(errors, /`unreadable_cells` counts XLSX cells/);
assert.match(errors, /formula_no_cached_value/);
assert.doesNotMatch(errors, /detector yet[\s\S]{0,200}formula cells with no cached value/);
// Same for merged coverage and hidden rows/columns: they are graded now, so they must be off the
// "not checked" list and on the severity table, with the counts explained.
assert.match(errors, /`xlsx_structure` records worksheet layout/);
assert.match(errors, /merged_covered_cells/);
assert.match(errors, /hidden_rows/);
assert.match(errors, /excluded_hidden_rows/);
assert.doesNotMatch(errors, /detector yet[\s\S]{0,200}merged-cell fills/);

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
