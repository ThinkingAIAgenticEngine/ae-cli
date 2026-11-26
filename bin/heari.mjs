export async function runHearI(args) {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    console.error('HearI requires Node.js 22 or later. Select a supported runtime and rerun ae-cli heari.');
    return 1;
  }
  const { run } = await import('./heari/engine.mjs');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel);
  process.on('SIGTERM', cancel);
  try {
    // The AE runtime appends its own telemetry option before the optional '--' separator.
    const tail = args.indexOf('--');
    const head = args.slice(0, tail === -1 ? args.length : tail);
    if (head.at(-2) === '--agent-context') head.splice(-2);
    else if (head.at(-1)?.startsWith('--agent-context=')) head.pop();
    const forwarded = tail === -1 ? head : [...head, ...args.slice(tail)];
    return await run(['--lang', 'en-US', ...forwarded], {
      signal: controller.signal,
      aeCredentials: async (signal, checkEndpoint) => {
        const { exchangeHeariCredentials } = await import('../dist/heari-cli-login.js');
        return exchangeHeariCredentials(signal, checkEndpoint);
      },
    });
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
  }
}
