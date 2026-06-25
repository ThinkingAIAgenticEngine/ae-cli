import { Command } from 'commander';
import { type Locale } from '../../tracking/i18n/locale.js';
import { cliLocaleToAE } from '../../tracking/i18n/ae-locale.js';
import { createTrackingClient } from '../../core/tracking-client.js';
import { HOST_OPTION_DESC, resolveTrackingHost } from './shared.js';

const SUPPORTED = ['zh', 'en', 'ja', 'ko'] as const;
const SUPPORTED_LABELS: Record<string, string> = {
  zh: '中文 (Chinese)',
  en: 'English',
  ja: '日本語 (Japanese)',
  ko: '한국어 (Korean)',
};

export function registerLang(cmd: Command, rootProgram: Command): void {
  cmd.description('manage AE server language for tracking commands');

  cmd.command('set')
    .description('set the AE server language')
    .argument('<locale>', 'language code: zh / en / ja / ko')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (locale: string, opts: { host?: string }) => {
      const normalized = locale.trim().toLowerCase();
      if (!SUPPORTED.includes(normalized as Locale)) {
        console.error(`Unsupported language: "${locale}"`);
        console.error('Supported languages:');
        for (const code of SUPPORTED) {
          console.error(`  ${code} — ${SUPPORTED_LABELS[code]}`);
        }
        process.exit(1);
      }

      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      const aeCode = cliLocaleToAE(normalized as Locale);
      await client.saveUserAutoConfig(aeCode);
      process.stderr.write(`[ae-cli] Server language saved: ${aeCode}\n`);

      // Verify by querying back
      const config = await client.getUserAutoConfig();
      if (config) {
        const serverLang = config.lang ?? config.umi_locale ?? config.locale;
        console.log(`Server response: ${JSON.stringify({ lang: serverLang })}`);
      } else {
        console.log('Server response: (empty)');
      }
    });

}
