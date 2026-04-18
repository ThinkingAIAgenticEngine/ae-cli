import WebSocket from 'ws';
import { randomBytes } from 'crypto';
import { getToken, clearToken, resolveHost } from './auth.js';
import { extractHostname } from './config.js';
import { safeJsonParse } from './json-utils.js';

function genRequestId(prefix: string): string {
  const rand = randomBytes(4).toString('base64url').slice(0, 8);
  return `${prefix}@@${rand}`;
}

/**
 * Build full API URL from base URL + path.
 * baseUrl: "https://ta.thinkingdata.cn" or "https://ta.thinkingdata.cn:8080"
 * modulePath: "/v1/ta/event/catalog/listEvent"
 */
function buildUrl(baseUrl: string, modulePath: string, params: Record<string, any> = {}): string {
  // Ensure no trailing slash on base, ensure leading slash on path
  const base = baseUrl.replace(/\/$/, '');
  const p = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
  const url = new URL(`${base}${p}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Build WebSocket URL from base URL.
 * Converts https:// → wss://, http:// → ws://
 */
function buildWsUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const wsBase = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  return `${wsBase}/v1/ta-websocket/query/${token}`;
}

async function request(
  method: string,
  modulePath: string,
  params: Record<string, any> = {},
  body: any = null,
  retry = true,
  hostUrl?: string
): Promise<any> {
  const resolvedHost = resolveHost(hostUrl);
  const token = await getToken(resolvedHost);
  const url = buildUrl(resolvedHost, modulePath, params);
  const headers: Record<string, string> = {
    'Authorization': `bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  const resp = await fetch(url, options);

  if ((resp.status === 401 || resp.status === 403) && retry) {
    clearToken(resolvedHost);
    return request(method, modulePath, params, body, false, resolvedHost);
  }

  const data = safeJsonParse(await resp.text());

  if (data.return_code === -1001 && retry) {
    clearToken(resolvedHost);
    return request(method, modulePath, params, body, false, resolvedHost);
  }

  if (data.return_code !== 0 && data.return_code !== undefined) {
    throw new Error(`TE API error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }

  return data.data !== undefined ? data.data : data;
}

export async function httpGet(modulePath: string, params: Record<string, any> = {}, hostUrl?: string): Promise<any> {
  return request('GET', modulePath, params, null, true, hostUrl);
}

export async function httpPost(modulePath: string, params: Record<string, any> = {}, body?: any, hostUrl?: string): Promise<any> {
  return request('POST', modulePath, params, body ?? {}, true, hostUrl);
}

// WebSocket query
async function wsQueryOnce(
  projectId: number,
  requestId: string,
  qp: any,
  eventModel: number,
  options: Record<string, any> = {},
  token: string,
  hostUrl: string,
  timeoutMs = 30000
): Promise<any> {
  const wsUrl = buildWsUrl(hostUrl, token);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket query timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.on('open', () => {
      const payload = {
        requestId,
        projectId,
        eventModel,
        qp: typeof qp === 'string' ? qp : JSON.stringify(qp),
        searchSource: options.searchSource || 'reportQuery',
        querySource: options.querySource || 'single_report',
        contentTranslate: options.contentTranslate !== false,
        ...(options.extra || {}),
      };
      ws.send(JSON.stringify(['data', payload, { channel: 'ta' }]));
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = safeJsonParse(raw.toString());
        if (Array.isArray(msg) && msg.length >= 2) {
          const data = msg[1];
          if (data.requestId === requestId && data.progress === 100) {
            clearTimeout(timer);
            ws.close();
            resolve(data);
          }
        }
      } catch {}
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timer);
    });
  });
}

export async function wsQuery(
  projectId: number,
  requestId: string,
  qp: any,
  eventModel: number,
  options: Record<string, any> = {},
  hostUrl?: string
): Promise<any> {
  const resolvedHost = resolveHost(hostUrl);
  const token = await getToken(resolvedHost);
  try {
    return await wsQueryOnce(projectId, requestId, qp, eventModel, options, token, resolvedHost);
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.includes('403') || msg.includes('auth')) {
      clearToken(resolvedHost);
      const newToken = await getToken(resolvedHost);
      return wsQueryOnce(projectId, requestId, qp, eventModel, options, newToken, resolvedHost);
    }
    throw err;
  }
}

export async function querySql(projectId: number, sql: string, hostUrl?: string): Promise<any> {
  const requestId = genRequestId('sqlIde');
  const qp = {
    events: { sql },
    eventView: { sqlViewParams: [] },
  };
  return wsQuery(projectId, requestId, qp, 10, {
    searchSource: 'sqlIde',
    querySource: 'sqlIde',
  }, hostUrl);
}

export async function queryReportData(
  projectId: number,
  reportId: number,
  qp: any,
  eventModel: number,
  options: Record<string, any> = {},
  hostUrl?: string
): Promise<any> {
  const dashboardId = options.dashboardId || 0;
  const requestId = genRequestId(`${projectId}_${dashboardId}_${reportId}`);
  return wsQuery(projectId, requestId, qp, eventModel, {
    searchSource: options.searchSource || 'model_search',
    querySource: options.querySource || 'module',
    ...options,
  }, hostUrl);
}
