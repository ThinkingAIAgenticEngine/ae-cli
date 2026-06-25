// CLI message translations — load JSON from package resources at runtime

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { detectCliLocale, type Locale } from './locale.js';
import { getPackageRoot } from '../paths.js';

type TranslationTree = Record<string, unknown>;

const loaded: Map<Locale, TranslationTree> = new Map();

function i18nFile(locale: Locale): string {
  const root = getPackageRoot();
  const candidates = [
    join(root, 'dist', 'tracking', 'i18n', 'resources', 'cli', `${locale}.json`),
    join(root, 'src', 'tracking', 'i18n', 'resources', 'cli', `${locale}.json`),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[candidates.length - 1];
}

function loadSync(locale: Locale): TranslationTree {
  if (loaded.has(locale)) return loaded.get(locale)!;

  try {
    const raw = readFileSync(i18nFile(locale), 'utf8');
    const tree = JSON.parse(raw) as TranslationTree;
    loaded.set(locale, tree);
    return tree;
  } catch {
    if (locale !== 'en') {
      return loadSync('en');
    }
    loaded.set('en', {});
    return {};
  }
}

export function t(key: string, params?: Record<string, string | number>, locale?: Locale): string {
  const loc = locale ?? detectCliLocale();
  const tree = loadSync(loc);

  const parts = key.split('.');
  let node: unknown = tree;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }

  if (typeof node !== 'string') return key;

  if (params) {
    return node.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
  }

  return node;
}
