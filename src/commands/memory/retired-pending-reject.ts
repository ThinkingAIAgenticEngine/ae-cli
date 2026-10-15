import { retiredCommand, retiredIdFlag } from './shared.js';
export const retiredPendingReject = retiredCommand('+pending-reject', 'Use ae-cli memory +candidate-reject.', [retiredIdFlag]);
