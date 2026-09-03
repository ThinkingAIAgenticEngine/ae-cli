import { promises as fs } from "node:fs";
import path from "node:path";

import { CapabilityGatewayError } from "../../core/capability-api.js";
import { kbUpload } from "../../core/mcp-access.js";
import type { Command, RuntimeContext } from "../../framework/types.js";

const API_PATH = "/agent/api/external/knowledge-bases/import";
const MAX_SNAPSHOT_ARCHIVE_BYTES = 50 * 1024 * 1024;

function normalizeTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error(
      '--tags must be a JSON array of strings, e.g. \'["docs","product"]\'',
    );
  }
  const tags: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") {
      throw new Error(
        `--tags entries must be strings (got: ${JSON.stringify(value)})`,
      );
    }
    const tag = value.trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > 2) throw new Error("--tags accepts at most 2 unique tags");
  if (tags.some((tag) => tag.length > 15)) {
    throw new Error("--tags entries must be at most 15 characters");
  }
  return tags;
}

function validateArchivePath(filePath: string): void {
  if (path.extname(filePath).toLocaleLowerCase("en-US") !== ".zip") {
    throw new Error("--file must point to a .zip archive");
  }
}

async function readArchive(
  filePath: string,
): Promise<{ absolutePath: string; bytes: Buffer }> {
  validateArchivePath(filePath);
  const absolutePath = path.resolve(filePath);
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
  if (!stat.isFile())
    throw new Error(`--file must point to a file: ${filePath}`);
  if (stat.size === 0) throw new Error(`ZIP archive is empty: ${filePath}`);
  if (stat.size > MAX_SNAPSHOT_ARCHIVE_BYTES) {
    throw new Error("--file must not exceed 50 MB");
  }
  return { absolutePath, bytes: await fs.readFile(absolutePath) };
}

function appendOptionalFields(ctx: RuntimeContext, form: FormData): void {
  const description = ctx.str("description").trim();
  if (description) form.append("description", description);
  for (const tag of normalizeTags(ctx.json("tags"))) form.append("tags", tag);
  const projectId = ctx.str("project-id").trim();
  if (projectId) form.append("projectId", projectId);
}

export const importSnapshot: Command = {
  service: "kb",
  command: "+import",
  description:
    "Import a compiled Markdown ZIP snapshot as a personal read-only knowledge base.",
  flags: [
    {
      name: "file",
      type: "string",
      required: true,
      desc: "Local .zip snapshot containing root index.md and wiki/**/*.md",
    },
    {
      name: "name",
      type: "string",
      required: true,
      maxLength: 30,
      desc: "Personal knowledge base name (max 30 characters)",
    },
    {
      name: "description",
      type: "string",
      required: false,
      maxLength: 200,
      desc: "Optional description (max 200 characters)",
    },
    {
      name: "tags",
      type: "json",
      required: false,
      desc: "Optional JSON array of tags (max 2, each max 15 characters)",
    },
    {
      name: "project-id",
      type: "string",
      required: false,
      maxLength: 128,
      desc: "Optional project ID to bind",
    },
  ],
  risk: "write",
  validate: (ctx) => {
    validateArchivePath(ctx.str("file"));
    normalizeTags(ctx.json("tags"));
  },
  execute: async (ctx) => {
    const archive = await readArchive(ctx.str("file"));
    const form = new FormData();
    form.append(
      "file",
      new Blob([Uint8Array.from(archive.bytes)], { type: "application/zip" }),
      path.basename(archive.absolutePath),
    );
    form.append("name", ctx.str("name").trim());
    appendOptionalFields(ctx, form);
    try {
      return await kbUpload(
        ctx,
        API_PATH,
        form,
        {},
        { preserveErrorMetadata: true, retryUnauthorized: true },
      );
    } catch (error) {
      const hint =
        "If a requestId was returned, run ae-cli kb +import-status --request-id <requestId>; otherwise run ae-cli kb +list before retrying the same name.";
      if (error instanceof CapabilityGatewayError) {
        throw new CapabilityGatewayError(
          `${error.message} ${hint}`,
          error.code,
          error.httpStatus,
          error.hint ?? hint,
          error.meta,
        );
      }
      if (error instanceof Error) {
        error.message = `${error.message} ${hint}`;
        throw error;
      }
      throw new Error(`${String(error)} ${hint}`);
    }
  },
};
