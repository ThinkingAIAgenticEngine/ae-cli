// te-cli tracking plan commands
import { Command } from 'commander';
import { readFile, writeFile, cp } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import { writeDraftXlsx, validateDraft } from '../../tracking/xlsx/write.js';
import type { Locale } from '../../tracking/i18n/xlsx.js';
import { t } from '../../tracking/i18n/translate.js';
import { detectCliLocale } from '../../tracking/i18n/locale.js';
import { createTrackingClient } from '../../core/tracking-client.js';
import { fetchPlan } from '../../tracking/te-plan/fetch.js';
import { injectAutotrackEvents } from '../../tracking/plan/draft.js';
import { validateAndFix, fixDraft, extractErrors } from '../../tracking/plan/fix.js';
import { detectConflicts, formatConflictReport } from '../../tracking/plan/conflict.js';
import type { Draft } from '../../tracking/plan/types.js';
import { existsSync } from 'node:fs';
import { getTemplateDirs, listTrackingTemplates } from '../../tracking/templates.js';
import { HOST_OPTION_DESC, resolveTrackingHost, assertOutputFilePath, assertInputFilePath } from './shared.js';

const MAX_FIX_RETRIES = 3;

export function registerPlan(cmd: Command, rootProgram: Command): void {
  cmd.description('manage AE tracking plans');

  cmd.command('draft')
    .description('Generate xlsx from draft.json (inject autotrack events; use --fix to auto-repair validation errors)')
    .requiredOption('--in <path>', 'draft JSON input')
    .requiredOption('--out <path>', 'xlsx output')
    .option('--fix', 'auto fix validation errors', false)
    .action(async (opts: { in: string; out: string; fix: boolean }) => {
      assertInputFilePath(opts.in, '--in');
      assertOutputFilePath(opts.out, '--out');
      const draft: Draft = JSON.parse(await readFile(opts.in, 'utf8'));
      const locale = (draft.meta.lang as Locale | undefined) ?? detectCliLocale();
      // 注入 SDK 自动采集事件
      injectAutotrackEvents(draft, locale);

      // 校验和自动修复
      if (opts.fix) {
        const fixed = validateAndFix(draft);
        if (fixed.length > 0) {
          console.log(t('plan.draft_autofixed', { items: fixed.join(', ') }));
          await writeFile(opts.in, JSON.stringify(draft, null, 2), 'utf8');
        }
      }

      // 尝试校验，如果失败且开启了 fix，循环修复后重试
      try {
        validateDraft(draft);
      } catch (e) {
        if (!opts.fix) {
          throw e;
        }
        console.log(t('plan.draft_validation_failed_attempting_fix'));

        for (let retry = 0; retry < MAX_FIX_RETRIES; retry++) {
          const fixed = validateAndFix(draft);
          if (fixed.length === 0) {
            // 无法自动修复，报错退出
            console.error(t('plan.no_auto_fix_available'));
            console.error(e instanceof Error ? e.message : String(e));
            process.exit(1);
          }
          console.log(t('plan.draft_fixed', { items: fixed.join(', ') }));
          await writeFile(opts.in, JSON.stringify(draft, null, 2), 'utf8');

          try {
            validateDraft(draft);
            break; // 修复成功
          } catch (retryErr) {
            if (retry === MAX_FIX_RETRIES - 1) {
              // 达到最大重试次数，输出剩余错误并退出
              console.error(t('plan.validate_still_errors_after_fix', {
                error: retryErr instanceof Error ? retryErr.message : String(retryErr),
              }));
              console.error(t('plan.max_fix_retries'));
              process.exit(1);
            }
            // 继续下一轮修复
          }
        }
      }

      await writeDraftXlsx(draft, opts.out, locale);
      const counts = `events=${draft.events.length}, event_props=${draft.event_properties.length}, common=${draft.common_event_properties.length}, user=${draft.user_properties.length}`;
      console.log(t('plan.wrote_xlsx', { path: opts.out, counts }));
    });

  cmd.command('validate')
    .description('Validate draft.json structure and field rules')
    .requiredOption('--in <path>', 'draft JSON input')
    .option('--fix', 'auto fix validation errors', false)
    .action(async (opts: { in: string; fix: boolean }) => {
      assertInputFilePath(opts.in, '--in');
      const draft: Draft = JSON.parse(await readFile(opts.in, 'utf8'));

      try {
        validateDraft(draft);
        console.log(t('plan.validate_passed'));
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log(t('plan.validate_failed') + '\n' + errorMsg);

        if (opts.fix) {
          console.log('\n' + t('plan.attempting_auto_fix') + '...');
          const fixed = validateAndFix(draft);
          if (fixed.length > 0) {
            console.log(t('plan.fixed_items', { items: fixed.join(', ') }));
            await writeFile(opts.in, JSON.stringify(draft, null, 2), 'utf8');
            console.log(t('plan.updated_file', { path: opts.in }));

            // 重新校验
            try {
              validateDraft(draft);
              console.log(t('plan.validate_passed_after_fix'));
            } catch (e2) {
              console.log(t('plan.validate_still_errors_after_fix', { error: e2 instanceof Error ? e2.message : String(e2) }));
            }
          } else {
            console.log(t('plan.no_auto_fix_available'));
          }
        }
      }
    });

  cmd.command('upload')
    .description('Upload xlsx tracking plan to AE (conflict check, auto-fix retry)')
    .requiredOption('-p, --project <id>', 'AE projectId', (v: string) => parseInt(v, 10))
    .requiredOption('--xlsx <path>', 'xlsx file')
    .requiredOption('--draft <path>', 'draft JSON (for auto-fix)')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--lang <locale>', 'xlsx language: zh / en / ja / ko')
    .option('--replace', 'delete existing plan first', false)
    .option('--auto-fix', 'auto fix upload errors and retry', true)
    .action(async (opts: { project: number; xlsx: string; draft: string; host?: string; lang?: string; replace: boolean; autoFix: boolean }) => {
      assertInputFilePath(opts.draft, '--draft');
      assertInputFilePath(opts.xlsx, '--xlsx');
      const host = resolveTrackingHost(rootProgram, opts);
      let client = await createTrackingClient(host);

      const draftPre: Draft = JSON.parse(await readFile(opts.draft, 'utf8'));

      if (!opts.replace) {
        console.log(t('plan.checking_conflicts'));
        try {
          const existingDraft = await fetchPlan({ projectId: opts.project, host });

          // 有既有方案，进行冲突检测
          const conflictResult = detectConflicts(draftPre, existingDraft);

          if (conflictResult.hasErrors) {
            // 严重冲突：打印报告并退出
            const existingSummary = {
              events: existingDraft.events.length,
              eventProps: existingDraft.event_properties.length,
              commonProps: existingDraft.common_event_properties.length,
              userProps: existingDraft.user_properties.length,
            };
            console.log('\n' + formatConflictReport(conflictResult, existingSummary));
            console.log('\n' + t('plan.cannot_append_mode'));
            return;
          }

          if (conflictResult.hasWarnings) {
            // 仅提醒：打印并继续
            const existingSummary = {
              events: existingDraft.events.length,
              eventProps: existingDraft.event_properties.length,
              commonProps: existingDraft.common_event_properties.length,
              userProps: existingDraft.user_properties.length,
            };
            console.log('\n' + formatConflictReport(conflictResult, existingSummary));
            console.log('\n' + t('plan.append_continue_note') + '\n');
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes('return_code -1001') || errorMsg.includes('token expired') || errorMsg.includes('Session expired')) {
            console.log(t('plan.token_expired_refreshing'));
            client = await createTrackingClient(host);
          } else {
            console.log(t('plan.no_existing_plan'));
          }
        }
      }

      if (opts.replace) {
        const del = await client.deleteProgram(opts.project);
        console.log(t('plan.deleted_existing_plan', { message: del.return_message }));
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      let retryCount = 0;
      let draft: Draft = JSON.parse(await readFile(opts.draft, 'utf8'));
      const locale = (opts.lang as Locale | undefined) ?? (draft.meta.lang as Locale | undefined) ?? 'zh';
      let tokenRefreshed = false;
      let lastRes: Awaited<ReturnType<typeof client.uploadProgramExcel>> | null = null;

      while (retryCount < MAX_FIX_RETRIES) {
        const file = await readFile(opts.xlsx);
        lastRes = await client.uploadProgramExcel({
          projectId: opts.project,
          file,
          filename: path.basename(opts.xlsx),
          lang: locale,
        });

        console.log(JSON.stringify(lastRes, null, 2));

        if (lastRes.return_code === -1001 && !tokenRefreshed) {
          console.log('[auth] token expired during upload, refreshing session...');
          client = await createTrackingClient(host);
          tokenRefreshed = true;
          continue;
        }

        const errors = extractErrors(lastRes);
        if (errors.length === 0 || lastRes.return_code !== 0) {
          break;
        }

        if (!opts.autoFix) {
          console.log('\n' + t('plan.upload_has_validation_errors'));
          break;
        }

        console.log('\n' + t('plan.auto_fixing_retry', { current: retryCount + 1, max: MAX_FIX_RETRIES }) + '...');
        const fixed = fixDraft(draft, lastRes);
        if (fixed.length === 0) {
          console.log(t('plan.no_auto_fix_upload'));
          break;
        }

        console.log(t('plan.fixed_items', { items: fixed.join(', ') }));

        await writeFile(opts.draft, JSON.stringify(draft, null, 2), 'utf8');
        injectAutotrackEvents(draft, locale);
        await writeDraftXlsx(draft, opts.xlsx, locale);
        console.log(t('plan.regenerated_xlsx', { path: opts.xlsx }));

        retryCount++;
      }

      if (retryCount >= MAX_FIX_RETRIES) {
        console.log('\n' + t('plan.max_fix_retries'));
      }

      // 语言不匹配提示：AE 返回"无法识别表格内容"类错误时，提示检查语言设置
      const msg = lastRes?.return_message ?? '';
      const isLangMismatch =
        msg.includes('无法识别表格内容') ||
        msg.includes('The content of the form cannot be recognized') ||
        msg.includes('テーブルの内容を認識できません') ||
        msg.includes('트래킹 방안을 실별 할 수 없습니다');
      if (lastRes && lastRes.return_code !== 0 && isLangMismatch) {
        const xlsxLocale = (opts.lang as Locale | undefined) ?? (draft.meta.lang as Locale | undefined) ?? detectCliLocale();
        console.log('\n' + t('plan.language_mismatch_hint', { locale: xlsxLocale }));
      }
    });

  cmd.command('fetch')
    .description('Fetch tracking plan from AE and output draft.json')
    .requiredOption('-p, --project <id>', 'AE projectId', (v: string) => parseInt(v, 10))
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--out <path>', 'write to file instead of stdout')
    .action(async (opts: { project: number; host?: string; out?: string }) => {
      if (opts.out) assertOutputFilePath(opts.out, '--out');
      const host = resolveTrackingHost(rootProgram, opts);
      const draft = await fetchPlan({ projectId: opts.project, host });
      const s = JSON.stringify(draft, null, 2) + '\n';
      if (opts.out) {
        await writeFile(opts.out, s, 'utf8');
      } else process.stdout.write(s);
    });

  cmd.command('archive')
    .description('Copy draft.xlsx to plans/ and record archive metadata in draft.json')
    .requiredOption('--draft <path>', 'draft.json path')
    .requiredOption('--xlsx <path>', 'draft.xlsx path')
    .requiredOption('--name <name>', 'plan name for filename')
    .option('--plans-dir <dir>', 'plans output directory', resolve(process.cwd(), 'plans'))
    .action(async (opts: { draft: string; xlsx: string; name: string; plansDir: string }) => {
      assertInputFilePath(opts.draft, '--draft');
      assertInputFilePath(opts.xlsx, '--xlsx');
      const stamp = new Date().toISOString().slice(0, 10);
      const dest = resolve(opts.plansDir, `${stamp}-${opts.name}.xlsx`);

      // Copy with guard against overwrite
      if (existsSync(dest)) {
        console.error(t('plan.archive_exists', { path: dest }));
        console.error(t('plan.remove_or_rename'));
        return;
      }
      try {
        await cp(opts.xlsx, dest);
      } catch (e: unknown) {
        // Only EEXIST is possible here since we already checked above, but be defensive
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
          console.error(t('plan.archive_exists', { path: dest }));
          console.error(t('plan.remove_or_rename'));
          return;
        }
        throw e;
      }

      // Mark as archived in draft.json
      const draft: Draft = JSON.parse(await readFile(opts.draft, 'utf8'));
      draft.meta.archived_at = stamp;
      draft.meta.archived_path = dest;
      await writeFile(opts.draft, JSON.stringify(draft, null, 2), 'utf8');

      console.log(t('plan.archived_to', { path: dest }));
      console.log(t('plan.draft_updated_archived', { stamp }));
    });

  cmd.command('delete')
    .description('Delete the entire tracking plan from an AE project')
    .requiredOption('-p, --project <id>', 'AE projectId', (v: string) => parseInt(v, 10))
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: { project: number; host?: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      const res = await client.deleteProgram(opts.project);
      console.log(JSON.stringify(res, null, 2));
    });

  cmd.command('list-templates')
    .description('List bundled and user tracking plan templates (xlsx/md)')
    .option('--json', 'print machine-readable template list', false)
    .action(async (opts: { json: boolean }) => {
      const found = await listTrackingTemplates();
      if (opts.json) {
        console.log(JSON.stringify(found, null, 2));
        return;
      }
      if (found.length === 0) {
        console.log(t('plan.no_templates_found', { dirs: getTemplateDirs().join(', ') }));
        return;
      }
      console.log(t('plan.templates_found', { count: found.length }) + '\n');
      for (const tmpl of found) {
        const mdNote = tmpl.hasMd ? t('plan.template_md_label') : t('plan.template_xlsx_label');
        console.log(`  ${tmpl.name}${mdNote}`);
        console.log(`    ${tmpl.path}`);
      }
    });
}
