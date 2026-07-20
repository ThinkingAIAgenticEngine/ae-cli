import { createEngageSettingCapabilityCommand } from '../../shared.js';
import { printError } from '../../../../framework/output.js';

function validateContentListShape(contentList: unknown): void {
  if (!Array.isArray(contentList)) {
    printError(
      'validation',
      '--content-list must be a JSON array of channel template key/value entries.',
      'Example: --content-list \'[{"key":"title","value":"hello"}]\'. For OBJ_ARRAY params, value must be a JSON-array string, e.g. \'[{"key":"obj","value":"[]"}]\'.',
    );
    process.exit(1);
  }

  for (const [index, item] of contentList.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      printError(
        'validation',
        `--content-list[${index}] must be an object with key and value.`,
        'Example: --content-list \'[{"key":"title","value":"hello"}]\'.',
      );
      process.exit(1);
    }

    const record = item as Record<string, unknown>;
    if ('pushLanguageCode' in record || 'content' in record) {
      printError(
        'validation',
        '--content-list for channel test-send expects direct key/value entries, not the task/flow language wrapper.',
        'Use [{"key":"<channel_param_key>","value":"<value>"}]. For this OBJ_ARRAY-style channel, use [{"key":"obj","value":"[]"}] instead of [{"pushLanguageCode":"default","content":"[]"}].',
      );
      process.exit(1);
    }

    if (typeof record.key !== 'string' || record.key.length === 0 || !('value' in record)) {
      printError(
        'validation',
        `--content-list[${index}] must include a non-empty string key and a value field.`,
        'The key must match a channel template param from engage +channel_detail data.config.paramsList[].key.',
      );
      process.exit(1);
    }
  }
}

/** Sends a test push message to a channel for a specific recipient (push_id), with content and optional user params. */
export const channelTestSend = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'test-send',
  capabilityId: 'engage-setting.channel.test-send',
  description: 'Send a test push message to a channel for a specific recipient (push_id), with content and optional user params.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID to test.' },
    { name: 'push-id', type: 'string', required: true, desc: 'Recipient send ID (e.g. a test device id).' },
    {
      name: 'content-list',
      type: 'json',
      required: true,
      desc: "JSON array of direct channel template key/value entries, e.g. '[{\"key\":\"title\",\"value\":\"hello\"}]'. Do not pass the task/flow pushLanguageCode/content wrapper.",
    },
    {
      name: 'user-params-list',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of custom user params for the test push.',
    },
    { name: 'push-environment', type: 'string', required: false, desc: 'Push environment: dev or pro.' },
    { name: 'mock-push', type: 'boolean', required: false, desc: 'Mock the push (build request only, do not send).' },
    { name: 'channel-template-id', type: 'string', required: false, desc: 'WeChat channel template ID.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    validateContentListShape(ctx.json('content-list'));
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
    push_id: ctx.str('push-id'),
    content_list: ctx.json('content-list'),
    user_params_list: ctx.json('user-params-list') || undefined,
    push_environment: ctx.str('push-environment') || undefined,
    mock_push: ctx.bool('mock-push'),
    channel_template_id: ctx.str('channel-template-id') || undefined,
  }),
});
