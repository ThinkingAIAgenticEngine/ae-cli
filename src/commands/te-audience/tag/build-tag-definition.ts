import { createMcpCommand, optionalBoolean, optionalJson, optionalString } from '../shared.js';

export const buildTagDefinition = createMcpCommand({
  command: '+build_tag_definition',
  description: 'Build a tag definition JSON from structured intent. Call this before create_tag or update_tag to generate the definition field. Supported types: condition (multi-value), metric (event metric), first_last (first/last occurrence), sql. For condition/metric/first_last types, event and property names are resolved from project metadata — do not guess. On success, pass the returned definition to create_tag or update_tag.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'type', type: 'string', required: true, desc: 'Tag type: condition / metric / first_last / sql' },
    { name: 'condition_values', type: 'json', required: false, desc: 'For type=condition: list of tag value definitions JSON array. Each item defines a segment label and its conditions.' },
    { name: 'metric', type: 'json', required: false, desc: 'For type=metric: metric definition JSON. Fields: eventName, analysis, quota (property name), recentDay/startTime/endTime.' },
    { name: 'first_last', type: 'json', required: false, desc: 'For type=first_last: first/last occurrence definition JSON. Fields: eventName, firstEvent (true=first occurrence, false=last occurrence), calcPropType, property, recentDay/startTime/endTime.' },
    { name: 'sql', type: 'string', required: false, desc: 'For type=sql: SQL query returning two columns: #user_id and the tag value.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the definition.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    request: {
      projectId: ctx.num('project_id'),
      type: ctx.str('type'),
      conditionValues: optionalJson(ctx, 'condition_values'),
      metric: optionalJson(ctx, 'metric'),
      firstLast: optionalJson(ctx, 'first_last'),
      sql: optionalString(ctx, 'sql'),
    },
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
