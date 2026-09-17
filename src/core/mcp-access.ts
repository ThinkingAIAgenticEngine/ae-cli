import type { RuntimeContext } from "../framework/types.js";
import { CapabilityGatewayError } from "./capability-api.js";
import { PermissionError } from "./errors.js";
import { getCliToken } from "./cli-token.js";
import { SecureStoreAuthError } from "./secure-store.js";
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

export type KbApiOptions = {
  preserveBusinessErrorCode?: boolean;
  preserveErrorMetadata?: boolean;
  /** Retry one HTTP 401 after re-reading the local CLI token. */
  retryUnauthorized?: boolean;
  responseType?: "bytes" | "empty";
};

class KbUnauthorizedError extends Error {}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function responseReturnCode(data: any): string | undefined {
  const value = data?.return_code;
  if (value === undefined || value === null || value === 0 || value === "0") {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return optionalString(value);
}

function responseErrorMetadata(data: any): { code?: string; hint?: string } {
  const nestedError =
    data?.error && typeof data.error === "object" ? data.error : undefined;
  return {
    code:
      optionalString(data?.errorCode) ??
      optionalString(data?.error_code) ??
      optionalString(data?.code) ??
      optionalString(nestedError?.code) ??
      responseReturnCode(data),
    hint: optionalString(data?.hint) ?? optionalString(nestedError?.hint),
  };
}

function responseErrorMessage(data: any): string | undefined {
  const nestedError =
    data?.error && typeof data.error === "object" ? data.error : undefined;
  return (
    optionalString(typeof data?.error === "string" ? data.error : undefined) ??
    optionalString(nestedError?.message) ??
    optionalString(data?.message) ??
    optionalString(data?.return_message)
  );
}

function responseStatus(resp: Response): string {
  const statusText = optionalString(resp.statusText);
  return statusText ? `${resp.status} ${statusText}` : String(resp.status);
}

function malformedResponseError(
  resp: Response,
  detail: "empty response body" | "non-JSON response",
): Error {
  if (!resp.ok) {
    return new Error(`KB API HTTP error: ${responseStatus(resp)} (${detail})`);
  }
  return new Error(
    `KB API protocol error: HTTP ${responseStatus(resp)} (${detail})`,
  );
}

class KbHttpError extends CapabilityGatewayError {
  constructor(message: string, code: string | undefined, status: number, hint?: string) {
    super(message, code, status, hint);
    // Keep the historical Error identity used by direct KB transport callers while retaining
    // structured metadata for the CLI runner.
    this.name = "Error";
  }
}

function nonOkResponseError(
  resp: Response,
  data: any,
  options: KbApiOptions,
): Error {
  const metadata = responseErrorMetadata(data);
  const serverMessage = responseErrorMessage(data);
  const fallbackMessage = `KB API HTTP error: ${responseStatus(resp)}`;
  const businessCode =
    options.preserveBusinessErrorCode &&
    typeof data?.error === "string" &&
    metadata.code
      ? metadata.code
      : undefined;
  const message = businessCode
    ? `${businessCode}: ${serverMessage ?? fallbackMessage}`
    : (serverMessage ?? fallbackMessage);

  if (options.preserveErrorMetadata !== false && (metadata.code || metadata.hint)) {
    return new KbHttpError(message, metadata.code, resp.status, metadata.hint);
  }
  // A metadata-free 404 is an ordinary KB API miss, not a capability-route miss.
  return new Error(message);
}

export function parseKbResponse(
  resp: Response,
  text: string,
  options: KbApiOptions = {},
): any {
  // F-018: 403 = authenticated-but-forbidden (permission/scope), NOT a token/auth failure.
  if (resp.status === 403) {
    let msg = "Permission denied for this resource (HTTP 403)";
    let metadata: { code?: string; hint?: string } = {};
    try {
      const d: any = safeJsonParse(text);
      const m =
        d &&
        (typeof d.error === "string" ? d.error : d.error?.message || d.message);
      if (m && typeof m === "string") msg = m;
      if (options.preserveErrorMetadata) metadata = responseErrorMetadata(d);
    } catch {
      /* non-JSON body */
    }
    throw new PermissionError(msg, metadata.code, metadata.hint);
  }
  if (resp.status === 401) {
    throw new KbUnauthorizedError(
      `KB API token auth failed: HTTP ${resp.status} ${resp.statusText}`,
    );
  }

  if (!text.trim()) {
    throw malformedResponseError(resp, "empty response body");
  }

  let data: any;
  try {
    data = safeJsonParse(text);
  } catch {
    throw malformedResponseError(resp, "non-JSON response");
  }

  if (data?.return_code === -1001) {
    throw new KbUnauthorizedError(
      `KB API token auth failed: ${data.return_message || "unauthorized"} (code: ${data.return_code})`,
    );
  }

  if (!resp.ok) {
    throw nonOkResponseError(resp, data, options);
  }

  if (data?.return_code !== 0 && data?.return_code !== undefined) {
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
    if (options.preserveErrorMetadata) {
      const metadata = responseErrorMetadata(data);
      throw new CapabilityGatewayError(
        data.error,
        metadata.code,
        resp.status,
        metadata.hint,
      );
    }
    const businessCode =
      options.preserveBusinessErrorCode &&
      typeof data.code === "string" &&
      data.code.trim()
        ? data.code.trim()
        : "";
    throw new Error(businessCode ? `${businessCode}: ${data.error}` : data.error);
  }

  return data?.data !== undefined ? data.data : data;
}

/**
 * KB external REST calls authenticate with `cli-token` only (see mcp.ts buildAuthHeaders).
 */
async function fetchWithCliToken(
  input: string,
  init: RequestInit,
  cliToken: string,
  options: KbApiOptions = {},
): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set("cli-token", cliToken);

