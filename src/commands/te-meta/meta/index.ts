import type { Command } from '../../../framework/types.js';
import { listEvents } from './list-events.js';
import { listProperties } from './list-properties.js';
import { batchEditMetadata } from './batch-edit-metadata.js';
import { batchCreateMetadata } from './batch-create-metadata.js';
import { createVirtualEvent } from './create-virtual-event.js';
import { createVirtualProperty } from './create-virtual-property.js';
import { listMetrics } from './list-metrics.js';
import { getMetric } from './get-metric.js';
import { createMetric } from './create-metric.js';
import { updateMetric } from './update-metric.js';

const commands: Command[] = [
  listEvents,
  listProperties,
  batchEditMetadata,
  batchCreateMetadata,
  createVirtualEvent,
  createVirtualProperty,
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
];

export default commands;
