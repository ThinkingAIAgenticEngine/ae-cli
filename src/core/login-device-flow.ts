import {
  authorizeDevice,
  DeviceFlowUnsupportedError,
  type DeviceAuthorizeResponse,
  type DeviceAuthProtocol,
} from './device-auth.js';

export interface LoginDeviceSession {
  baseUrl: string;
  protocol: DeviceAuthProtocol;
  authorization: DeviceAuthorizeResponse;
}

/** The legacy base remains callable for supported servers predating UBA device auth. */
export function resolveLegacyLoginBase(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = process.env.TE_CLAUDE_BASE_PATH || '/agent';
  return base.endsWith(basePath) ? base : base + basePath;
}

/** A session is pinned to its original issuer, including split flows across CLI processes. */
export function resolveDeviceSessionRoute(host: string, deviceCode: string): Pick<LoginDeviceSession, 'baseUrl' | 'protocol'> {
  return deviceCode.startsWith('uba_')
    ? { baseUrl: host, protocol: 'uba' }
    : { baseUrl: resolveLegacyLoginBase(host), protocol: 'legacy' };
}

export async function authorizeLoginDevice(host: string): Promise<LoginDeviceSession> {
  try {
    const authorization = await authorizeDevice(host, 'uba');
    if (!/^uba_[A-Za-z0-9_-]+$/.test(authorization.device_code)) {
      throw new Error('UBA authorization returned an unsupported device-code format. Check the server deployment.');
    }
    return { baseUrl: host, protocol: 'uba', authorization };
  } catch (error) {
    // Only a definite missing endpoint identifies a supported legacy deployment.
    if (!(error instanceof DeviceFlowUnsupportedError) || error.httpStatus !== 404) throw error;
    const baseUrl = resolveLegacyLoginBase(host);
    return { baseUrl, protocol: 'legacy', authorization: await authorizeDevice(baseUrl) };
  }
}
