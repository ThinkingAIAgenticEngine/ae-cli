import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

const aggregations = new Set([
  'total_count', 'user_count', 'active_days',
  'sum', 'avg', 'max', 'distinct_count',
]);
const propertyAggregations = new Set(['sum', 'avg', 'max', 'distinct_count']);
const metricDefinitionFields = new Set([
  'type', 'event', 'aggregation', 'property', 'filters',
]);

/** Validates the semantic property-comparison tree used by event metrics. */
function validateMetricFilters(rawFilters: unknown): void {
  if (rawFilters === undefined) return;
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    throw new Error('Flag --req.metricDefinition.filters must be a JSON object');
  }
  const filters = rawFilters as Record<string, unknown>;
  if (!['and', 'or'].includes(String(filters.relation))) {
    throw new Error('Flag --req.metricDefinition.filters.relation must be one of: and, or');
  }
  if (!Array.isArray(filters.items) || filters.items.length === 0) {
    throw new Error('Flag --req.metricDefinition.filters.items must be a non-empty array');
  }
  filters.items.forEach((rawItem, index) => {
    const path = `Flag --req.metricDefinition.filters.items[${index}]`;
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      throw new Error(`${path} must be a JSON object`);
    }
    const item = rawItem as Record<string, unknown>;
    const field = item.field;
    const validField = typeof field === 'string' && field.trim() !== ''
      || Boolean(field && typeof field === 'object' && !Array.isArray(field)
        && typeof (field as Record<string, unknown>).name === 'string'
        && String((field as Record<string, unknown>).name).trim() !== '');
    if (!validField) throw new Error(`${path}.field is required`);
    if (typeof item.operator !== 'string' || item.operator.trim() === '') {
      throw new Error(`${path}.operator is required and expresses the property comparison`);
    }
    if (!Array.isArray(item.values)) {
      throw new Error(`${path}.values must be an array containing the comparison value(s)`);
    }
  });
}

/** Validates the public semantic event-metric request before contacting Hermes. */
export function validateMetricSaveRequest(req: Record<string, unknown>): void {
  const rawDefinition = req.metricDefinition;
  if (rawDefinition === undefined && req.update === true) return;
  if (!rawDefinition || typeof rawDefinition !== 'object' || Array.isArray(rawDefinition)) {
    throw new Error('Flag --req.metricDefinition must be a JSON object');
  }
  const definition = rawDefinition as Record<string, unknown>;
  for (const field of Object.keys(definition)) {
    if (!metricDefinitionFields.has(field)) {
      throw new Error(`Flag --req.metricDefinition.${field} is not supported`);
    }
  }
  if (definition.type !== 'event') {
    throw new Error('Flag --req.metricDefinition.type must be event');
  }
  if (typeof definition.event !== 'string' || definition.event.trim() === '') {
    throw new Error('Flag --req.metricDefinition.event is required');
  }
  if (typeof definition.aggregation !== 'string' || !aggregations.has(definition.aggregation)) {
    throw new Error(`Flag --req.metricDefinition.aggregation must be one of: ${[...aggregations].join(', ')}`);
  }
  if (propertyAggregations.has(definition.aggregation)
      && (typeof definition.property !== 'string' || definition.property.trim() === '')) {
    throw new Error(`Flag --req.metricDefinition.property is required for ${definition.aggregation}`);
  }
  validateMetricFilters(definition.filters);
}

/** Creates or updates an experiment metric. */
export const metricSave = createExperimentCapabilityCommand({
  resource: 'metric', command: 'save', capabilityId: 'experiment.metric.save',
  description: 'Create or update an experiment metric.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'req',
      type: 'json',
      required: true,
      desc: 'Native camelCase request. Property comparisons use metricDefinition.filters={relation,items:[{field,operator,values}]}. Never use metricConfig, calcType, or raw filts.',
    },
  ],
  risk: 'write',
  validate: (ctx) => { validateMetricSaveRequest(readRequiredObject(ctx, 'req')); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
