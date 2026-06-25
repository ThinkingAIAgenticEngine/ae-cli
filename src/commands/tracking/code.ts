// src/cli/code.ts
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { detectProject } from '../../tracking/project-detect/detect.js';
import { readTemplateXlsx } from '../../tracking/xlsx/read.js';
import { readTemplateMd } from '../../tracking/xlsx/md.js';
import type { Draft, SDKType, ClientLanguage } from '../../tracking/plan/types.js';
import { t } from '../../tracking/i18n/translate.js';
import { assertInputFilePath, assertOutputFilePath } from './shared.js';

/**
 * Infer sdk_integration_mode from events' platform field (if present).
 * Returns undefined if events have no platform info (e.g., from xlsx).
 */
function inferSdkMode(events: Draft['events']): 'client_only' | 'server_only' | 'both' | undefined {
  // If events have explicit platform field, we can infer
  const hasPlatform = events.some((e) => e.platform !== undefined);
  if (!hasPlatform) return undefined; // xlsx doesn't have platform info

  const platforms = new Set(events.map((e) => e.platform ?? 'client'));
  if (platforms.has('both')) return 'both';
  if (platforms.has('client') && platforms.has('server')) return 'both';
  if (platforms.has('server')) return 'server_only';
  return 'client_only';
}

export function registerCode(cmd: Command): void {
  cmd.description('tooling for ae-generate-tracking-code skill');

  const importTemplateCmd = cmd.command('import-template')
    .description('Import a template file (md or xlsx) to draft.json, inferring sdk_integration_mode from events')
    .requiredOption('--template <path>', 'Path to template file (.md or .xlsx)')
    .requiredOption('--out <path>', 'Output path for draft.json')
    .option('--sdk-type <type>', 'Client SDK type (android/ios/openharmony/javascript/etc.)')
    .option('--languages <langs>', 'Client languages comma-separated (e.g., java,kotlin for android)')
    .option('--server <lang>', 'Server language (java/python/go/etc.)')
    .action(async (opts: {
      template: string;
      out: string;
      sdkType?: string;
      languages?: string;
      server?: string;
    }) => {
      assertInputFilePath(opts.template, '--template');
      assertOutputFilePath(opts.out, '--out');
      const draft = (opts.template.endsWith('.md'))
        ? await readTemplateMd(opts.template)
        : await readTemplateXlsx(opts.template);

      // Infer sdk_integration_mode from events (if platform info available)
      const inferredMode = inferSdkMode(draft.events);
      if (inferredMode) {
        draft.meta.sdk_integration_mode = inferredMode;
        process.stdout.write(t('code.inferred_sdk_mode', { mode: draft.meta.sdk_integration_mode }) + '\n');
      } else {
        process.stdout.write(t('code.default_sdk_mode', { mode: draft.meta.sdk_integration_mode }) + '\n');
      }

      // Apply CLI overrides
      if (opts.sdkType) {
        draft.meta.client_sdk_type = opts.sdkType as SDKType;
        draft.meta.client_platforms = [opts.sdkType as SDKType];
      }
      if (opts.languages) {
        const langs = opts.languages.split(',') as ClientLanguage[];
        draft.meta.client_languages = langs;
        if (draft.meta.client_platforms?.[0]) {
          const platform = draft.meta.client_platforms[0] as SDKType;
          const langMap: Record<string, ClientLanguage[]> = {};
          langMap[platform] = langs;
          draft.meta.client_platform_languages = langMap as Record<SDKType, ClientLanguage[]>;
        }
      }
      if (opts.server) {
        draft.meta.server_language = opts.server as Draft['meta']['server_language'];
      }

      await mkdir(dirname(opts.out), { recursive: true });
      await writeFile(opts.out, JSON.stringify(draft, null, 2), 'utf8');
      process.stdout.write(t('code.wrote_events', { count: draft.events.length, path: opts.out }) + '\n');
    });

  const dryrunCmd = cmd.command('dryrun')
    .description('Preview SDK integration layout from draft.json (skill helper; hidden)')
    .requiredOption('--plan <path>', 'Draft JSON (from plan fetch)')
    .option('--cwd <path>', 'target project dir', process.cwd())
    .action(async (opts: { plan: string; cwd: string }) => {
      assertInputFilePath(opts.plan, '--plan');
      const draft: Draft = JSON.parse(await readFile(opts.plan, 'utf8'));
      const detect = await detectProject(opts.cwd);
      const tagged = new Map<string, string[]>();
      for (const ev of draft.events) {
        const tag = ev.event_tag ?? 'uncategorized';
        if (!tagged.has(tag)) tagged.set(tag, []);
        tagged.get(tag)!.push(ev.event_name);
      }
      const out = {
        detect,
        sdkInit: { candidateFiles: detect.entryFiles, placed: false },
        commonProperties: draft.common_event_properties.map((p) => p.name),
        userProperties: draft.user_properties.map((p) => ({ name: p.name, update_type: p.update_type })),
        eventGroups: [...tagged.entries()].map(([tag, events]) => ({ tag, events })),
      };
      process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    });

  const detectCmd = cmd.command('detect')
    .description('detect project type and recommended SDK integration modes')
    .option('--cwd <path>', 'project directory', process.cwd())
    .action(async (opts: { cwd: string }) => {
      const result = await detectProject(opts.cwd);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    });

  // @ts-ignore _hidden is a semi-public property in commander.js
  (importTemplateCmd as any)._hidden = true;
  (dryrunCmd as any)._hidden = true;
  (detectCmd as any)._hidden = true;
}
