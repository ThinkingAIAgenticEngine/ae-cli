import type { Command } from '../../../framework/types.js';
import { inputFileInspect } from './inspect.js';
import { inputFilePurposeList } from './purpose-list.js';
import { inputFileUpload } from './upload.js';

const commands: Command[] = [inputFileUpload, inputFileInspect, inputFilePurposeList];

export default commands;
export { inputFileInspect, inputFilePurposeList, inputFileUpload };
