/**
 * ae-cli agent Skill 内容与资产管理命令（第二步：能力补齐）
 *
 * +edit-skill              — 编辑 Skill 内容（名称/描述/指令/图标）
 * +get-skill-content       — 读取 Skill 的 SKILL.md 文本内容
 * +list-skill-assets       — 列出 assets 目录文件
 * +upload-skill-asset      — 上传单个 asset 文件
 * +read-skill-asset        — 读取 asset 原始二进制内容
 * +del-skill-asset         — 删除 asset 文件
 * +list-skill-references   — list files in the references directory
 * +upload-skill-reference  — upload one reference file
 * +read-skill-reference    — 读取 reference 原始内容
 * +del-skill-reference     — 删除 reference 文件
 * +list-skill-scripts      — 列出 scripts 目录文件
 * +upload-skill-script     — 上传单个 script 文件
 * +read-skill-script       — 读取 script 原始二进制内容
 * +del-skill-script        — 删除 script 文件
 * +upload-skill            — 上传 ZIP 格式 Skill
 * +rescan-skills           — 重新扫描同步 Skill 文件（root-only）
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';

import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  deleteAgentApi,
  getAgentApi,
  getAgentBuffer,
  postAgentApi,
  putAgentApi,
  uploadAgentApi,
} from './api-client.js';
import { CliValidationError } from '../../core/errors.js';
import { MARKET_CATEGORIES, isValidMarketCategory } from './market-constants.js';
import { assertValidSkillVersion } from './skill-version.js';

const BASE_PATH = '/api/sandbox/agent/skills';

// ─── 共用 helper ───────────────────────────────────────────────

/**
 * 解析 instructions 参数：支持 @- 从 stdin 读取
 */
async function resolveInstructions(raw: string): Promise<string> {
  if (raw === '@-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!text) throw new Error('stdin is empty; cannot read instructions');
    return text;
  }
  return raw;
}

/**
 * 从 --file 读取文件 Buffer 并推断 MIME 类型
 */
function readFileForUpload(filePath: string): {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
} {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const buffer = readFileSync(resolved);
  const fileName = basename(resolved);
  const mimeType = guessMimeType(resolved);
  return { buffer, fileName, mimeType };
}

/** 推断 MIME 类型（与 attachments.ts 保持一致） */
function guessMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.html': 'text/html',
    '.xml': 'application/xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * 构建 asset/reference/script 目录下的上传 FormData
 */
function buildAssetFormData(filePath: string, subPath?: string): FormData {
  const { buffer, fileName, mimeType } = readFileForUpload(filePath);
  const fd = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  fd.append('file', blob, fileName);
  if (subPath) fd.append('subPath', subPath);
  return fd;
}

/**
 * 构建指定目录（assets/references/scripts）的 list/upload/read/del 命令工厂
 */
function makeAssetListCommand(
  commandName: string,
  description: string,
  dirName: 'assets' | 'references' | 'scripts',
): Command {
  return {
    service: 'agent',
    command: commandName,
    description,
    flags: [
      {
        name: 'id',
        type: 'string',
        required: true,
        desc: 'Skill record ID (CUID)',
      },
    ],
    risk: 'read',
    dryRun: (ctx) => ({
      method: 'GET',
      url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}`,
    }),
    execute: async (ctx) => {
      return getAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}`);
    },
  };
}

function makeAssetUploadCommand(
  commandName: string,
  description: string,
  dirName: 'assets' | 'references' | 'scripts',
): Command {
  const validate = (ctx: RuntimeContext) => {
    const filePath = ctx.str('file');
    if (!filePath) throw new Error('--file is required');
    if (!existsSync(resolve(filePath))) throw new Error(`File not found: ${resolve(filePath)}`);
  };

  return {
    service: 'agent',
    command: commandName,
    description,
    flags: [
      {
        name: 'id',
        type: 'string',
        required: true,
        desc: 'Skill record ID (CUID)',
      },
      {
        name: 'file',
        type: 'string',
        required: true,
        desc: 'Local file path to upload (max 1MB)',
      },
      {
        name: 'sub-path',
        type: 'string',
        required: false,
        desc: 'Sub-directory under the target dir (e.g. "sub/")',
      },
    ],
    risk: 'write',
    validate,
    dryRun: (ctx) => ({
      method: 'POST',
      url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}`,
      body: { file: ctx.str('file'), subPath: ctx.str('subPath') || '' },
    }),
    execute: async (ctx) => {
      const fd = buildAssetFormData(ctx.str('file'), ctx.str('subPath') || undefined);
      return uploadAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}`, fd);
    },
  };
}

