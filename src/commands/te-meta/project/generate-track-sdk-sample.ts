import { createMcpCommand, requiredJsonString } from '../shared.js';

export const generateTrackSdkSample = createMcpCommand({
  command: '+generate_track_sdk_sample',
  description: 'Generate SDK sample files based on tracking plan (async)',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'sdk_type', type: 'json', required: true, desc: 'SDK types JSON array. Allowed values: android-java, server-php, ios-swift, server-python, web-js, server-java, server-nodejs, wechat-miniapp, harmonyos-arkts, android-kotlin, unity-csharp, cocos-creator-ts, server-go, server-cpp, ios-objc' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    sdkType: ctx.json('sdk_type'),
  }),
});