import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('./experiment-preset.json', import.meta.url), 'utf8'));

export function isDemoAccountId(id, sampleId, userCount) {
  if (typeof id !== 'string' || !id.startsWith(`${sampleId}-user-`)) return false;
  const number = id.slice(sampleId.length + '-user-'.length);
  return /^[1-9][0-9]{0,2}$/.test(number) && number === number.trim() && Number(number) <= userCount;
}

export function resolveExperimentPreset({ industry, experimentType, sampleId, itemId }) {
  const matches = Object.entries(catalog.industries).filter(([id, { samples }]) =>
    (industry === undefined || industry === id) && Object.hasOwn(samples, sampleId)
    && samples[sampleId].itemId === itemId);
  if (matches.length !== 1) {
    throw new Error('The industry, sample ID and item ID must identify a supported Demo sample.');
  }

  const [industryId, { samples }] = matches[0];
  const sample = samples[sampleId];
  const experimentTypeId = experimentType ?? sample.experimentTypes[0];
  if (!sample.experimentTypes.includes(experimentTypeId) || !Object.hasOwn(catalog.experimentTypes, experimentTypeId)) {
    throw new Error(`Unsupported experiment type for ${industryId}/${sampleId}. Available: ${sample.experimentTypes.join(', ')}.`);
  }
  return { industry: industryId, experimentType: experimentTypeId, sample, preset: catalog.experimentTypes[experimentTypeId] };
}
