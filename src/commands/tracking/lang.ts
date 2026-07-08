import { Command } from 'commander';
import { detectCliLocale, type Locale } from '../../tracking/i18n/locale.js';

const SUPPORTED = ['zh', 'en', 'ja', 'ko'] as const;
const SUPPORTED_LABELS: Record<string, string> = {
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
};

export function registerLang(cmd: Command, _rootProgram: Command): void {
  cmd.description('manage local language hints for tracking commands');

  cmd.command('status')
    .description('show local language settings for tracking commands')
    .action(() => {
      const aeLang = process.env.AE_LANG?.trim() || '(unset)';
      const lang = process.env.LANG?.trim() || '(unset)';
      console.log('CLI language settings:');
      console.log(`- AE_LANG: ${aeLang}`);
      console.log(`- LANG: ${lang}`);
      console.log(`- resolved: ${detectCliLocale()}`);
    });

  cmd.command('set')
    .description('print the AE_LANG value to use for subsequent commands')
    .argument('<locale>', 'language code: zh / en / ja / ko')
    .action((locale: string) => {
      const normalized = locale.trim().toLowerCase();
      if (!SUPPORTED.includes(normalized as Locale)) {
        console.error(`Unsupported language: "${locale}"`);
        console.error('Supported languages:');
        for (const code of SUPPORTED) {
          console.error(`  ${code} - ${SUPPORTED_LABELS[code]}`);
        }
        process.exit(1);
      }

      console.log('Use this environment variable for subsequent commands:');
      console.log(`export AE_LANG=${normalized}`);
      console.log(`AE_LANG=${normalized} ae-cli tracking plan draft --in .ae-cli/draft.json --out .ae-cli/draft.xlsx`);
    });

}
