import type { Draft } from '../plan/types.js';
import { createTrackingClient } from '../../core/tracking-client.js';
import { t } from '../i18n/translate.js';

export interface FetchPlanArgs {
  projectId: number;
  host: string;
}

export async function fetchPlan({ projectId, host }: FetchPlanArgs): Promise<Draft> {
  const client = await createTrackingClient(host);
  const data = await client.getProgram(projectId);
  if (!data) {
    throw new Error(t('error.fetch_no_data', { host }));
  }
  return normalize(data);
}

interface RawEvent {
  eventName: string;
  displayName?: string;
  eventDesc?: string;
  eventTag?: string;
  props?: string[];
}
interface RawProp {
  name: string;
  displayName?: string;
  type?: string;
  desc?: string;
  updateType?: string;
  propTag?: string;
}

function normalize(data: {
  events?: RawEvent[];
  eventProps?: RawProp[];
  commonEventProps?: RawProp[];
  userProps?: RawProp[];
}): Draft {
  return {
    meta: { app_type: 'unknown', sdk_integration_mode: 'client_only', plan_name: 'from-te' },
    events: (data.events ?? []).map((e) => ({
      event_name: e.eventName,
      display_name: e.displayName,
      event_tag: e.eventTag,
      event_desc: e.eventDesc,
      source: 'chat',
      prop_names: e.props ?? [],
    })),
    event_properties: (data.eventProps ?? []).map((p) => ({
      name: p.name,
      display_name: p.displayName,
      type: (p.type?.toLowerCase() ?? 'string') as Draft['event_properties'][0]['type'],
      desc: p.desc,
      source: 'chat',
    })),
    common_event_properties: (data.commonEventProps ?? []).map((p) => ({
      name: p.name,
      display_name: p.displayName,
      type: (p.type?.toLowerCase() ?? 'string') as Draft['common_event_properties'][0]['type'],
      desc: p.desc,
      source: 'chat',
    })),
    user_properties: (data.userProps ?? []).map((p) => ({
      name: p.name,
      display_name: p.displayName,
      type: (p.type?.toLowerCase() ?? 'string') as Draft['user_properties'][0]['type'],
      desc: p.desc,
      update_type: (p.updateType ?? 'user_set') as Draft['user_properties'][0]['update_type'],
      prop_tag: p.propTag,
      source: 'chat',
    })),
  };
}
