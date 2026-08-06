import type { Command } from '../../../../framework/types.js';
import { metadataCatalogExport } from './export.js';
import { metadataCatalogList } from './list.js';

const commands: Command[] = [metadataCatalogList, metadataCatalogExport];

export default commands;
