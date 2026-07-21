import { clearCliToken, getCliToken } from './cli-token.js';
import { executeCapability, uploadInputFileBytes } from './capability-api.js';
import { safeJsonParse } from './json-utils.js';
import type { TEUploadError, TEUploadResponse } from '../tracking/plan/fix.js';
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
const TRACK_LOCAL_HOST = 'http://localhost:8992';
const TRACK_CAPABILITY_DOMAIN = 'analysis';
const TRACK_PROGRAM_QUERY = 'track.program.query';
const TRACK_PROGRAM_DELETE = 'track.program.delete';
const TRACK_PROGRAM_EXCEL_SAVE = 'track.program.excel_save';
const TRACK_PROGRAM_XLSX_PURPOSE = 'track.program.xlsx';

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

function record(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
}

function pick<T = unknown>(source: Record<string, any>, camelKey: string, snakeKey: string): T | undefined {
  return (source[camelKey] ?? source[snakeKey]) as T | undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapArray<T>(value: unknown, mapper: (item: Record<string, any>) => T): T[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is Record<string, any> => item !== null).map(mapper) : [];
}

function normalizeProperty(value: Record<string, any>): TEProperty {
  return {
    name: value.name,
    displayName: pick<string>(value, 'displayName', 'display_name'),
    type: value.type,
    desc: value.desc,
    createTime: pick<string>(value, 'createTime', 'create_time'),
    creator: value.creator,
    lastUpdateAuth: pick<string>(value, 'lastUpdateAuth', 'last_update_auth'),
    lastUpdateTime: pick<string>(value, 'lastUpdateTime', 'last_update_time'),
    hasReported: pick<boolean>(value, 'hasReported', 'has_reported'),
  };
}

function normalizeUserProperty(value: Record<string, any>): TEUserProperty {
  return {
    ...normalizeProperty(value),
    propTag: pick<string>(value, 'propTag', 'prop_tag'),
    updateType: pick<TEUserProperty['updateType']>(value, 'updateType', 'update_type') ?? 'user_set',
    updateTypeName: pick<string>(value, 'updateTypeName', 'update_type_name'),
  };
}

function normalizeEvent(value: Record<string, any>): TEEvent {
  return {
    eventName: pick<string>(value, 'eventName', 'event_name') ?? '',
    displayName: pick<string>(value, 'displayName', 'display_name'),
    eventDesc: pick<string>(value, 'eventDesc', 'event_desc'),
    eventTag: pick<string>(value, 'eventTag', 'event_tag'),
    createTime: pick<string>(value, 'createTime', 'create_time'),
    creator: value.creator,
    lastUpdateAuth: pick<string>(value, 'lastUpdateAuth', 'last_update_auth'),
    lastUpdateTime: pick<string>(value, 'lastUpdateTime', 'last_update_time'),
    hasReported: pick<boolean>(value, 'hasReported', 'has_reported'),
    props: stringArray(value.props),
    propInfosOnEvent: pick<Array<{ name: string; hasReported?: boolean }>>(value, 'propInfosOnEvent', 'prop_infos_on_event'),
  };
}

function normalizeProgram(value: unknown): TEProgram | null {
  const data = record(value);
  if (!data) return null;
  return {
    projectId: pick<number>(data, 'projectId', 'project_id') ?? 0,
    createTime: pick<string>(data, 'createTime', 'create_time'),
    events: mapArray(data.events, normalizeEvent),
    eventProps: mapArray(pick(data, 'eventProps', 'event_props'), normalizeProperty),
    commonEventProps: mapArray(pick(data, 'commonEventProps', 'common_event_props'), normalizeProperty),
    userProps: mapArray(pick(data, 'userProps', 'user_props'), normalizeUserProperty),
  };
}

function normalizeUploadError(value: Record<string, any>): TEUploadError {
  return {
    errorType: pick<string>(value, 'errorType', 'error_type') ?? '',
    errorTypeDesc: pick<string>(value, 'errorTypeDesc', 'error_type_desc') ?? '',
    cellName: pick<string>(value, 'cellName', 'cell_name') ?? '',
    row: Number(value.row ?? 0),
    value: String(value.value ?? ''),
  };
}

function normalizeUploadErrorMap(value: unknown): Record<string, TEUploadError[]> | undefined {
  const data = record(value);
  if (!data) return undefined;
  const result: Record<string, TEUploadError[]> = {};
  for (const [key, items] of Object.entries(data)) {
    result[key] = mapArray(items, normalizeUploadError);
  }
  return result;
}

