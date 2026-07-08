/**
 * Distill xlsx template files to human-readable markdown.
 * Run: npx tsx src/xlsx/distill.ts
 *
 * Reads every *.xlsx in tracking-plan-template/ (and optionally ~/.ae-cli/templates/)
 * and writes a companion *.md file with the same base name.
 */
import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { readTemplateXlsx } from './read.js';
import { getTemplateDirs } from '../templates.js';

function mdTableHeader(cols: string[]): string {
  return '| ' + cols.join(' | ') + ' |';
}

function mdTableSep(cols: string[]): string {
  return '| ' + cols.map(() => '---').join(' | ') + ' |';
}

function mdTableRow(cells: (string | undefined)[]): string {
  return '| ' + cells.join(' | ') + ' |';
}

function propNamesStr(names: string[]): string {
  return names.join(', ');
}

async function distillXlsx(filePath: string): Promise<string> {
  const draft = await readTemplateXlsx(filePath);
  const lines: string[] = [];

  lines.push(`# ${draft.meta.plan_name}`);
  lines.push('');

  // ── 事件数据 ──────────────────────────────────────────────
  lines.push('## 事件数据');
  lines.push('');
  lines.push(mdTableHeader(['事件名', '显示名', '说明', '标签', '平台', '属性']));
  lines.push(mdTableSep(['事件名', '显示名', '说明', '标签', '平台', '属性']));

  for (const evt of draft.events) {
    lines.push(mdTableRow([
      evt.event_name,
      evt.display_name ?? '',
      evt.event_desc ?? '',
      evt.event_tag ?? '',
      evt.platform ?? '',
      propNamesStr(evt.prop_names),
    ]));
  }
  lines.push('');

  // ── 公共事件属性 ──────────────────────────────────────────
  if (draft.common_event_properties.length > 0) {
    lines.push('## 公共事件属性');
    lines.push('');
    lines.push(mdTableHeader(['属性名', '显示名', '类型', '说明']));
    lines.push(mdTableSep(['属性名', '显示名', '类型', '说明']));

    for (const p of draft.common_event_properties) {
      lines.push(mdTableRow([
        p.name,
        p.display_name ?? '',
        p.type,
        p.desc ?? '',
      ]));
    }
    lines.push('');
  }

  // ── 用户数据 ──────────────────────────────────────────────
  if (draft.user_properties.length > 0) {
    lines.push('## 用户数据');
    lines.push('');
    lines.push(mdTableHeader(['属性名', '显示名', '类型', '更新方式', '说明', '标签']));
    lines.push(mdTableSep(['属性名', '显示名', '类型', '更新方式', '说明', '标签']));

    for (const p of draft.user_properties) {
      lines.push(mdTableRow([
        p.name,
        p.display_name ?? '',
        p.type,
        p.update_type ?? 'user_set',
        p.desc ?? '',
        p.prop_tag ?? '',
      ]));
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  let total = 0;
  let ok = 0;

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
      total++;
      const xlsxPath = resolve(dir, f);
      const mdPath = resolve(dir, f.replace(/\.xlsx$/i, '.md'));

      try {
        const md = await distillXlsx(xlsxPath);
        const { writeFile } = await import('node:fs/promises');
        await writeFile(mdPath, md, 'utf8');
        console.log(`✅ ${f.replace(/\.xlsx$/i, '')}`);
        ok++;
      } catch (e) {
        console.error(`❌ ${f}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  console.log(`\nDone: ${ok}/${total} distilled`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
