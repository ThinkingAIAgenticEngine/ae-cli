import fs from 'fs';
import path from 'path';
import { safeReadJsonFile } from './json-utils.js';
import { logger } from './logger.js';
import { getSandboxClusterInfoFilePath } from './sandbox-runtime.js';

export const GLOBAL_QUERY_CONFIG_KEY = 'sw_cfg_enable_global_query';
const CLUSTER_INFO_FILE_ENV = 'AE_CLUSTER_INFO_FILE';

export interface ClusterInfo {
  [GLOBAL_QUERY_CONFIG_KEY]?: boolean;
}

export function getClusterInfoFilePath(): string {
  return process.env[CLUSTER_INFO_FILE_ENV] || getSandboxClusterInfoFilePath();
}

export function loadClusterInfo(): ClusterInfo {
  const file = getClusterInfoFilePath();
  try {
    if (!fs.existsSync(file)) {
      return {};
    }
    const raw = safeReadJsonFile(file);
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (err: any) {
    logger.warn(`Failed to load cluster info from ${file}: ${err.message}`);
    return {};
  }
}

export function isGlobalQueryModeEnabled(): boolean {
  return loadClusterInfo()[GLOBAL_QUERY_CONFIG_KEY] === true;
}

export function setGlobalQueryModeEnabled(enabled: boolean): ClusterInfo {
  const file = getClusterInfoFilePath();
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const next: ClusterInfo = { [GLOBAL_QUERY_CONFIG_KEY]: enabled };
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  return next;
}

export function getAnalysisMappingPathForClusterMode(enabled = isGlobalQueryModeEnabled()): string {
  return enabled ? 'analysis-global' : 'analysis';
}
