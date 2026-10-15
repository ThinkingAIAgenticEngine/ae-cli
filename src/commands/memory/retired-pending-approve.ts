import { retiredCommand, retiredIdFlag } from './shared.js';
export const retiredPendingApprove = retiredCommand('+pending-approve', 'Use ae-cli memory +candidate-approve.', [retiredIdFlag]);
