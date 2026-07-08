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

export function registerCapabilityGatewayRoute(
  cliService: string,
  route: CapabilityGatewayRoute,
): void {
  cliServiceRoutes.set(cliService, route);
}

export function resolveGatewayDomain(cliService: string, override?: string): string {
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
