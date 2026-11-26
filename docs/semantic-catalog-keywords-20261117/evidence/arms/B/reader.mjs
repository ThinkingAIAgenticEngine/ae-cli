#!/usr/bin/env node
// Read a single downloaded catalog in bounded pages. Never fetch or search server data.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function catalogPages(envelope, budget = 8000) {
  let catalog = envelope;
  for (let level = 0; level < 4 && !Array.isArray(catalog?.items); level++) catalog = catalog?.data;
  if (!catalog || catalog.complete !== true || catalog.truncated === true || !Array.isArray(catalog.items)
      || catalog.items.length !== catalog.total) throw new Error('The server catalog is incomplete. Do not analyze from a preview or legacy bounded response.');
  if (!Number.isSafeInteger(budget) || budget < 2000 || budget > 16000) throw new Error('Page budget must be 2000-16000 characters.');
  const pages = [[]];
  let size = 0;
  const seen = new Set();
  for (const row of catalog.items) {
    if (!row || typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.summary !== 'string'
        || !Number.isSafeInteger(row.revision) || seen.has(row.id)) throw new Error('Catalog row identity, revision or summary is invalid.');
    if (row.keywords !== undefined && (!Array.isArray(row.keywords)
        || row.keywords.some(keyword => typeof keyword !== 'string'))) throw new Error('Catalog keywords must be an array of strings.');
    seen.add(row.id);
    const entry = { id: row.id, revision: row.revision, title: row.title, summary: row.summary, keywords: row.keywords ?? [], expired: row.expired === true };
    const length = JSON.stringify(entry).length + 1;
    if (length > budget) throw new Error(`Entry ${row.id} exceeds the page budget; increase the budget without truncating its summary or keywords.`);
    if (size + length > budget && pages.at(-1).length) { pages.push([]); size = 0; }
    pages.at(-1).push(entry); size += length;
  }
  return pages.map((items, index) => ({ catalog_complete: true, total: catalog.total, page: index + 1, total_pages: pages.length,
    remaining_pages: pages.length - index - 1, items, instruction: index + 1 < pages.length ? 'Read the next page from this SAME local file before choosing entries.' : 'End of catalog. Select only after all earlier pages have been read.' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, pageArg = '1'] = process.argv.slice(2);
    const page = Number(pageArg);
    if (!file || !Number.isSafeInteger(page) || page < 1) throw new Error('Usage: read-semantic-catalog.mjs <catalog.json> [page-number]');
    const pages = catalogPages(JSON.parse(readFileSync(file, 'utf8')));
    if (page > pages.length) throw new Error(`Page must not exceed ${pages.length}.`);
    process.stdout.write(JSON.stringify(pages[page - 1]) + '\n');
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
