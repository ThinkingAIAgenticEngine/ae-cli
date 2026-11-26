import {readFileSync,appendFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const rows=JSON.parse(readFileSync(resolve(here,'../../fixture/rows.json'),'utf8'));
const ids=process.argv.slice(2);if(!ids.length)throw Error('Provide exact catalog IDs.');
const found=ids.map(id=>{const row=rows.find(r=>r.id===id);if(!row)throw Error('Unknown ID '+id);return {id:row.id,content:row.content,dependency_ids:row.dependency_ids||[],expired:row.expired===true};});
appendFileSync(resolve(here,'detail-reads.jsonl'),JSON.stringify({ids,returned:found})+'\n');
process.stdout.write(JSON.stringify(found)+'\n');
