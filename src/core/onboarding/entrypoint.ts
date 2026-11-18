/** Recognize the leaves that resolve their own onboarding host. */
export function isOnboardingInvocation(args: string[]): boolean {
  const positional: string[] = [];
  const values = new Set(['--host', '--cli-token-file', '--mcp-url', '--format', '--jq', '--agent-context', '--source', '--region', '--language', '--website-env', '--session-id', '--run-id', '--choice', '--sample', '--confirm-business-project-id', '--browser', '--scenario']);
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--') break;
    if (argument.startsWith('-')) {
      if (!argument.includes('=') && values.has(argument)) i++;
      else if (['--sdk-complete', '--upload-metric-event', '--prepare-approver', '--start-only'].includes(argument) && ['true', 'false', '0', '1', 'yes', 'no', 'y', 'n', 'on', 'off'].includes((args[i + 1] ?? '').toLowerCase())) i++;
      continue;
    }
    positional.push(argument);
  }
  return positional.length === 3 && positional[0] === 'analysis' && positional[1] === 'onboarding'
    && ['run', 'status', 'growth', 'experiment-plan', 'experiment-launch'].includes(positional[2]);
}
