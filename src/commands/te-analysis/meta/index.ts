import type { Command } from '../../../framework/types.js';
import event from './event/index.js';
import property from './property/index.js';
import virtualEvent from './virtual-event/index.js';
import virtualProperty from './virtual-property/index.js';
import metric from './metric/index.js';
import asset from './asset/index.js';
import exchange from './exchange/index.js';
import superMetadata from './super-metadata/index.js';
import datatable from './datatable/index.js';
import catalog from './catalog/index.js';

const commands: Command[] = [
  ...event,
  ...property,
  ...virtualEvent,
  ...virtualProperty,
  ...metric,
  ...asset,
  ...exchange,
  ...superMetadata,
  ...datatable,
  ...catalog,
];

export default commands;
