import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogPages } from '../skills/ae-analysis/scripts/read-semantic-catalog.mjs';
const items=Array.from({length:2000},(_,index)=>({id:`preference_${index}`,revision:1,title:`Rule ${index}`,summary:'Use login users, not registered users; exclude test accounts.',keywords:index===0?['login-based daily active players','DAU excluding test accounts']:[],expired:index===0}));
test('all 2000 rows and negative conditions reach bounded pages exactly once',()=>{
 const pages=catalogPages({ok:true,data:{items,total:2000,complete:true}},2000);
 const result=pages.flatMap(page=>page.items);
 assert.deepEqual(result,items);
 assert.equal(result[0].expired,true);
 assert.equal(pages.at(-1).remaining_pages,0);
 assert.ok(pages.length>1);
 for(const page of pages)assert.ok(JSON.stringify(page.items).length<2100);
});
test('partial, legacy, duplicate and corrupted catalogs cannot masquerade as complete',()=>{
 for(const catalog of [{items,total:2001,complete:true},{items,total:2000,truncated:true,complete:true},{items,total:2000},{items:[items[0],items[0]],total:2,complete:true}])assert.throws(()=>catalogPages(catalog));
});
test('empty catalogs are explicit, and long summaries are never silently shortened',()=>{
 assert.deepEqual(catalogPages({items:[],total:0,complete:true})[0].items,[]);
 const row={...items[0],summary:'x'.repeat(3000)};
 assert.throws(()=>catalogPages({items:[row],total:1,complete:true},2000),/exceeds/);
 assert.equal(catalogPages({items:[row],total:1,complete:true})[0].items[0].summary.length,3000);
});

test('keywords are preserved in every bounded page without truncation or search',()=>{
 const row={...items[0],keywords:['first-install seven-day ROI','new-player payback','星厨赛参赛资格']};
 const result=catalogPages({items:[row],total:1,complete:true})[0].items[0];
 assert.deepEqual(result.keywords,row.keywords);
 assert.throws(()=>catalogPages({items:[{...row,keywords:'ROI'}],total:1,complete:true}),/keyword/i);
 assert.throws(()=>catalogPages({items:[{...row,keywords:[1]}],total:1,complete:true}),/keyword/i);
 const without={...row}; delete without.keywords;
 assert.deepEqual(catalogPages({items:[without],total:1,complete:true})[0].items[0].keywords,[]);
});

test('long keyword phrases are never silently cut to fit a page',()=>{
 const row={...items[0],keywords:['distinctive concept '+ 'x'.repeat(3000)]};
 assert.throws(()=>catalogPages({items:[row],total:1,complete:true},2000),/summary or keywords/);
 assert.deepEqual(catalogPages({items:[row],total:1,complete:true})[0].items[0].keywords,row.keywords);
});
