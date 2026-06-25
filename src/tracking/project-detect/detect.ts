import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppType, DetectResult, Mode } from './types.js';

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function readJson(p: string): Promise<any | null> {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

/** Classify a single directory (no recursive walk). Returns 'unknown' if unrecognised. */
async function classifyDir(cwd: string): Promise<AppType> {
  if (await exists(join(cwd, 'project.config.json'))) {
    const cfg = await readJson(join(cwd, 'project.config.json'));
    if (cfg && 'miniprogramRoot' in cfg) return 'mini-program';
  }
  if (await exists(join(cwd, 'ProjectSettings/ProjectVersion.txt'))) return 'unity';
  if (await exists(join(cwd, 'Podfile'))) return 'ios';
  if (await exists(join(cwd, 'build.gradle')) || await exists(join(cwd, 'settings.gradle'))) return 'android';

  const pkg = await readJson(join(cwd, 'package.json'));
  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.astro) return 'web-astro';
    if (deps.next) return 'web-nextjs';
    if (deps.react) return 'web-react';
    if (deps.vue) return 'web-vue';
    if (deps.express || deps.fastify || deps.koa) return 'node-server';
    return 'web-vanilla';
  }

  if (await exists(join(cwd, 'go.mod'))) return 'go-server';
  if (await exists(join(cwd, 'pom.xml'))) return 'java-server';
  if (await exists(join(cwd, 'pyproject.toml')) || await exists(join(cwd, 'requirements.txt'))) return 'python-server';

  return 'unknown';
}

/** Classify cwd, walking 1 level into subdirs if cwd itself is unrecognised (monorepo support). */
async function classify(cwd: string): Promise<{ appType: AppType; subPath?: string }> {
  // 1. Try cwd directly
  const direct = await classifyDir(cwd);
  if (direct !== 'unknown') return { appType: direct, subPath: undefined };

  // 2. Walk direct children (max 20 to avoid huge monorepos)
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(cwd, { withFileTypes: true });
  } catch {
    return { appType: 'unknown', subPath: undefined };
  }

  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .slice(0, 20);

  // During monorepo walk, prefer specific types over 'web-vanilla' (which is a
  // catch-all for any package.json with no recognised framework).
  let vanillaMatch: { appType: AppType; subPath: string } | undefined;
  for (const d of dirs) {
    const sub = await classifyDir(join(cwd, d.name));
    if (sub !== 'unknown' && sub !== 'web-vanilla') {
      return { appType: sub, subPath: d.name };
    }
    if (sub === 'web-vanilla' && !vanillaMatch) {
      vanillaMatch = { appType: sub, subPath: d.name };
    }
  }

  if (vanillaMatch) return vanillaMatch;
  return { appType: 'unknown', subPath: undefined };
}

function recommend(appType: AppType): Mode[] {
  switch (appType) {
    case 'web-react': case 'web-vue': case 'web-nextjs': case 'web-vanilla':
    case 'web-astro':
    case 'ios': case 'android': case 'mini-program': case 'unity':
      return ['A', 'F'];
    case 'node-server': case 'python-server': case 'go-server': case 'java-server':
      return ['E', 'F'];
    case 'unknown':
    default:
      return ['B', 'E'];
  }
}

export async function detectProject(cwd: string): Promise<DetectResult> {
  const { appType, subPath } = await classify(cwd);
  return {
    appType,
    subPath,
    entryFiles: [],
    existingTracking: [],
    recommendedModes: recommend(appType),
  };
}
