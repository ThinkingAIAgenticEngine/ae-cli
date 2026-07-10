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
  const falseDefault = update ? ' Default: false.' : '';
  const emptyDefault = update ? ' Default: empty.' : '';
  const weekdayDefault = update ? ' Default: 1,2,3,4,5,6,7.' : '';
  const timeDefault = update ? ' Default: 09:00.' : '';
  const langDefault = update ? ' Default: zh-CN.' : '';
  const screenDefault = update ? ' Default: normal.' : '';
  const zoneDefault = update ? ' Default: 0.' : '';
  return [
    { name: 'need-csv', type: 'boolean', required: false, desc: `Whether to include CSV attachment.${falseDefault}` },
    { name: 'host-url', type: 'string', required: false, desc: `Public host URL used in report links.${emptyDefault}` },
    { name: 'enable-smtp', type: 'boolean', required: false, desc: `Whether to use configured SMTP for email.${falseDefault}` },
    { name: 'enable-email', type: 'boolean', required: false, desc: `Whether to send by email.${falseDefault}` },
    { name: 'enable-dd', type: 'boolean', required: false, desc: `Whether to send by DingTalk webhook.${falseDefault}` },
    { name: 'dd-url', type: 'json', required: false, desc: 'DingTalk webhook URL array, e.g. ["https://..."].' },
    { name: 'enable-wx', type: 'boolean', required: false, desc: `Whether to send by WeCom webhook.${falseDefault}` },
    { name: 'wx-url', type: 'json', required: false, desc: 'WeCom webhook URL array, e.g. ["https://..."].' },
    { name: 'enable-feishu', type: 'boolean', required: false, desc: `Whether to send by Feishu webhook.${falseDefault}` },
    { name: 'feishu-info', type: 'json', required: false, desc: 'Feishu config object, e.g. {"webhook":["https://..."]}.' },
    { name: 'enable-kim', type: 'boolean', required: false, desc: `Whether to send by KIM/custom webhook.${falseDefault}` },
    { name: 'kim-url', type: 'json', required: false, desc: 'KIM/custom webhook URL array, e.g. ["https://..."].' },
    { name: 'enable-slack', type: 'boolean', required: false, desc: `Whether to send by Slack webhook.${falseDefault}` },
    { name: 'slack-url', type: 'json', required: false, desc: 'Slack webhook URL array, e.g. ["https://..."].' },
    { name: 'email-login-users', type: 'string', required: false, desc: 'Comma-separated login users for email channel.' },
    { name: 'email-new', type: 'string', required: false, desc: 'Comma-separated external emails when SMTP is enabled.' },
    { name: 'send-title', type: 'string', required: false, desc: 'Daily report title.' },
    { name: 'send-content', type: 'string', required: false, desc: 'Daily report content.' },
    { name: 'send-date', type: 'string', required: false, desc: `Scheduled weekdays, comma-separated 1..7.${weekdayDefault}` },
    { name: 'send-time', type: 'string', required: false, desc: `Scheduled send time, HH:mm.${timeDefault}` },
    { name: 'lang', type: 'string', required: false, desc: `Report language.${langDefault}` },
    { name: 'screen-type', type: 'string', required: false, desc: `Screenshot screen type.${screenDefault}` },
    { name: 'zone-offset', type: 'number', required: false, desc: `Time zone offset.${zoneDefault}` },
    ...(update ? [
      { name: 'enable-send', type: 'boolean', required: false, desc: 'Whether to enable scheduled sending. Default: false.' },
    ] as Flag[] : []),
  ];
}

export function dailyReportInput(ctx: RuntimeContext, update: boolean): Record<string, unknown> {
  const payload = optionalJson(ctx, 'payload');
  const useDefaults = update && payload === undefined;
  return compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    need_csv: useDefaults ? booleanWithDefault(ctx, 'need-csv', false) : optionalBoolean(ctx, 'need-csv'),
    host_url: useDefaults ? stringWithDefault(ctx, 'host-url', '') : optionalString(ctx, 'host-url'),
    enable_smtp: useDefaults ? booleanWithDefault(ctx, 'enable-smtp', false) : optionalBoolean(ctx, 'enable-smtp'),
    enable_email: useDefaults ? booleanWithDefault(ctx, 'enable-email', false) : optionalBoolean(ctx, 'enable-email'),
    enable_dd: useDefaults ? booleanWithDefault(ctx, 'enable-dd', false) : optionalBoolean(ctx, 'enable-dd'),
    dd_url: optionalJson(ctx, 'dd-url'),
    enable_wx: useDefaults ? booleanWithDefault(ctx, 'enable-wx', false) : optionalBoolean(ctx, 'enable-wx'),
    wx_url: optionalJson(ctx, 'wx-url'),
    enable_feishu: useDefaults ? booleanWithDefault(ctx, 'enable-feishu', false) : optionalBoolean(ctx, 'enable-feishu'),
    feishu_info: optionalJson(ctx, 'feishu-info'),
    enable_kim: useDefaults ? booleanWithDefault(ctx, 'enable-kim', false) : optionalBoolean(ctx, 'enable-kim'),
    kim_url: optionalJson(ctx, 'kim-url'),
    enable_slack: useDefaults ? booleanWithDefault(ctx, 'enable-slack', false) : optionalBoolean(ctx, 'enable-slack'),
    slack_url: optionalJson(ctx, 'slack-url'),
    email_login_users: optionalString(ctx, 'email-login-users'),
    email_new: optionalString(ctx, 'email-new'),
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
