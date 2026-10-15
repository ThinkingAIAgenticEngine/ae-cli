import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(
  path.join(ROOT, 'skills/ae-kb/references/analysis-workflow.md'),
  'utf8',
);
const kbSkill = readFileSync(path.join(ROOT, 'skills/ae-kb/SKILL.md'), 'utf8');
const discoverySkill = readFileSync(
  path.join(ROOT, 'skills/ae-kb-discovery/SKILL.md'),
  'utf8',
);
const analysisSkill = readFileSync(
  path.join(ROOT, 'skills/ae-analysis/SKILL.md'),
  'utf8',
);
const metadataResolution = readFileSync(
  path.join(ROOT, 'skills/ae-analysis/references/metadata_resolution.md'),
  'utf8',
);
const workflowContract = workflow.replace(/\s+/g, ' ');

assert.match(workflow, /does not define knowledge-base compilation rules/);
assert.match(
  workflow,
  /Asset-authentication and metric-recommendation review is a separate workflow/,
);

assert.match(workflow, /analysis execution contract/);
assert.match(workflow, /Asset chain/);
assert.match(workflow, /Statistical definition/);
assert.match(workflow, /Saved parameters/);
assert.match(workflow, /Time contract/);
assert.match(workflow, /Decision boundaries/);

assert.match(workflow, /Choose the most specific executable asset/);
assert.match(workflow, /recall card's primary dashboard is a routing prior/);
assert.match(workflow, /one targeted `\+grep` call against the relevant detail-asset directory/);
assert.match(workflow, /Rank candidates by semantic coverage/);
assert.match(workflow, /one parameterized saved report that produces all requested variants/);
assert.match(workflow, /Do not substitute an account ID/);
assert.match(workflow, /one-way events versus combined inbound and outbound events/);

assert.ok(
  /(?:exact|matched)[\s\S]{0,180}(?:applicable|suitable|covers the (?:request|question))[\s\S]{0,180}(?:priority|first)/i.test(workflowContract),
  'Saved-asset priority must require an exact asset whose definition applies to the request.',
);
assert.match(workflow, /analysis report get/);
assert.match(workflow, /ae-analysis\/references\/report_data_run\.md/);
assert.match(workflow, /analysis report-data run/);
assert.match(workflow, /--sql-params/);
assert.match(workflow, /Dashboard generic filter or\s+time overrides do not apply to SQL reports/);

assert.match(workflow, /Preserve authored parameter semantics/);
assert.match(workflow, /cannot be replaced with `is_dev=false`/);
assert.match(workflow, /live asset differs from the KB snapshot/);
assert.match(workflow, /is a conflict: stop\s+the affected conclusion/);

assert.match(
  workflowContract,
  /none alone establishes a verified ad-hoc or SQL definition/i,
);
assert.match(workflow, /exact saved asset returns an empty result/);
assert.match(workflow, /Permission denial:/);
assert.match(workflow, /Do not\s+retry the denied operation or use an undocumented lower-level API/);
assert.match(workflow, /must not replace the empty saved-asset\s+result/);
assert.match(
  workflow,
  /Permission denial on a dashboard or report is not, by itself, a prohibition\s+on ad-hoc analysis/,
);
assert.match(workflow, /events, metrics, properties, metadata/);
assert.match(workflow, /Capability unavailable/);
assert.match(workflow, /Fixed historical window/);
assert.match(workflow, /Technical success is not semantic correctness/);
assert.match(
  workflow,
  /The KB path is preferred, not exclusive/,
);
assert.match(workflow, /Search for another accessible saved report or dashboard/);
assert.match(workflow, /use authorized ad-hoc analysis only when the normal\s+`ae-analysis` rules permit it/);
assert.match(workflow, /permission is independently enforced by the backend/);
assert.match(workflowContract, /The user does not need to restate the original data request/);
assert.match(workflow, /Never claim that the KB\s+asset produced a fallback result/);
assert.match(workflow, /Do not infer\s+hidden selectors or dependencies from the failed asset/);
assert.match(workflow, /Do not use fallback to modify, repair, certify, or overwrite/);

assert.match(kbSkill, /read and follow \[`references\/analysis-workflow\.md`\]/);
assert.match(kbSkill, /This is mandatory/);
assert.match(
  discoverySkill,
  /read and follow the `ae-kb` skill's \[`references\/analysis-workflow\.md`\]/,
);
assert.ok(
  /(?:exact|matched)[\s\S]{0,160}(?:applicable|suitable|covers the (?:request|question))/i.test(discoverySkill),
  'KB discovery must qualify saved-asset execution by applicability to the request.',
);
assert.match(
  analysisSkill,
  /read and follow \[`\.\.\/ae-kb\/references\/analysis-workflow\.md`\]/,
);
assert.ok(
  /(?:exact|matched)[\s\S]{0,160}(?:applicable|suitable|covers the (?:request|question))/i.test(analysisSkill),
  'The analysis entry must distinguish an applicable exact asset from a semantic-only KB hit.',
);

// These assertions check the packaged instructions, not Agent execution behavior.
assert.ok(
  /definition inspection[\s\S]{0,400}(?:does not require|without|do not|need not|no need)[\s\S]{0,160}(?:data query|data execution|(?:execute|run)[\s\S]{0,80}data)/i.test(workflowContract),
  'Definition inspection that establishes an unsuitable saved asset must not require a data query before ordinary discovery.',
);
assert.ok(
  /(?:states|classification|classify)[\s\S]{0,200}asset[\s\S]{0,200}(?:not|do not)[\s\S]{0,100}(?:original|whole|entire|overall) (?:task|request)/i.test(workflowContract),
  'Partial or blocked saved-asset states must not terminate the original business task.',
);
assert.match(workflow, /metadata_resolution\.md/);
assert.ok(
  /(?:no suitable saved asset|no executable KB asset|no applicable saved asset|semantic-only|semantic_only)[\s\S]{0,600}(?:ordinary analysis|metadata resolution|metadata_resolution)/i.test(workflowContract),
  'Semantic coverage without an applicable saved asset must continue to ordinary analysis discovery.',
);
assert.ok(
  /(?:missing|unresolved) metadata/i.test(metadataResolution) &&
    /(?:KB|knowledge-base)[\s\S]{0,500}(?:ad-hoc|ad hoc)/i.test(metadataResolution),
  'Metadata resolution must preserve KB semantics while filling only missing metadata for an allowed ad-hoc definition.',
);
const confirmationSection = metadataResolution.match(/## Confirm and bind([\s\S]*?)After the reply/);
assert.ok(confirmationSection, 'Metadata resolution must keep its confirmation contract.');
const confirmationContract = confirmationSection[1].replace(/\s+/g, ' ');
assert.match(confirmationContract, /canonical fields, types, or filter values.*already explicit or confirmed business meaning.*evidence completion/i);
assert.match(confirmationContract, /not automatically a new business mapping/i);
assert.match(confirmationContract, /ambiguous entity, scope, or definition.*still needs confirmation/i);
assert.match(confirmationContract, /Confirm a selected business mapping once.*even if only one candidate is suitable/);
const metadataEntry = analysisSkill.match(/### Metadata discovery([\s\S]*?)### Saved business asset or ad-hoc/);
assert.ok(metadataEntry, 'The analysis entry must expose the same metadata discovery boundary.');
assert.match(
  metadataEntry[1].replace(/\s+/g, ' '),
  /Verifying fields, types, and filters.*already explicit or confirmed meaning.*evidence completion.*not a new business choice/,
);
assert.match(workflow, /## Check task completion/);
assert.match(workflow, /check each requirement of the original question/);
assert.match(workflow, /Keep genuine unknown fields unknown/);
assert.match(workflow, /do not broaden an empty result merely to get rows/);

console.log('KB-guided analysis workflow contract passed.');
