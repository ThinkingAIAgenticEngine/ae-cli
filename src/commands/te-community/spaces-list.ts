import { createCapabilityCommand } from '../../core/capability-command.js';
import { unwrapOutputData, withOutputMetadata } from '../../framework/output.js';
import type { RuntimeContext } from '../../framework/types.js';

const spacesList = createCapabilityCommand({
  cliService: 'community',
  resource: 'spaces',
  command: 'list',
  capabilityId: 'community.space.list',
  description: 'List community spaces available to the current user.',
  flags: [],
  risk: 'read',
  buildInput: () => ({}),
});

export const communitySpacesList = {
  ...spacesList,
  async execute(ctx: RuntimeContext) {
    const result = await spacesList.execute(ctx);
    const data = unwrapOutputData(result);
    // Count the returned entries, overriding only the same server metadata key.
    return Array.isArray(data)
      ? withOutputMetadata(result, { returned_count: data.length })
      : result;
  },
};
