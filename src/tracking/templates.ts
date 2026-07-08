import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getConfigDir, getPackageRoot } from './paths.js';

export interface TrackingTemplate {
  name: string;
  path: string;
  hasMd: boolean;
}

export function getTemplateDirs(): string[] {
  return [
    resolve(getPackageRoot(), 'tracking-plan-template'),
    resolve(getConfigDir(), 'templates'),
  ];
}

export async function listTrackingTemplates(): Promise<TrackingTemplate[]> {
  const found: TrackingTemplate[] = [];
  for (const dir of getTemplateDirs()) {
    if (!existsSync(dir)) continue;
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.xlsx')) continue;
      const base = f.replace(/\.xlsx$/i, '');
      const mdPath = resolve(dir, base + '.md');
      const hasMd = existsSync(mdPath);
      found.push({
        path: hasMd ? mdPath : resolve(dir, f),
        name: base,
        hasMd,
      });
    }
  }
  return found;
}

export async function resolveTrackingTemplateByName(name: string): Promise<TrackingTemplate> {
  const normalized = name.trim().replace(/\.(md|xlsx)$/i, '');
  const templates = await listTrackingTemplates();
  const template = templates.find((item) => item.name === normalized);
  if (!template) {
    const available = templates.map((item) => item.name).join(', ');
    throw new Error(
      available
        ? `Template not found: ${name}. Available templates: ${available}`
        : `Template not found: ${name}. No tracking plan templates are available.`,
    );
  }
  return template;
}
