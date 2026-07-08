import type { RuntimeContext } from "../framework/types.js";
import { PermissionError } from "./errors.js";
import { getCliToken } from "./cli-token.js";
import { safeJsonParse } from "./json-utils.js";

function buildUrl(
  host: string,
  path: string,
  params: Record<string, any> = {},
): string {
  const base = host.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function parseKbResponse(resp: Response, text: string): any {
  // F-018: 403 = authenticated-but-forbidden (permission/scope), NOT a token/auth failure.
  if (resp.status === 403) {
    let msg = "Permission denied for this resource (HTTP 403)";
    try {
      const d: any = safeJsonParse(text);
      const m =
        d &&
        (typeof d.error === "string" ? d.error : d.error?.message || d.message);
      if (m && typeof m === "string") msg = m;
    } catch {
      /* non-JSON body */
    }
    throw new PermissionError(msg);
  }
  if (resp.status === 401) {
    throw new Error(
      `KB MCP token auth failed: HTTP ${resp.status} ${resp.statusText}`,
    );
  }

  const data = safeJsonParse(text);

  if (data.return_code === -1001) {
    throw new Error(
      `KB MCP token auth failed: ${data.return_message || "unauthorized"} (code: ${data.return_code})`,
    );
  }

  if (data.return_code !== 0 && data.return_code !== undefined) {
    throw new Error(
      `AE API error: ${data.return_message || "unknown"} (code: ${data.return_code})`,
    );
  }

  // F-019: HTTP 200 + body { error: "..." } (no return_code/success) is a business failure
  // (for example, a "team missing or no permission" message), not success; surface it instead of returning ok:true data.
  if (
    data &&
    typeof data === "object" &&
    typeof data.error === "string" &&
    data.error.trim() &&
    data.return_code === undefined &&
    data.success === undefined
  ) {
    throw new Error(data.error);
  }

  return data.data !== undefined ? data.data : data;
}

/**
 * KB external REST calls authenticate with `cli-token` only (see mcp.ts buildAuthHeaders).
 */
async function fetchWithCliToken(
  input: string,
  init: RequestInit,
  cliToken: string,
): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set("cli-token", cliToken);

  const resp = await fetch(input, { ...init, headers });
  return parseKbResponse(resp, await resp.text());
}

export async function getAuthHeaders(
  ctx: RuntimeContext,
): Promise<Record<string, string>> {
  const cliToken = await getCliToken(ctx.host());
  return { "cli-token": cliToken };
}

export async function kbApi(
  ctx: RuntimeContext,
  method: string,
  path: string,
  params: Record<string, any> = {},
  body?: any,
): Promise<any> {
  const host = ctx.host();
  const cliToken = await getCliToken(host);

  const upperMethod = method.toUpperCase();
  return fetchWithCliToken(
    buildUrl(host, path, params),
    {
      method: upperMethod,
      headers: {
        "Content-Type": "application/json",
      },
      body: upperMethod === "GET" ? undefined : JSON.stringify(body ?? {}),
    },
    cliToken,
  );
}

export async function kbUpload(
  ctx: RuntimeContext,
  path: string,
  form: FormData,
  params: Record<string, any> = {},
): Promise<any> {
  const host = ctx.host();
  const cliToken = await getCliToken(host);

  return fetchWithCliToken(
    buildUrl(host, path, params),
    {
      method: "POST",
      body: form,
    },
    cliToken,
  );
}
