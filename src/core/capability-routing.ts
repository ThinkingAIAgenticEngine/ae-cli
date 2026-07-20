/**
 * CLI service name → capability gateway component routing.
 *
 * CLI 呈现域（ae-cli metadata ...）与 HTTP 路由域（/api/cli/<gatewayDomain>/v1/...）解耦：
 * 多个 CLI 域可映射到同一后端组件（如 analysis）。
 * gatewayDomain 为空字符串时，直连 root gateway：/api/cli/v1/...
 */

export interface CapabilityGatewayRoute {
  /** nginx /api/cli/<gatewayDomain>/v1/... 路由段；空字符串表示 /api/cli/v1/... */
  gatewayDomain: string;
}

const cliServiceRoutes = new Map<string, CapabilityGatewayRoute>();

function envGatewayDomain(cliService: string): string | undefined {
  const normalized = cliService.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const serviceKey = `AE_CLI_CAPABILITY_GATEWAY_DOMAIN_${normalized}`;
  if (Object.prototype.hasOwnProperty.call(process.env, serviceKey)) {
    return process.env[serviceKey] ?? '';
  }
  if (Object.prototype.hasOwnProperty.call(process.env, 'AE_CLI_CAPABILITY_GATEWAY_DOMAIN')) {
    return process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN ?? '';
  }
  return undefined;
}

export function registerCapabilityGatewayRoute(
  cliService: string,
  route: CapabilityGatewayRoute,
): void {
  cliServiceRoutes.set(cliService, route);
}

export function findGatewayDomain(cliService: string): string | undefined {
  return cliServiceRoutes.get(cliService)?.gatewayDomain;
}

/**
 * Resolve gateway route domain for a CLI service.
 * Priority: env (`AE_CLI_CAPABILITY_GATEWAY_DOMAIN[_SERVICE]`) > call-site override > registered route.
 * Empty env value means root gateway `/api/cli/v1` (direct Hermes without nginx domain segment).
 */
export function resolveGatewayDomain(cliService: string, override?: string): string {
  // Env must win over call-site override: engage-* commands always pass gatewayDomain:'engage',
  // which would otherwise make AE_CLI_CAPABILITY_GATEWAY_DOMAIN= unusable for local Hermes.
  const envDomain = envGatewayDomain(cliService);
  if (envDomain !== undefined) {
    return envDomain;
  }
  if (override !== undefined) {
    return override;
  }
  const route = cliServiceRoutes.get(cliService);
  if (!route) {
    throw new Error(
      `Capability gateway route not registered for CLI service '${cliService}'. ` +
        `Call registerCapabilityGatewayRoute() in commands/${cliService}/index.ts.`,
    );
  }
  return route.gatewayDomain;
}

/** @internal Test helper */
export function clearCapabilityGatewayRoutesForTest(): void {
  cliServiceRoutes.clear();
}