function normalizeUploadResponse(value: unknown): TEUploadResponse {
  const data = record(value);
  if (!data) return { return_code: 0, return_message: 'success' };

  const responseData = record(data.data);
  const uploadErrors =
    record(pick(data, 'uploadErrors', 'upload_errors')) ??
    record(pick(responseData ?? {}, 'uploadErrors', 'upload_errors'));
  const errorSource = uploadErrors ?? responseData ?? data;
  const eventErrorMap = normalizeUploadErrorMap(pick(errorSource, 'eventErrorMap', 'event_error_map'));
  const userErrorMap = normalizeUploadErrorMap(pick(errorSource, 'userErrorMap', 'user_error_map'));
  const hasErrors = Boolean(
    (eventErrorMap && Object.keys(eventErrorMap).length > 0) ||
    (userErrorMap && Object.keys(userErrorMap).length > 0),
  );
  return {
    return_code: typeof data.return_code === 'number' ? data.return_code : 0,
    return_message: typeof data.return_message === 'string' ? data.return_message : (hasErrors ? 'validation errors' : 'success'),
    data: hasErrors ? { eventErrorMap, userErrorMap } : undefined,
  };
}

export class TrackingClient {
  constructor(
    private host: string,
    private cliToken?: string,
  ) {}

  private async resolveCliToken(): Promise<string> {
    return this.cliToken ?? getCliToken(this.host);
  }

  private async requestJson<T>(
    modulePath: string,
    params: Record<string, string | number> = {},
    body?: unknown,
    method: 'GET' | 'POST' = body === undefined ? 'GET' : 'POST',
    retry = true,
  ): Promise<T | undefined> {
    const token = await this.resolveCliToken();
    const url = buildUrl(this.host, modulePath, params);
    const headers: Record<string, string> = {
      'cli-token': token,
      accept: 'application/json',
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== 'GET') {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const resp = await fetch(url, init);
    const env = safeJsonParse(await resp.text()) as TEEnvelope<T>;
    logger.api(method, url, resp.status, body, env);

    if (resp.status === 401 && retry) {
      clearCliToken(this.host);
      this.cliToken = await getCliToken(this.host);
      return this.requestJson(modulePath, params, body, method, false);
    }
    if (resp.status === 403) {
      throw new Error(env?.return_message || 'Permission denied');
    }
    if (!resp.ok) {
      throw new Error(`AE API HTTP error: ${resp.status} ${resp.statusText}`);
    }
    if (env?.return_code === -1001 && retry) {
      clearCliToken(this.host);
      this.cliToken = await getCliToken(this.host);
      return this.requestJson(modulePath, params, body, method, false);
    }
    if (env?.return_code !== 0 && env?.return_code !== undefined) {
      throw new Error(env.return_message || `AE API error (code: ${env.return_code})`);
    }
    return env?.data;
  }

  async getProgram(projectId: number): Promise<TEProgram | null> {
    const data = await executeCapability(this.host, TRACK_CAPABILITY_DOMAIN, TRACK_PROGRAM_QUERY, {
      project_id: projectId,
    });
    return normalizeProgram(data);
  }

  async deleteProgram(projectId: number): Promise<{ return_code: number; return_message: string }> {
    await executeCapability(this.host, TRACK_CAPABILITY_DOMAIN, TRACK_PROGRAM_DELETE, {
      project_id: projectId,
    });
    return { return_code: 0, return_message: 'success' };
  }

  async uploadProgramExcel(args: {
    projectId: number;
    file: Buffer;
    filename: string;
    lang?: string;
    retry?: boolean;
  }): Promise<TEUploadResponse> {
    const inputFile = await uploadInputFileBytes(
      this.host,
      TRACK_CAPABILITY_DOMAIN,
      args.projectId,
      TRACK_PROGRAM_XLSX_PURPOSE,
      args.file,
      args.filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const inputFileId = inputFile?.input_file_id ?? inputFile?.inputFileId ?? inputFile?.id;
    if (!inputFileId) {
      throw new Error('Capability gateway input-file upload did not return input_file_id');
    }
    const data = await executeCapability(this.host, TRACK_CAPABILITY_DOMAIN, TRACK_PROGRAM_EXCEL_SAVE, {
      project_id: args.projectId,
      input_file_id: inputFileId,
      ...(args.lang ? { lang: args.lang } : {}),
    });
    const env = normalizeUploadResponse(data);
    if (env.return_code !== 0 && env.return_code !== undefined && !env.data?.eventErrorMap && !env.data?.userErrorMap) {
      logger.error(`Upload failed: ${env.return_message || `AE API error (code: ${env.return_code})`}`);
    }
    return env;
  }

  private async debugGet<T>(path: string, params: Record<string, string | number>): Promise<T | undefined> {
    const data = await this.requestJson<T>(`${DEBUG_BASE}${path}`, { ...params, '@t': Date.now() });
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
  return new TrackingClient(host || TRACK_LOCAL_HOST);
}
