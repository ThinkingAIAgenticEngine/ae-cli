import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  buildCapabilityGatewayUrl,
  executeCapability,
} from '../../../../core/capability-api.js';
import type { Command, RuntimeContext } from '../../../../framework/types.js';
import type { Draft } from '../../../../tracking/plan/types.js';
import {
  assertTrackingDraft,
  buildDisplayNameSyncPlan,
  type DisplayNameSyncGroup,
} from '../../../../tracking/plan/display-name-sync.js';
import { projectIdFlag } from '../shared.js';

const GATEWAY_DOMAIN = 'analysis';
const LIST_CAPABILITIES = {
  events: 'metadata.event.list',
  eventProperties: 'metadata.property.list',
  userProperties: 'metadata.property.list',
} as const;
const EDIT_CAPABILITY = 'metadata.super_metadata.batch_edit';
const MAX_BATCH_SIZE = 200;
const DIRECTORY_PAGE_SIZE = 200;

export const trackingPlanSyncDisplayNames: Command = {
  service: 'tracking',
  resource: 'plan',
  command: 'sync-display-names',
  description:
    'Fill blank event and property metadata display names from a local tracking-plan draft. Existing non-empty display names are never overwritten.',
  flags: [
    projectIdFlag,
    {
      name: 'draft',
      type: 'string',
      required: true,
      desc: 'Local tracking-plan draft.json containing event/property display_name values.',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    if (!existsSync(ctx.str('draft'))) {
      throw new Error(
        '--draft must reference a readable tracking-plan JSON file.',
      );
    }
  },
  dryRun: async (ctx) => {
    const draft = await readDraft(ctx.str('draft'));
    return {
      project_id: ctx.num('project-id'),
      draft: ctx.str('draft'),
      source_counts: sourceCounts(draft),
      behavior:
        'Fill blank metadata display names only; preserve all existing non-empty display names.',
      steps: [
        ...Object.values(LIST_CAPABILITIES).map((capabilityId) => ({
          method: 'POST',
          url: buildCapabilityGatewayUrl(
            ctx.host(),
            GATEWAY_DOMAIN,
            `capabilities/${capabilityId}/execute`,
          ),
        })),
        {
          method: 'POST',
          url: buildCapabilityGatewayUrl(
            ctx.host(),
            GATEWAY_DOMAIN,
            `capabilities/${EDIT_CAPABILITY}/execute`,
          ),
          note: 'Called only for non-empty update groups, in batches of at most 200 items.',
        },
      ],
    };
  },
  execute: async (ctx) => {
    const projectId = ctx.num('project-id');
    const draftPath = ctx.str('draft');
    const draft = await readDraft(draftPath);
    const [eventResult, eventPropertyResult, userPropertyResult] =
      await Promise.all([
        fetchAllDirectoryItems(
          ctx.host(),
          LIST_CAPABILITIES.events,
          {
            project_id: projectId,
            fields: ['event_name', 'event_desc'],
          },
          'events',
        ),
        fetchAllDirectoryItems(
          ctx.host(),
          LIST_CAPABILITIES.eventProperties,
          {
            project_id: projectId,
            table_type: 'event',
            fields: ['prop_name', 'prop_desc'],
          },
          'properties',
        ),
        fetchAllDirectoryItems(
          ctx.host(),
          LIST_CAPABILITIES.userProperties,
          {
            project_id: projectId,
            table_type: 'user',
            fields: ['prop_name', 'prop_desc'],
          },
          'properties',
        ),
      ]);

    const plan = buildDisplayNameSyncPlan(draft, {
      events: eventResult,
      eventProperties: eventPropertyResult,
      userProperties: userPropertyResult,
    });

    const updateResults: Record<string, unknown[]> = {};
    for (const group of Object.values(plan)) {
      updateResults[group.type] = await executeUpdates(ctx, projectId, group);
    }

    return {
      project_id: projectId,
      draft: draftPath,
      policy: 'blank_only',
      updated: counts(plan, (group) => group.items.length),
      skipped_existing: counts(plan, (group) => group.skippedExisting.length),
      missing_in_metadata: counts(
        plan,
        (group) => group.missingInMetadata.length,
      ),
      missing_display_name_in_draft: counts(
        plan,
        (group) => group.missingInDraft.length,
      ),
      details: {
        missing_in_metadata: Object.fromEntries(
          Object.values(plan).map((group) => [
            group.type,
            group.missingInMetadata,
          ]),
        ),
        missing_display_name_in_draft: Object.fromEntries(
          Object.values(plan).map((group) => [
            group.type,
            group.missingInDraft,
          ]),
        ),
      },
      batches: updateResults,
    };
  },
};

async function fetchAllDirectoryItems(
  host: string,
  capabilityId: string,
  input: Record<string, unknown>,
  arrayField: string,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let offset = 0;
  const visitedOffsets = new Set<number>();
  while (true) {
    if (visitedOffsets.has(offset)) {
      throw new Error(`${capabilityId} returned a repeated next_offset: ${offset}`);
    }
    visitedOffsets.add(offset);
    const result = await executeCapability(host, GATEWAY_DOMAIN, capabilityId, {
      ...input,
      limit: DIRECTORY_PAGE_SIZE,
      offset,
    });
    const page = result?.[arrayField];
    if (!Array.isArray(page)) {
      throw new Error(`${capabilityId} response is missing ${arrayField}`);
    }
    items.push(...page);
    if (result?.has_more !== true) {
      return items;
    }
    const nextOffset = result?.next_offset;
    if (!Number.isInteger(nextOffset) || nextOffset <= offset) {
      throw new Error(`${capabilityId} returned an invalid next_offset: ${String(nextOffset)}`);
    }
    offset = nextOffset;
  }
}

async function readDraft(filePath: string): Promise<Draft> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read tracking draft "${filePath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assertTrackingDraft(value);
  return value;
}

async function executeUpdates(
  ctx: RuntimeContext,
  projectId: number,
  group: DisplayNameSyncGroup,
): Promise<unknown[]> {
  const results: unknown[] = [];
  for (let offset = 0; offset < group.items.length; offset += MAX_BATCH_SIZE) {
    const items = group.items.slice(offset, offset + MAX_BATCH_SIZE);
    results.push(
      await executeCapability(ctx.host(), GATEWAY_DOMAIN, EDIT_CAPABILITY, {
        project_id: projectId,
        type: group.type,
        items,
      }),
    );
  }
  return results;
}

function sourceCounts(draft: Draft): Record<string, number> {
  return {
    event: draft.events.length,
    event_property: new Set(
      [...draft.common_event_properties, ...draft.event_properties].map(
        (property) => property.name,
      ),
    ).size,
    user_property: draft.user_properties.length,
  };
}

function counts(
  plan: ReturnType<typeof buildDisplayNameSyncPlan>,
  value: (group: DisplayNameSyncGroup) => number,
): Record<string, number> {
  return Object.fromEntries(
    Object.values(plan).map((group) => [group.type, value(group)]),
  );
}
