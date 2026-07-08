import type { Command } from '../../../framework/types.js';
import { favoriteAdd } from './add.js';
import { favoriteRemove } from './remove.js';

const commands: Command[] = [
  favoriteAdd,
  favoriteRemove,
];

export default commands;
export { favoriteAdd };
export { favoriteRemove };
