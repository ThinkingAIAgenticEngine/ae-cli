import { captureThingsAgentContext } from './things-agent-context.js';

const mode = process.argv[2];
if (mode !== 'claude' && mode !== 'codex' && mode !== 'none') throw new Error('Expected claude, codex or none fixture mode');
process.stdout.write(JSON.stringify(await captureThingsAgentContext(mode)));
