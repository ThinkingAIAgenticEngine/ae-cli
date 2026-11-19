import { detectCliLocale } from '../../../tracking/i18n/locale.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

const scopeHelp = {
  en:'For compatibility, pass the current scope only. Use +promote or +copy-to-personal to change ownership.',
  zh:'仅用于兼容原样传回当前范围。要更改归属，请使用 +promote 或 +copy-to-personal。',
  ja:'互換性のため現在の公開範囲のみ指定できます。所有範囲の変更は +promote または +copy-to-personal を使用してください。',
  ko:'호환성을 위해 현재 공개 범위만 전달할 수 있습니다. 소유 범위를 변경하려면 +promote 또는 +copy-to-personal을 사용하세요.',
};

const VALID_SCOPES = new Set(['personal', 'company']);

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = ctx.str('name');
  if (name) body.name = name;
  const config = ctx.json('config');
  if (config !== undefined) body.config = config;
  const description = ctx.str('description');
  if (description) body.description = description;
  const scope = ctx.str('scope');
  if (scope) body.scope = scope;
  const enabled = ctx.json('enabled');
  if (enabled !== undefined) body.enabled = enabled;
  return body;
}

export const updateTeam: Command = {
  service: 'team',
  command: '+update',
  description: 'Update an existing team (PATCH — only provided fields are changed).',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Team ID' },
    { name: 'name', type: 'string', required: false, desc: 'New team name' },
    { name: 'config', type: 'json', required: false, desc: 'New TeamConfig JSON' },
    { name: 'description', type: 'string', required: false, desc: 'New description' },
    { name: 'scope', type: 'string', required: false, desc: scopeHelp[detectCliLocale()] },
    { name: 'enabled', type: 'boolean', required: false, desc: 'Whether enabled' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !VALID_SCOPES.has(scope)) {
      throw new Error(`Invalid --scope: ${scope}. Must be personal | company`);
    }
  },
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_TEAM_PATH}/${ctx.str('id')}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'PATCH', `${BASE_TEAM_PATH}/${ctx.str('id')}`, {lang:detectCliLocale()}, buildBody(ctx)),
};
