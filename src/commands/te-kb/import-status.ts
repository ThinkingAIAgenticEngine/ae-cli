import { kbApi } from "../../core/mcp-access.js";
import { CapabilityGatewayError } from "../../core/capability-api.js";
import type { Command } from "../../framework/types.js";

const API_PATH = "/agent/api/external/knowledge-bases/import";
const MAX_REQUEST_ID_LENGTH = 191;

type ImportTaskResponse = {
  requestId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  knowledgeBaseId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function requestIdFrom(ctx: { str: (name: string) => string }): string {
  return ctx.str("request-id").trim();
}

export const importStatus: Command = {
  service: "kb",
  command: "+import-status",
  description:
    "Query one asynchronous knowledge-base snapshot import by its request ID without polling.",
  flags: [
    {
      name: "request-id",
      type: "string",
      required: true,
      minLength: 1,
      maxLength: MAX_REQUEST_ID_LENGTH,
      desc: "The requestId returned by kb +import.",
    },
  ],
  risk: "read",
  validate: (ctx) => {
    const requestId = requestIdFrom(ctx);
    if (!requestId) throw new Error("Invalid --request-id: must be non-empty.");
    if (requestId.length > MAX_REQUEST_ID_LENGTH) {
      throw new Error(
        `Invalid --request-id length: ${requestId.length}. Must be at most ${MAX_REQUEST_ID_LENGTH} characters.`,
      );
    }
  },
  dryRun: (ctx) => ({
    method: "GET",
    url: `${ctx.host().replace(/\/$/, "")}${API_PATH}?requestId=${encodeURIComponent(requestIdFrom(ctx))}`,
  }),
  execute: async (ctx) => {
    try {
      return (await kbApi(
        ctx,
        "GET",
        API_PATH,
        { requestId: requestIdFrom(ctx) },
        undefined,
        { preserveErrorMetadata: true, retryUnauthorized: true },
      )) as ImportTaskResponse;
    } catch (error) {
      if (!(error instanceof CapabilityGatewayError) || error.hint) throw error;
      throw new CapabilityGatewayError(
        error.message,
        error.code,
        error.httpStatus,
        "Verify the request ID and that the server supports kb +import-status. Do not retry the import until its status is known.",
        error.meta,
      );
    }
  },
};
