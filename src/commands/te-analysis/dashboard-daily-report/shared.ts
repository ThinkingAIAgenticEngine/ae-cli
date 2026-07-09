import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  booleanWithDefault,
  compactInput,
  numberWithDefault,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectInput,
  stringWithDefault,
} from '../capability-shared.js';

export function dailyReportFlags(update: boolean): Flag[] {
  return [
    { name: 'need-csv', type: 'boolean', required: false, desc: 'Whether to include CSV attachment. Default: false.' },
    { name: 'host-url', type: 'string', required: false, desc: 'Public host URL used in report links. Default: empty.' },
    { name: 'enable-smtp', type: 'boolean', required: false, desc: 'Whether to use configured SMTP for email. Default: false.' },
    { name: 'enable-email', type: 'boolean', required: false, desc: 'Whether to send by email. Default: false.' },
    { name: 'enable-dd', type: 'boolean', required: false, desc: 'Whether to send by DingTalk webhook. Default: false.' },
    { name: 'enable-wx', type: 'boolean', required: false, desc: 'Whether to send by WeCom webhook. Default: false.' },
    { name: 'enable-feishu', type: 'boolean', required: false, desc: 'Whether to send by Feishu webhook. Default: false.' },
    { name: 'send-title', type: 'string', required: false, desc: 'Daily report title.' },
    { name: 'send-content', type: 'string', required: false, desc: 'Daily report content.' },
    { name: 'send-date', type: 'string', required: false, desc: 'Scheduled weekdays, comma-separated 1..7. Default: 1,2,3,4,5,6,7.' },
    { name: 'send-time', type: 'string', required: false, desc: 'Scheduled send time, HH:mm. Default: 09:00.' },
    { name: 'lang', type: 'string', required: false, desc: 'Report language. Default: zh-CN.' },
    { name: 'screen-type', type: 'string', required: false, desc: 'Screenshot screen type. Default: normal.' },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Time zone offset. Default: 0.' },
    ...(update ? [
      { name: 'enable-send', type: 'boolean', required: false, desc: 'Whether to enable scheduled sending. Default: false.' },
    ] as Flag[] : []),
  ];
}

export function dailyReportInput(ctx: RuntimeContext, update: boolean): Record<string, unknown> {
  const payload = optionalJson(ctx, 'payload');
  const useDefaults = payload === undefined;
  return compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    need_csv: useDefaults ? booleanWithDefault(ctx, 'need-csv', false) : optionalBoolean(ctx, 'need-csv'),
    host_url: useDefaults ? stringWithDefault(ctx, 'host-url', '') : optionalString(ctx, 'host-url'),
    enable_smtp: useDefaults ? booleanWithDefault(ctx, 'enable-smtp', false) : optionalBoolean(ctx, 'enable-smtp'),
    enable_email: useDefaults ? booleanWithDefault(ctx, 'enable-email', false) : optionalBoolean(ctx, 'enable-email'),
    enable_dd: useDefaults ? booleanWithDefault(ctx, 'enable-dd', false) : optionalBoolean(ctx, 'enable-dd'),
    enable_wx: useDefaults ? booleanWithDefault(ctx, 'enable-wx', false) : optionalBoolean(ctx, 'enable-wx'),
    enable_feishu: useDefaults ? booleanWithDefault(ctx, 'enable-feishu', false) : optionalBoolean(ctx, 'enable-feishu'),
    send_title: optionalString(ctx, 'send-title'),
    send_content: optionalString(ctx, 'send-content'),
    send_date: useDefaults ? stringWithDefault(ctx, 'send-date', '1,2,3,4,5,6,7') : optionalString(ctx, 'send-date'),
    send_time: useDefaults ? stringWithDefault(ctx, 'send-time', '09:00') : optionalString(ctx, 'send-time'),
    lang: useDefaults ? stringWithDefault(ctx, 'lang', 'zh-CN') : optionalString(ctx, 'lang'),
    screen_type: useDefaults ? stringWithDefault(ctx, 'screen-type', 'normal') : optionalString(ctx, 'screen-type'),
    zone_offset: useDefaults ? numberWithDefault(ctx, 'zone-offset', 0) : optionalNumber(ctx, 'zone-offset'),
    enable_send: update
      ? (useDefaults ? booleanWithDefault(ctx, 'enable-send', false) : optionalBoolean(ctx, 'enable-send'))
      : undefined,
    payload,
  });
}
