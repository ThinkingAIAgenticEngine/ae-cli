import { getToken } from './auth.js';
import { httpGet } from './client.js';
import { safeJsonParse } from './json-utils.js';
import { aeLocaleToCli } from '../tracking/i18n/ae-locale.js';
import type { Locale } from '../tracking/i18n/locale.js';
import type { TEUploadResponse } from '../tracking/plan/fix.js';
import { logger } from './logger.js';

export interface TEProperty {
  name: string;
  displayName?: string;
  type: 'string' | 'number' | 'bool' | 'datetime' | 'object' | 'array_row' | 'array_string';
  desc?: string;
  createTime?: string;
  creator?: string;
  lastUpdateAuth?: string;
  lastUpdateTime?: string;
  hasReported?: boolean;
}

export interface TEUserProperty extends TEProperty {
  propTag?: string;
  updateType: 'user_set' | 'user_setOnce' | 'user_add';
  updateTypeName?: string;
}

export interface TEEvent {
  eventName: string;
  displayName?: string;
  eventDesc?: string;
  eventTag?: string;
  createTime?: string;
  creator?: string;
  lastUpdateAuth?: string;
  lastUpdateTime?: string;
  hasReported?: boolean;
  props: string[];
  propInfosOnEvent?: Array<{ name: string; hasReported?: boolean }>;
}

export interface TEProgram {
  projectId: number;
  createTime?: string;
  events: TEEvent[];
  eventProps: TEProperty[];
  commonEventProps: TEProperty[];
  userProps: TEUserProperty[];
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  lastClearTime?: string;
}

export interface DeviceDataItem {
  [key: string]: unknown;
}

export interface DeviceDataResponse {
  eventList: DeviceDataItem[];
  deviceDataList: DeviceDataItem[];
}

const DEBUG_BASE = '/v1/ta/bury/manage/debug';

interface TEEnvelope<T> {
  return_code: number;
  return_message: string;
  data?: T;
}

function buildUrl(host: string, modulePath: string, params: Record<string, string | number> = {}): string {
  const base = host.replace(/\/$/, '');
  const p = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
  const url = new URL(`${base}${p}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function extractLangFromConfig(data: Record<string, unknown> | null | undefined): Locale | null {
  if (!data) return null;
  const raw =
    (typeof data.lang === 'string' && data.lang) ||
    (typeof data.umi_locale === 'string' && data.umi_locale) ||
    (typeof data.locale === 'string' && data.locale) ||
    null;
  return raw ? aeLocaleToCli(raw) : null;
}

export class TrackingClient {
  constructor(
    private host: string,
    private token?: string,
  ) {}

  private async resolveToken(): Promise<string> {
    return this.token ?? getToken(this.host);
  }

  async getProgram(projectId: number): Promise<TEProgram | null> {
    const data = await httpGet(
      '/v1/ta/bury/manage/program/query',
      { projectId, '@t': Date.now() },
      this.host,
    );
    return (data as TEProgram | null) ?? null;
  }

  async deleteProgram(projectId: number): Promise<{ return_code: number; return_message: string }> {
    const token = await this.resolveToken();
    const url = buildUrl(this.host, '/v1/ta/bury/manage/program/delete', {
      projectId,
      '@t': Date.now(),
    });
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `bearer ${token}`,
        accept: 'application/json',
      },
    });
    const env = safeJsonParse(await resp.text()) as TEEnvelope<unknown>;
    if (env.return_code !== 0) {
      throw new Error(env.return_message || `AE API error (code: ${env.return_code})`);
    }
    return { return_code: env.return_code, return_message: env.return_message };
  }

  async uploadProgramExcel(args: {
    projectId: number;
    file: Buffer;
    filename: string;
  }): Promise<TEUploadResponse> {
    const token = await this.resolveToken();
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(args.file)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      args.filename,
    );
    form.append('projectId', String(args.projectId));
    form.append('access_token', token);

    const url = buildUrl(this.host, '/v1/ta/bury/manage/program/excel-save');
    const resp = await fetch(url, { method: 'POST', body: form });
    const env = safeJsonParse(await resp.text()) as TEUploadResponse;
    if (env.return_code !== 0 && env.return_code !== undefined && !env.data?.eventErrorMap && !env.data?.userErrorMap) {
      logger.error(`Upload failed: ${env.return_message || `AE API error (code: ${env.return_code})`}`);
    }
    return env;
  }

  async getUserAutoConfig(): Promise<Record<string, unknown> | null> {
    const data = await httpGet(
      '/v1/ta/auto/config/getUserAutoConfig',
      { '@t': Date.now() },
      this.host,
    );
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
    return null;
  }

  async getServerLang(): Promise<Locale | null> {
    const config = await this.getUserAutoConfig();
    return extractLangFromConfig(config);
  }

  /** lang format: zh_CN, en_US, ja_JP, ko_KR */
  async saveUserAutoConfig(langCode: string): Promise<void> {
    await httpGet('/v1/ta/auto/config/getUserAutoConfig', { '@t': Date.now(), lang: langCode }, this.host);
  }

  private async debugGet<T>(path: string, params: Record<string, string | number>): Promise<T | undefined> {
    const data = await httpGet(`${DEBUG_BASE}${path}`, { ...params, '@t': Date.now() }, this.host);
    return data as T | undefined;
  }

  async listDevice(projectId: number): Promise<DeviceInfo[]> {
    const data = await this.debugGet<{ deviceList: DeviceInfo[] }>('/listDevice', { projectId });
    return data?.deviceList ?? [];
  }

  async addDevice(projectId: number, deviceId: string, deviceName: string): Promise<void> {
    await this.debugGet('/saveDevice', { deviceId, deviceName, projectId });
  }

  async selectDevice(projectId: number, deviceId: string): Promise<void> {
    await this.debugGet('/chooseDevice', { deviceId, projectId });
  }

  async removeDevice(projectId: number, deviceId: string): Promise<void> {
    await this.debugGet('/deleteDevice', { deviceId, projectId });
  }

  async listDeviceData(
    projectId: number,
    deviceId: string,
    startTime: string,
  ): Promise<DeviceDataResponse> {
    const data = await this.debugGet<DeviceDataResponse>('/listDeviceData', {
      deviceID: deviceId,
      projectId,
      startTime,
    });
    return data ?? { eventList: [], deviceDataList: [] };
  }
}

export async function createTrackingClient(host: string): Promise<TrackingClient> {
  const token = await getToken(host);
  return new TrackingClient(host, token);
}
