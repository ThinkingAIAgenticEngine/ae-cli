import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectInput,
} from '../capability-shared.js';

const commonFlags: Flag[] = [
  { name: 'need-csv', type: 'boolean', required: false, desc: 'Whether to include CSV attachment.' },
  { name: 'host-url', type: 'string', required: false, desc: 'Public host URL used in report links.' },
  { name: 'send-title', type: 'string', required: false, desc: 'Daily report title.' },
  { name: 'send-content', type: 'string', required: false, desc: 'Daily report content.' },
  { name: 'lang', type: 'string', required: false, desc: 'Report language.' },
  { name: 'screen-type', type: 'string', required: false, desc: 'Screenshot screen type.' },
  { name: 'zone-offset', type: 'number', required: false, desc: 'Time zone offset.' },
];

const destinationFlags: Flag[] = [
  { name: 'email-login-users', type: 'string', required: false, desc: 'Comma-separated login users for email.' },
  {
    name: 'email-new',
    type: 'string',
    required: false,
    sensitive: true,
    desc: 'Comma-separated direct email addresses. The server selects company SMTP or the default mail service.',
  },
  {
    name: 'dd-url',
    type: 'json',
    required: false,
    sensitive: true,
    desc: 'DingTalk webhook URL array, e.g. ["https://..."].',
  },
  {
    name: 'wx-url',
    type: 'json',
    required: false,
    sensitive: true,
    desc: 'WeCom webhook URL array, e.g. ["https://..."].',
  },
  {
    name: 'feishu-info',
    type: 'json',
    required: false,
    sensitive: true,
    desc: 'Feishu image upload and bot config, e.g. {"app_id":"cli_xxx","app_secret":"secret_xxx","webhook":["https://..."]}.',
  },
  {
    name: 'kim-url',
    type: 'json',
    required: false,
    sensitive: true,
    desc: 'KIM/custom webhook URL array, e.g. ["https://..."].',
  },
  {
    name: 'slack-url',
    type: 'json',
    required: false,
    sensitive: true,
    desc: 'Slack webhook URL array, e.g. ["https://..."].',
  },
];

export function dailyReportUpdateFlags(): Flag[] {
  return [
    ...commonFlags,
    { name: 'enable-email', type: 'boolean', required: false, desc: 'Whether scheduled email delivery is enabled.' },
    { name: 'enable-dd', type: 'boolean', required: false, desc: 'Whether scheduled DingTalk delivery is enabled.' },
    { name: 'enable-wx', type: 'boolean', required: false, desc: 'Whether scheduled WeCom delivery is enabled.' },
    { name: 'enable-feishu', type: 'boolean', required: false, desc: 'Whether scheduled Feishu delivery is enabled.' },
    { name: 'enable-kim', type: 'boolean', required: false, desc: 'Whether scheduled KIM delivery is enabled.' },
    { name: 'enable-slack', type: 'boolean', required: false, desc: 'Whether scheduled Slack delivery is enabled.' },
    ...destinationFlags,
    { name: 'send-date', type: 'string', required: false, desc: 'Scheduled weekdays, comma-separated 1..7.' },
    { name: 'send-time', type: 'string', required: false, desc: 'Scheduled send time, HH:mm.' },
    { name: 'enable-send', type: 'boolean', required: false, desc: 'Whether scheduled sending is enabled.' },
  ];
}

export function dailyReportSendFlags(): Flag[] {
  return [...commonFlags, ...destinationFlags];
}

function commonInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    need_csv: optionalBoolean(ctx, 'need-csv'),
    host_url: optionalString(ctx, 'host-url'),
    email_login_users: optionalString(ctx, 'email-login-users'),
    email_new: optionalString(ctx, 'email-new'),
    dd_url: optionalJson(ctx, 'dd-url'),
    wx_url: optionalJson(ctx, 'wx-url'),
    feishu_info: optionalJson(ctx, 'feishu-info'),
    kim_url: optionalJson(ctx, 'kim-url'),
    slack_url: optionalJson(ctx, 'slack-url'),
    send_title: optionalString(ctx, 'send-title'),
    send_content: optionalString(ctx, 'send-content'),
    lang: optionalString(ctx, 'lang'),
    screen_type: optionalString(ctx, 'screen-type'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
  };
}

export function dailyReportUpdateInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...commonInput(ctx),
    enable_email: optionalBoolean(ctx, 'enable-email'),
    enable_dd: optionalBoolean(ctx, 'enable-dd'),
    enable_wx: optionalBoolean(ctx, 'enable-wx'),
    enable_feishu: optionalBoolean(ctx, 'enable-feishu'),
    enable_kim: optionalBoolean(ctx, 'enable-kim'),
    enable_slack: optionalBoolean(ctx, 'enable-slack'),
    send_date: optionalString(ctx, 'send-date'),
    send_time: optionalString(ctx, 'send-time'),
    enable_send: optionalBoolean(ctx, 'enable-send'),
    payload: optionalJson(ctx, 'payload'),
  });
}

export function dailyReportSendInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...commonInput(ctx),
    payload: optionalJson(ctx, 'payload'),
  });
}
