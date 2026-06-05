import type { Command } from '../../../framework/types.js';
import { listEntities } from './list-entities.js';
import { createEntity } from './create-entity.js';

const commands: Command[] = [listEntities, createEntity];

export default commands;
