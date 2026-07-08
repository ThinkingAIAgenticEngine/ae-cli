/**
 * CLI service name → capability gateway component routing.
 *
 * CLI 呈现域（ae-cli metadata ...）与 HTTP 路由域（/api/cli/<gatewayDomain>/v1/...）解耦：
 * 多个 CLI 域可映射到同一后端组件（如 analysis）。
 */

export interface CapabilityGatewayRoute {
  /** nginx /api/cli/<gatewayDomain>/v1/... 路由段，对应后端组件名 */
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
  if (override) {
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
