import {
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  CapabilityGatewayError,
  type CapabilityApiMethod,
} from "../../core/capability-api.js";
import type { RuntimeContext } from "../../framework/types.js";
import { PermissionError } from "../../core/errors.js";
import { resolveMemoryApiBaseUrl } from "../memory/cli-client.js";

export function thingsUrl(ctx: RuntimeContext, path: string) {
  return buildCapabilityGatewayUrl(
    resolveMemoryApiBaseUrl(ctx.host()),
    "things",
    path,
    {},
    "v1",
  );
}

/** Transitional TE REST transport; authorization never falls back to cookies. */
export async function requestThings<T>(
  ctx: RuntimeContext,
  method: CapabilityApiMethod,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  try {
    return await callCapabilityApi(ctx.host(), "things", path, method, body, {
      apiBaseUrl: resolveMemoryApiBaseUrl(ctx.host()),
      apiVersion: "v1",
      includeClientContextInBody: false,
      retryOnInvalidTokenForbidden: false,
    });
  } catch (error) {
    if (error instanceof PermissionError)
      throw new PermissionError(
        "You cannot access this workspace thing.",
        error.code,
      );
    if (error instanceof CapabilityGatewayError) {
      const messages: Record<string, string> = {
        THING_VERSION_CONFLICT:
          "The thing changed. Read it again and submit the current expected version.",
        THING_TARGET_CONFLICT:
          "The requested target conflicts with the conversation or execution.",
        THING_CONTEXT_UNAVAILABLE:
          "The execution snapshot is missing or invalid. Start a new execution; do not fall back to live context.",
        THING_ASSET_UNAVAILABLE:
          "A referenced file is missing or cannot be verified. Restore it or update the thing references.",
        THING_TARGET_REQUIRED:
          "Specify --agent-space-id or run inside a Web Agent conversation.",
        THING_NOT_FOUND:
          "The thing does not exist or is not accessible in this space.",
        THING_READ_ONLY:
          "The requested resource is read-only and cannot be modified.",
        THING_COMMAND_CONFLICT:
          "The command ID was already used with different input.",
        THING_INVALID_INPUT:
          "Invalid thing input. Check identifiers, fields and limits.",
      };
      throw new CapabilityGatewayError(
        messages[error.code ?? ""] ??
          "Workspace thing request failed. Inspect the error code.",
        error.code,
        error.httpStatus,
      );
    }
    throw error;
  }
}
