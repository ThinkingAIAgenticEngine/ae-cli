import { createCapabilityCommand } from '../../core/capability-command.js';

export const communitySourcesList = createCapabilityCommand({
  cliService: 'community',
  resource: 'sources',
  command: 'list',
  capabilityId: 'community.source.list',
  description: 'List configured community ingestion sources and their channel/source IDs.',
  flags: [
    {
      name: 'space-id',
      type: 'int64',
      required: true,
      min: 1,
      desc: 'Community space ID returned by `ae-cli community spaces list`.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    game_id: ctx.int64('space-id'),
  }),
});