  const resp = await fetch(input, { ...init, headers });
  if (options.responseType === "empty" && resp.status === 204) return null;
  if (options.responseType === "bytes" && resp.ok) {
    if (resp.headers.get("content-type")?.includes("application/json")) {
      parseKbResponse(resp, await resp.text(), options);
      throw new Error("KB raw-file protocol error: unexpected JSON response");
    }
    return {
      bytes: new Uint8Array(await resp.arrayBuffer()),
      contentType: resp.headers.get("content-type") ?? "application/octet-stream",
    };
  }
  const result = parseKbResponse(resp, await resp.text(), options);
  if (options.responseType === "empty") {
    throw new Error(`KB API protocol error: expected HTTP 204, received ${resp.status}`);
  }
  return result;
}

async function requestWithCliToken(
  host: string,
  input: string,
  init: RequestInit,
  options: KbApiOptions,
): Promise<any> {
  const originalToken = await getCliToken(host);
  try {
    return await fetchWithCliToken(input, init, originalToken, options);
  } catch (error) {
    if (error instanceof KbUnauthorizedError) {
      if (options.retryUnauthorized === true) {
        const refreshedToken = await getCliToken(host);
        if (refreshedToken !== originalToken) {
          try {
            return await fetchWithCliToken(input, init, refreshedToken, options);
          } catch (retryError) {
            if (!(retryError instanceof KbUnauthorizedError)) throw retryError;
          }
        }
      }
      throw new SecureStoreAuthError(
        `The stored CLI token for ${host} is invalid or expired. Run: ae-cli auth login --host ${host}`,
      );
    }
    throw error;
  }
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
  options: KbApiOptions = {},
): Promise<any> {
  const host = ctx.host();

  const upperMethod = method.toUpperCase();
  return requestWithCliToken(
    host,
    buildUrl(host, path, params),
    {
      method: upperMethod,
      headers: {
        "Content-Type": "application/json",
      },
      body: upperMethod === "GET" ? undefined : JSON.stringify(body ?? {}),
    },
    options,
  );
}

export async function kbUpload(
  ctx: RuntimeContext,
  path: string,
  form: FormData,
  params: Record<string, any> = {},
  options: KbApiOptions & { method?: "POST" | "PUT" } = {},
): Promise<any> {
  const host = ctx.host();
  const uploadOptions = { preserveErrorMetadata: false, ...options };

  return requestWithCliToken(
    host,
    buildUrl(host, path, params),
    {
      method: options.method ?? "POST",
      body: form,
    },
    uploadOptions,
  );
}
