import * as readline from 'node:readline';
import { CliValidationError } from '../core/errors.js';

type ConfirmationInput = NodeJS.ReadableStream & { isTTY?: boolean };
type ConfirmationOutput = NodeJS.WritableStream & { isTTY?: boolean };

export function canPromptForConfirmation(
  input: Pick<ConfirmationInput, 'isTTY'> = process.stdin,
  output: Pick<ConfirmationOutput, 'isTTY'> = process.stderr,
): boolean {
  return input.isTTY === true && output.isTTY === true;
}

export async function confirmHighRiskWrite(
  message: string,
  input: ConfirmationInput = process.stdin,
  output: ConfirmationOutput = process.stderr,
): Promise<boolean> {
  if (!canPromptForConfirmation(input, output)) {
    throw new CliValidationError('Non-interactive high-risk writes require global --yes.', {
      code: 'CONFIRMATION_REQUIRED',
      hint: 'After explicit authorization, retry with the global --yes flag.',
    });
  }
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    let settled = false;
    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      rl.removeListener('close', closed);
      rl.removeListener('SIGINT', closed);
      rl.close();
      resolve(confirmed);
    };
    const closed = () => settle(false);
    rl.once('close', closed);
    rl.once('SIGINT', closed);
    rl.question(`${message} [y/N] `, (answer) => {
      settle(['y', 'yes'].includes(answer.trim().toLowerCase()));
    });
  });
}
