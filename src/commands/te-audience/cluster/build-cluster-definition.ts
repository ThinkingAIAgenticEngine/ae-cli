import { createMcpCommand, optionalBoolean, optionalJson, optionalString } from '../shared.js';

export const buildClusterDefinition = createMcpCommand({
  command: '+build_cluster_definition',
  description: 'Build a cluster definition JSON from structured intent. Call this before create_cluster or update_cluster to generate the definition field. For type=condition, event and property names are resolved from project metadata — do not guess. For type=sql, pass the SQL string directly. On success, pass the returned definition to create_cluster or update_cluster.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'type', type: 'string', required: true, desc: 'Cluster type: condition or sql' },
    { name: 'conditions', type: 'json', required: false, desc: 'For type=condition: main condition group JSON (required). Example: {"filts":[{"conditionType":"event","eventCondition":{...}}],"relation":"and"}' },
    { name: 'include_filter', type: 'json', required: false, desc: 'For type=condition: global include condition group JSON (cluster-type conditions only).' },
    { name: 'exclude_filter', type: 'json', required: false, desc: 'For type=condition: global exclude condition group JSON (cluster-type conditions only).' },
    { name: 'sql', type: 'string', required: false, desc: 'For type=sql: SQL query returning a single column named #user_id.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the definition.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    type: ctx.str('type'),
    conditions: optionalJson(ctx, 'conditions'),
    includeFilter: optionalJson(ctx, 'include_filter'),
    excludeFilter: optionalJson(ctx, 'exclude_filter'),
    sql: optionalString(ctx, 'sql'),
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
