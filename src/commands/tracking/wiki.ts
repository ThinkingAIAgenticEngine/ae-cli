import { Command } from 'commander';
import { searchIndex } from '../../tracking/wiki-query/query.js';
import { t } from '../../tracking/i18n/translate.js';

export function registerWiki(cmd: Command): void {
  cmd.description('AE docs wiki (bundled)');

  cmd.command('query')
    .description('Search bundled AE docs wiki index by keyword')
    .requiredOption('--keyword <kw>', 'substring to search in index')
    .action((opts: { keyword: string }) => {
      const hits = searchIndex(opts.keyword);
      for (const h of hits) console.log(`${h.name}\t${h.rawPath}\t${h.sourceUrl}`);
    });

  cmd.command('sync')
    .description('Refresh wiki from docs-v2 (developer only; disabled in published package)')
    .action(async () => {
      console.error(t('wiki.sync_not_supported'));
      console.error(t('wiki.not_in_published_package'));
      process.exit(2);
    });
}
