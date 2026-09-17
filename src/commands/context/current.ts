import { getFromMainApp } from '../../core/te-agent-client.js';
import { CliValidationError } from '../../core/errors.js';
import type { Command } from '../../framework/types.js';

const CURRENT_PAGE_CONTEXT_PATH = '/api/sandbox/agent/context/current';

export type CurrentPageContextReader = (path: string) => Promise<unknown>;

export function createCurrentPageContextCommand(
  read: CurrentPageContextReader = getFromMainApp,
  readConversationId: () => string | undefined = () => process.env.TE_AGENT_CONVERSATION_ID,
): Command {
  return {
    service: 'context',
    command: '+current',
    description: 'Read the current page context bound to the active Agent Run',
    flags: [],
    risk: 'read',
    usesAeHost: false,
    execute: async () => {
      const conversationId = readConversationId()?.trim();
      if (!conversationId) {
        throw new CliValidationError(
          'Current page context is available only inside an active Agent Run.',
          {
            code: 'CURRENT_PAGE_CONTEXT_RUN_REQUIRED',
            hint: 'Open AE Agent from a supported product page and ask about the current page.',
          },
        );
      }
      const query = new URLSearchParams({ conversationId });
      return read(`${CURRENT_PAGE_CONTEXT_PATH}?${query.toString()}`);
    },
  };
}

export const currentPageContext = createCurrentPageContextCommand();