function isTextContentType(contentType: string | null): boolean {
  const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (!mediaType) return false;
  return (
    mediaType.startsWith('text/') ||
    mediaType === 'application/json' ||
    mediaType.endsWith('+json') ||
    mediaType === 'application/xml' ||
    mediaType.endsWith('+xml')
  );
}

function makeAssetReadCommand(
  commandName: string,
  description: string,
  dirName: 'assets' | 'references' | 'scripts',
): Command {
  return {
    service: 'agent',
    command: commandName,
    description,
    flags: [
      {
        name: 'id',
        type: 'string',
        required: true,
        desc: 'Skill record ID (CUID)',
      },
      {
        name: 'path',
        type: 'string',
        required: true,
        desc: 'Relative file path within the directory (e.g. "guide.md" or "sub/icon.png")',
      },
      {
        name: 'output',
        type: 'string',
        required: false,
        desc: 'Write binary content to a local file (preserves binary data)',
      },
    ],
    risk: 'read',
    dryRun: (ctx) => ({
      method: 'GET',
      url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}/${encodeURIComponent(ctx.str('path'))}`,
    }),
    execute: async (ctx) => {
      const filePath = ctx.str('path');
      const encodedPath = filePath
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      const url = `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}/${encodedPath}`;
      const { buffer, fileName, contentType } = await getAgentBuffer(ctx, url);

      // --output <path>: write binary to disk
      const outputPath = ctx.str('output');
      if (outputPath) {
        const resolved = resolve(outputPath);
        writeFileSync(resolved, buffer);
        return { saved: true, path: resolved, size: buffer.length, fileName };
      }

      if (dirName === 'references' && !isTextContentType(contentType)) {
        throw new CliValidationError('Binary content requires --output', {
          code: 'output_required',
          hint: 'Re-run with --output <path> to preserve the original bytes.',
        });
      }

      // References use MIME to prevent binary corruption; assets/scripts keep their existing best-effort text behavior.
      const content = buffer.toString('utf8');
      return { content, fileName };
    },
  };
}

function makeAssetDelCommand(
  commandName: string,
  description: string,
  dirName: 'assets' | 'references' | 'scripts',
): Command {
  return {
    service: 'agent',
    command: commandName,
    description,
    flags: [
      {
        name: 'id',
        type: 'string',
        required: true,
        desc: 'Skill record ID (CUID)',
      },
      {
        name: 'path',
        type: 'string',
        required: true,
        desc: 'Relative file path within the directory to delete',
      },
    ],
    risk: 'high-risk-write',
    dryRun: (ctx) => ({
      method: 'DELETE',
      url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}/${encodeURIComponent(ctx.str('path'))}`,
    }),
    execute: async (ctx) => {
      const filePath = ctx.str('path');
      const encodedPath = filePath
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      return deleteAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/${dirName}/${encodedPath}`);
    },
  };
}

// ─── 1. +edit-skill ─────────────────────────────────────────────

export const editSkill: Command = {
  service: 'agent',
  command: '+edit-skill',
  description: 'Edit a personal Skill content (name / description / instructions / icon)',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Skill record ID (CUID)',
    },
    {
      name: 'name',
      type: 'string',
      required: false,
      desc: 'New Skill name (1-80 chars)',
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      desc: 'New Skill description',
    },
    {
      name: 'instructions',
      type: 'string',
      required: false,
      desc: 'New instructions (use @- to read from stdin)',
    },
    {
      name: 'display-name',
      type: 'string',
      required: false,
      desc: 'New display name (max 100)',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'icon-emoji',
      type: 'string',
      required: false,
      desc: 'Market icon emoji (e.g. robot)',
    },
    {
      name: 'icon-color',
      type: 'string',
      required: false,
      desc: 'Market icon color (e.g. #1E76F0)',
    },
    {
      name: 'version',
      type: 'string',
      required: false,
      desc: 'New content version (major.minor; required for content changes)',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (name && (name.length < 1 || name.length > 80)) {
      throw new Error('--name length must be between 1 and 80');
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
    // At least one editable field must be provided
    const hasAny =
      ctx.str('name') ||
      ctx.str('description') ||
      ctx.str('instructions') ||
      ctx.str('displayName') ||
      ctx.str('category') ||
      ctx.str('iconEmoji') ||
      ctx.str('iconColor');
    if (!hasAny) {
      throw new Error(
        'Provide at least one of --name / --description / --instructions / --display-name / --category / --icon-emoji / --icon-color',
      );
    }
    const version = ctx.str('version');
    if (version) assertValidSkillVersion(version);
    const changesContent =
      Boolean(ctx.str('name')) || Boolean(ctx.str('description')) || Boolean(ctx.str('instructions'));
    if (changesContent && !version) {
      throw new Error('--version is required when editing Skill content');
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {};
    if (ctx.str('name')) body.name = ctx.str('name');
    if (ctx.str('description')) body.description = ctx.str('description');
    body.instructions = ctx.str('instructions') === '@-' ? '(from stdin)' : ctx.str('instructions') || undefined;
    if (ctx.str('displayName')) body.displayName = ctx.str('displayName');
    if (ctx.str('category')) body.category = ctx.str('category');
    if (ctx.str('iconEmoji')) body.iconEmoji = ctx.str('iconEmoji');
    if (ctx.str('iconColor')) body.iconColor = ctx.str('iconColor');
    if (ctx.str('version')) body.version = ctx.str('version');
    return {
      method: 'PUT',
      url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`,
      body,
    };
  },
  execute: async (ctx) => {
    const body: Record<string, unknown> = {};
    if (ctx.str('name')) body.name = ctx.str('name');
    if (ctx.str('description')) body.description = ctx.str('description');
    if (ctx.str('instructions')) {
      body.instructions = await resolveInstructions(ctx.str('instructions'));
    }
    if (ctx.str('displayName')) body.displayName = ctx.str('displayName');
    if (ctx.str('category')) body.category = ctx.str('category');
    if (ctx.str('iconEmoji')) body.iconEmoji = ctx.str('iconEmoji');
    if (ctx.str('iconColor')) body.iconColor = ctx.str('iconColor');
    if (ctx.str('version')) body.version = ctx.str('version');
    return putAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`, body);
  },
};

// ─── 2. +get-skill-content ──────────────────────────────────────

export const getSkillContent: Command = {
  service: 'agent',
  command: '+get-skill-content',
  description: 'Read a Skill SKILL.md text content',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Skill record ID (CUID)',
    },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/content`,
  }),
  execute: async (ctx) => {
    return getAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/content`);
  },
};

// ─── 3-6. assets (list / upload / read / del) ───────────────────

export const listSkillAssets = makeAssetListCommand(
  '+list-skill-assets',
  'List all files in a Skill assets directory',
  'assets',
);

export const uploadSkillAsset = makeAssetUploadCommand(
  '+upload-skill-asset',
  'Upload a single file to a Skill assets directory (max 1MB)',
  'assets',
);

export const readSkillAsset = makeAssetReadCommand(
  '+read-skill-asset',
  'Read a Skill asset file (binary-safe; use --output to save to disk)',
  'assets',
);

export const delSkillAsset = makeAssetDelCommand(
  '+del-skill-asset',
  'Delete a file from a Skill assets directory',
  'assets',
);

// ─── 7-10. references (list / upload / read / del) ──────────────

export const listSkillReferences = makeAssetListCommand(
  '+list-skill-references',
  'List all files in a Skill references directory',
  'references',
);

export const uploadSkillReference = makeAssetUploadCommand(
  '+upload-skill-reference',
  'Upload a single file to a Skill references directory (max 1MB)',
  'references',
);

export const readSkillReference = makeAssetReadCommand(
  '+read-skill-reference',
  'Read a Skill reference file (binary-safe; use --output for non-text files)',
  'references',
);

export const delSkillReference = makeAssetDelCommand(
  '+del-skill-reference',
  'Delete a file from a Skill references directory',
  'references',
);

// ─── 11-14. scripts (list / upload / read / del) ────────────────

export const listSkillScripts = makeAssetListCommand(
  '+list-skill-scripts',
  'List all files in a Skill scripts directory',
  'scripts',
);

export const uploadSkillScript = makeAssetUploadCommand(
  '+upload-skill-script',
  'Upload a single file to a Skill scripts directory (max 1MB)',
  'scripts',
);

export const readSkillScript = makeAssetReadCommand(
  '+read-skill-script',
  'Read a Skill script file (binary-safe; use --output to save to disk)',
  'scripts',
);

export const delSkillScript = makeAssetDelCommand(
  '+del-skill-script',
  'Delete a file from a Skill scripts directory',
  'scripts',
);

// ─── 15. +upload-skill (ZIP) ────────────────────────────────────

export const uploadSkill: Command = {
  service: 'agent',
  command: '+upload-skill',
  description: 'Upload a ZIP-format Skill (parses SKILL.md + extracts to target dir)',
  flags: [
    {
      name: 'file',
      type: 'string',
      required: true,
      desc: 'Local .zip file path',
    },
    {
      name: 'scope',
      type: 'string',
      required: false,
      default: 'personal',
      desc: 'Target scope: personal | company',
    },
    {
      name: 'auto-rename',
      type: 'boolean',
      required: false,
      desc: 'Auto-rename on name conflict',
    },
    {
      name: 'replace-skill-id',
      type: 'string',
      required: false,
      desc: 'Replace an existing Skill (CUID) instead of creating a new one',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'name',
      type: 'string',
      required: false,
      desc: 'Override Skill name (from ZIP SKILL.md if omitted)',
    },
    {
      name: 'display-name',
      type: 'string',
      required: false,
      desc: 'Override display name',
    },
    {
      name: 'description',
      type: 'string',
      required: false,
      desc: 'Override description',
    },
    {
      name: 'instructions',
      type: 'string',
      required: false,
      desc: 'Override instructions (use @- to read from stdin)',
    },
    {
      name: 'icon-emoji',
      type: 'string',
      required: false,
      desc: 'Market icon emoji (e.g. robot)',
    },
    {
      name: 'icon-color',
      type: 'string',
      required: false,
      desc: 'Market icon color (e.g. #1E76F0)',
    },
    {
      name: 'version',
      type: 'string',
      required: false,
      desc: 'Content version (major.minor; required with --replace-skill-id)',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const filePath = ctx.str('file');
    if (!filePath) throw new Error('--file is required');
    const resolved = resolve(filePath);
    if (!existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
    const ext = extname(resolved).toLowerCase();
    if (ext !== '.zip') throw new Error('--file must be a .zip file');
    const scope = ctx.str('scope');
    if (scope && !['personal', 'company'].includes(scope)) {
      throw new Error('--scope must be personal or company');
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
    const version = ctx.str('version');
    if (version) assertValidSkillVersion(version);
    if (ctx.str('replaceSkillId') && !version) {
      throw new Error('--version is required with --replace-skill-id');
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      file: ctx.str('file'),
      scope: ctx.str('scope') || 'personal',
    };
    if (ctx.bool('autoRename')) body.autoRename = true;
    if (ctx.str('replaceSkillId')) body.replaceSkillId = ctx.str('replaceSkillId');
    if (ctx.str('category')) body.category = ctx.str('category');
    if (ctx.str('name')) body.name = ctx.str('name');
    if (ctx.str('displayName')) body.displayName = ctx.str('displayName');
    if (ctx.str('description')) body.description = ctx.str('description');
    if (ctx.str('instructions'))
      body.instructions = ctx.str('instructions') === '@-' ? '(from stdin)' : ctx.str('instructions');
    if (ctx.str('iconEmoji')) body.iconEmoji = ctx.str('iconEmoji');
    if (ctx.str('iconColor')) body.iconColor = ctx.str('iconColor');
    if (ctx.str('version')) body.version = ctx.str('version');
    return {
      method: 'POST',
      url: `${BASE_PATH}/upload`,
      body,
    };
  },
  execute: async (ctx) => {
    const filePath = ctx.str('file');
    const resolved = resolve(filePath);
    const buffer = readFileSync(resolved);
    const fileName = basename(resolved);

    const fd = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/zip',
    });
    fd.append('file', blob, fileName);

    const scope = ctx.str('scope') || 'personal';
    fd.append('scope', scope);

    if (ctx.bool('autoRename')) fd.append('autoRename', 'true');
    if (ctx.str('replaceSkillId')) fd.append('replaceSkillId', ctx.str('replaceSkillId'));
    if (ctx.str('category')) fd.append('category', ctx.str('category'));
    if (ctx.str('name')) fd.append('name', ctx.str('name'));
    if (ctx.str('displayName')) fd.append('displayName', ctx.str('displayName'));
    if (ctx.str('description')) fd.append('description', ctx.str('description'));
    if (ctx.str('instructions')) {
      const instructions = await resolveInstructions(ctx.str('instructions'));
      fd.append('instructions', instructions);
    }
    if (ctx.str('iconEmoji')) fd.append('iconEmoji', ctx.str('iconEmoji'));
    if (ctx.str('iconColor')) fd.append('iconColor', ctx.str('iconColor'));
    if (ctx.str('version')) fd.append('version', ctx.str('version'));

    return uploadAgentApi(ctx, `${BASE_PATH}/upload`, fd);
  },
};

// ─── 16. +rescan-skills ─────────────────────────────────────────

export const rescanSkills: Command = {
  service: 'agent',
  command: '+rescan-skills',
  hidden: true,
  description: 'Compatibility-only Skill inventory synchronization (system scope)',
  flags: [],
  risk: 'write',
  dryRun: () => ({
    method: 'POST',
    url: `${BASE_PATH}/rescan`,
  }),
  execute: async (ctx) => {
    return postAgentApi(ctx, `${BASE_PATH}/rescan`, {});
  },
};
