import assert from 'node:assert/strict';

const {
  validateEmbeddedSemanticDefinitions,
  validateSemanticAudienceDefinition,
  validateSemanticEventDefinition,
  validateSemanticMetricDefinition,
} = await import('../../src/commands/te-engage/semantic-qp-validation.ts');

const behaviorSequenceAudience = {
  type: 'condition',
  conditions: {
    relation: 'or',
    items: [{
      type: 'behavior_sequence',
      completed: true,
      steps: [
        { event: 'visit', completed: true },
        { event: 'purchase', window: { value: 7, unit: 'day' } },
      ],
      time_range: { mode: 'recent', unit: 'day', value: 30 },
      window: { value: 30, unit: 'day' },
    }],
  },
};

assert.doesNotThrow(() => validateSemanticAudienceDefinition(
  behaviorSequenceAudience,
  '--definition-request',
));
assert.throws(
  () => validateSemanticAudienceDefinition({
    ...behaviorSequenceAudience,
    conditions: { relation: 1, items: [] },
  }, '--definition-request'),
  /conditions\.relation must be one of: and, or/,
);
assert.throws(
  () => validateSemanticAudienceDefinition({
    ...behaviorSequenceAudience,
    targetClusterQp: '{}',
  }, '--definition-request'),
  /Unsupported field --definition-request\.targetClusterQp/,
);
assert.throws(
  () => validateSemanticAudienceDefinition({
    ...behaviorSequenceAudience,
    conditions: {
      relation: 'and',
      items: [{
        type: 'behavior_sequence',
        completed: true,
        steps: [
          { event: 'visit' },
          { event: 'purchase', relative_to_first: true, window: { value: 7, unit: 'day' } },
        ],
        time_range: { mode: 'recent', unit: 'day', value: 30 },
      }],
    },
  }, '--definition-request'),
  /steps\[1\]\.relative_to_first must be false or omitted for the second step/,
);
assert.doesNotThrow(() => validateSemanticAudienceDefinition({
  ...behaviorSequenceAudience,
  conditions: {
    relation: 'and',
    items: [{
      type: 'behavior_sequence',
      completed: true,
      steps: [
        { event: 'visit' },
        { event: 'browse', window: { value: 1, unit: 'day' } },
        { event: 'purchase', relative_to_first: true, window: { value: 7, unit: 'day' } },
      ],
      time_range: { mode: 'recent', unit: 'day', value: 30 },
    }],
  },
}, '--definition-request'));

assert.throws(
  () => validateSemanticAudienceDefinition({
    type: 'condition',
    conditions: {
      relation: 'and',
      items: [{ type: 'event', event: 'purchase' }],
    },
  }, '--definition-request'),
  /conditions\.items\[0\]\.time_range is required/,
);
assert.throws(
  () => validateSemanticAudienceDefinition({
    type: 'condition',
    conditions: {
      relation: 'and',
      items: [{
        type: 'behavior_sequence',
        completed: true,
        steps: [{ event: 'visit' }, { event: 'purchase' }],
      }],
    },
  }, '--definition-request'),
  /conditions\.items\[0\]\.time_range is required/,
);

assert.doesNotThrow(() => validateSemanticEventDefinition({
  type: 'event',
  event: 'purchase',
  aggregation: 'sum',
  property: 'amount',
  operator: 'gte',
  value: 1,
}, '--event-definition'));
assert.throws(
  () => validateSemanticEventDefinition({ type: 'event', eventName: 'purchase' }, '--event-definition'),
  /Unsupported field --event-definition\.eventName/,
);

assert.doesNotThrow(() => validateSemanticMetricDefinition({
  type: 'formula',
  expression: 'purchase_count / active_users',
  dependencies: [
    { type: 'event', key: 'purchase_count', event: 'purchase', aggregation: 'total_count' },
    { type: 'event', key: 'active_users', event: 'login', aggregation: 'user_count' },
  ],
}, '--metric-definition'));
assert.throws(
  () => validateSemanticMetricDefinition({
    type: 'event',
    event: 'purchase',
    aggregation: 'percentile',
    property: 'amount',
    percentile: 101,
  }, '--metric-definition'),
  /percentile must be greater than 0 and at most 100/,
);

assert.doesNotThrow(() => validateEmbeddedSemanticDefinitions({
  nodes: [{
    config: JSON.stringify({
      targetDefinitionRequest: behaviorSequenceAudience,
      triggerDefinition: {
        rules: [{
          events: [{
            eventDefinition: { type: 'event', event: 'purchase' },
            hasDone: true,
          }],
        }],
      },
    }),
  }],
}, '--req'));

console.log('Semantic QP validation tests passed.');
