import type { Command } from 'commander';
import { getLocalCliPackageInfo } from '../core/package-info.js';
import { installVersion } from '../core/version-sync.js';
import { failInstallation, newInstallationReport } from '../core/installation.js';

export function registerInstall(program: Command): void {
  program.command('install')
    .description('Install and verify this CLI distribution and its matching global Skills')
    .option('--host <url>', 'Check authentication for this AE host after installation')
    .addHelpText('after', '\nExamples:\n  npx @thinkingai/ae-cli@latest install\n  ae-cli install --dry-run --format json\n  ae-cli install --host https://your-ae-host.example.com\n\nSkills are installed globally in ~/.agents/skills with client adaptation handled automatically.\nGlobal options: --dry-run, --format json|table. Supports macOS, Linux, and native Windows.\n')
    .action(async (opts: { host?: string }) => {
      const pkg = getLocalCliPackageInfo();
      const global = program.opts();
      const format = program.getOptionValueSource('format') === 'default' && process.stdout.isTTY ? 'table' : global.format;
      let report = newInstallationReport(pkg.name, pkg.version, Boolean(global.dryRun));
      try {
        if (!['json', 'table'].includes(format) || global.jq || global.validate) {
          throw new Error('Installation supports --format json|table and --dry-run; --jq and --validate are not supported.');
        }
        const result = installVersion(pkg.version, { packageName: pkg.name,
          host: opts.host || global.host, dryRun: global.dryRun,
          progress: message => process.stderr.write(`${message}\n`) });
        report = result.report ?? failInstallation(report, result.ok ? 'environment' : result.stage,
          result.ok ? 'Installation result is unavailable.' : result.message, result.ok ? 'unknown' : result.cause);
      } catch (error) {
        report = failInstallation(report, 'environment', error instanceof Error ? error.message : 'Installation failed.');
      }
      const output = format === 'table' ? [
        report.dry_run ? 'AE CLI installation plan (no changes)' : report.ok ? 'AE CLI installation complete' : 'AE CLI installation incomplete',
        `CLI: ${report.cli.package}@${report.cli.version} (${report.cli.verified ? 'verified' : 'not verified'})`,
        `Command: ${report.cli.path ?? 'pending'}`,
        `Global Skills: ${report.skills.installed_count}/${report.skills.expected_count} verified in ${report.skills.directory}`,
        ...report.skills.failures.map(failure => `- ${failure.skill}: ${failure.reason}`),
        ...report.cli.warnings, ...report.auth.warnings,
        ...(report.error ? [report.error.message] : []),
        ...(report.commands ?? []), ...report.next_steps,
      ].join('\n') : JSON.stringify(report, null, 2);
      process.stdout.write(`${output}\n`);
      if (!report.ok) process.exitCode = 1;
    });
}
