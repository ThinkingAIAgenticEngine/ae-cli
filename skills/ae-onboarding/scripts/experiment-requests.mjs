import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { isDemoAccountId, resolveExperimentPreset } from './resolve-experiment-preset.mjs';

function buildRequests({ industry, experimentType, sampleId, itemId, runId, bucketId: requestedBucketId, accountIds: requestedAccountIds, metricIds }) {
  const { preset, sample, experimentType: selectedType } = resolveExperimentPreset({ industry, experimentType, sampleId, itemId });
  const bucketId = requestedBucketId === undefined ? preset.audience.bucketId : requestedBucketId;
  const accountIds = requestedAccountIds === undefined ? sample.followUpAccountIds : requestedAccountIds;
  if (typeof runId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(runId)) {
    throw new Error('runId must be the saved Demo run ID.');
  }
  if (bucketId !== preset.audience.bucketId) {
    throw new Error('bucketId must be the preset account-ID bucket.');
  }
  if (!Array.isArray(accountIds) || accountIds.length < 2
      || accountIds.some((id) => typeof id !== 'string' || !id.trim() || id !== id.trim())
      || new Set(accountIds).size !== accountIds.length) {
    throw new Error('accountIds must contain at least two distinct, verified account IDs.');
  }
  if (selectedType === 'checkout-recovery' && (requestedAccountIds === undefined
      || !accountIds.every(id => isDemoAccountId(id, sampleId, sample.userCount)))) {
    throw new Error('Checkout recovery requires the verified cohort for this Demo sample.');
  }
  const revenueMetricId = metricIds === undefined ? sample.netRevenueMetricId : metricIds?.secondary;
  if (typeof revenueMetricId !== 'string' || !revenueMetricId.trim() || revenueMetricId !== revenueMetricId.trim()) {
    throw new Error('metricIds.secondary must contain the verified net revenue metric ID.');
  }

  const suffix = createHash('sha256').update(runId).digest('hex').slice(0, 12);
  const featureKey = `${preset.feature.keyPrefix}_${suffix}`;
  const { control, treatment } = preset.arms;
  const feature = {
    featureKey,
    displayName: `${preset.feature.displayName} (${runId})`,
    type: preset.feature.type,
    defaultValue: control.featureValue,
    targetPlatform: preset.feature.targetPlatform,
  };

  const filters = {
    relation: 'and',
    items: [
      { field: preset.metricFilters[0], operator: 'eq', values: [sampleId] },
      { field: preset.metricFilters[1], operator: 'eq', values: [itemId] },
    ],
  };
  const { role, format, ...definition } = preset.metrics.find((entry) => entry.role === 'primary');
  const metric = {
    metricId: `plg_primary_${suffix}`,
    metricName: `Unique buyers (${runId})`,
    createType: 'event',
    goalDirection: 'up',
    metricPurpose: 'confidence_statistics',
    metricDesc: 'Unique buyers for the Demo sample and item',
    format,
    metricDefinition: { type: 'event', ...definition, filters },
  };
  if (metric.metricId === revenueMetricId) throw new Error('The two experiment metrics must have different IDs.');

  const secondary = preset.metrics.find((entry) => entry.role === 'secondary');
  const revenueMetric = {
    metricId: revenueMetricId,
    metricName: `PLG net revenue (${sampleId})`,
    createType: 'event',
    goalDirection: 'up',
    metricPurpose: 'confidence_statistics',
    metricDesc: 'Total paid order amount for the Demo sample and item',
    format: secondary.format,
    metricDefinition: {
      type: 'event',
      event: secondary.event,
      aggregation: secondary.aggregation,
      property: secondary.property,
      filters,
    },
  };

  const experiment = {
    expName: `${preset.experiment.name} (${runId})`,
    expType: preset.experiment.atlasType,
    expSupposition: preset.experiment.hypothesis,
    isExpSharing: 0,
    bucketId,
    allocation: preset.allocation,
    expCycle: { cycleType: 'day', dayNum: preset.durationDays },
    featureKeyList: [featureKey],
    groups: [control, treatment].map((arm, index) => ({
      expGroupName: arm.name,
      isControl: index === 0 ? 1 : 0,
      allocation: arm.allocation,
      expGroupValue: JSON.stringify([arm.featureValue]),
    })),
    metrics: [
      { metricId: metric.metricId, metricRole: role },
      { metricId: revenueMetricId, metricRole: 'secondary' },
    ],
    targeting: {
      definitionRequest: {
        type: 'condition',
        conditions: {
          relation: 'or',
          items: [...accountIds].sort().map((id) => ({
            type: 'user', field: '#account_id', operator: 'eq', values: [id],
          })),
        },
      },
    },
  };
  return metricIds === undefined ? { feature, metric, experiment, revenueMetric } : { feature, metric, experiment };
}

try {
  if (process.argv.length !== 3) throw new Error('Usage: node experiment-requests.mjs <verified-input.json>');
  const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(buildRequests(input), null, 2) + '\n');
} catch (error) {
  process.stderr.write(`Cannot prepare Demo experiment requests: ${error.message}\n`);
  process.exitCode = 1;
}
