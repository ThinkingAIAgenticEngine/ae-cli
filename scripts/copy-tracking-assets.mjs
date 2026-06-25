#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distTracking = path.join(root, 'dist', 'tracking', 'i18n', 'resources', 'cli');
const srcCli = path.join(root, 'src', 'tracking', 'i18n', 'resources', 'cli');

fs.mkdirSync(distTracking, { recursive: true });
for (const name of ['en.json', 'zh.json', 'ja.json', 'ko.json']) {
  fs.copyFileSync(path.join(srcCli, name), path.join(distTracking, name));
}

const distXlsx = path.join(root, 'dist', 'tracking', 'i18n', 'resources', 'xlsx');
const srcXlsx = path.join(root, 'src', 'tracking', 'i18n', 'resources', 'xlsx');
if (fs.existsSync(srcXlsx)) {
  fs.mkdirSync(distXlsx, { recursive: true });
  for (const name of fs.readdirSync(srcXlsx)) {
    if (name.endsWith('.json')) {
      fs.copyFileSync(path.join(srcXlsx, name), path.join(distXlsx, name));
    }
  }
}

console.log('Copied tracking i18n assets to dist/');
