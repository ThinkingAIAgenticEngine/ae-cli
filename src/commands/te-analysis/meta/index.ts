import type { Command } from '../../../framework/types.js';
import { getAlertDefinitionSchema } from './get-alert-definition-schema.js';
import { listAlerts } from './list-alerts.js';
import { getAlert } from './get-alert.js';
import { createAlert } from './create-alert.js';
import { updateAlert } from './update-alert.js';
import { deleteAlert } from './delete-alert.js';

const commands: Command[] = [
  getAlertDefinitionSchema,
  listAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
];

export default commands;
