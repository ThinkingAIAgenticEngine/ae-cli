import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import commands, { schemaImportCommands, schemaImportApply, schemaImportOptimize, schemaImportSave, executeSchemaImport, waitSchemaImport } from '../src/commands/te-kb/index.ts';
function ctx(values={}) {return {str:key=>String(values[key]??''),num:key=>Number(values[key]??0),bool:key=>Boolean(values[key]),list:key=>values[key]??[],host:()=> 'https://example.test'};}
test('all twelve approved commands are registered and apply requires an explicit formal identity',()=>{
 assert.equal(schemaImportCommands.length,12);for(const command of schemaImportCommands)assert.ok(commands.includes(command));
 assert.throws(()=>schemaImportApply.validate(ctx({'schema-hash':'a'.repeat(64),'schema-absent':true})),/exactly one/);
 assert.throws(()=>schemaImportApply.validate(ctx({})),/exactly one/);
 assert.doesNotThrow(()=>schemaImportApply.validate(ctx({'schema-absent':true})));
 const input=ctx({'import-id':'candidate',revision:3,'request-id':'apply-1',hash:'a'.repeat(64),'report-id':'b'.repeat(64),'schema-absent':true});
 assert.deepEqual(schemaImportApply.dryRun(input).body,{expectedRevision:3,requestId:'apply-1',contentHash:'a'.repeat(64),reportId:'b'.repeat(64),expectedSchemaHash:null});
 assert.equal(schemaImportCommands.find(c=>c.command==='+schema-import-abandon').risk,'high-risk-write');
});
test('save and upload preserve BOM/CRLF, redact dry-run and send canonical fields',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'schema-cli-'));try{
 const file=path.join(root,'rules.MD'),bytes=Buffer.from('\uFEFF# Rules\r\nBusiness scope is product A only.\r\n');await writeFile(file,bytes);
 const input=ctx({file,name:'KB',scope:'company','request-id':'request','import-id':'i',revision:2});
 const requests=[];const api=async(...args)=>{requests.push(args);return {id:'i',task:null};};
 const upload=async(...args)=>{requests.push(args);return {id:'i',task:null};};
 await executeSchemaImport(input,'save',api,upload);assert.equal(requests[0][1],'PUT');assert.equal(requests[0][4].content,bytes.toString('utf8'));assert.equal(requests[0][5].preserveBusinessErrorCode,true);
 assert.equal(schemaImportSave.dryRun(input).body.content,'[REDACTED]');
 await executeSchemaImport(input,'upload',api,upload);const form=requests[1][2];assert.deepEqual(Buffer.from(await form.get('file').arrayBuffer()),bytes);assert.equal(form.get('scope'),'company');assert.equal(requests[1][4].preserveBusinessErrorCode,true);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('downloads preserve raw bytes and never overwrite files',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'schema-download-'));try{
 const output=path.join(root,'CLAUDE.md'),bytes=Buffer.from([239,187,191,13,10]);
 const input=ctx({output,name:'KB'});const api=async(...args)=>{assert.equal(args[5].responseType,'bytes');assert.equal(args[3].download,'1');return bytes;};
 await executeSchemaImport(input,'download',api);assert.deepEqual(await readFile(output),bytes);
 await assert.rejects(()=>executeSchemaImport(input,'download',api),/EEXIST/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('selected issues repeat and wait never calls abandon',async()=>{
 const input=ctx({'import-id':'i',revision:2,'request-id':'r',hash:'a'.repeat(64),'issue-id':['one','two']});
 assert.deepEqual(schemaImportOptimize.dryRun(input).body.issueIds,['one','two']);
 const calls=[];const result=await waitSchemaImport(ctx({timeout:1}),{id:'i',task:{attemptId:'attempt'}},async(...args)=>{calls.push(args);return {id:'i',status:'needs_action',task:null};},async()=>{});
 assert.equal(result.waitTimedOut,false);assert.equal(calls.length,1);assert.equal(calls[0][1],'GET');assert.ok(calls[0][2].endsWith('/imports/i'));
});
test('BASE_CHANGED is preserved without an automatic second application',async()=>{
 let calls=0;const failure=Object.assign(new Error('BASE_CHANGED'),{code:'KB_SCHEMA_IMPORT_BASE_CHANGED'});
 await assert.rejects(()=>executeSchemaImport(ctx({'import-id':'i',revision:2,'request-id':'r',hash:'a'.repeat(64),'report-id':'b'.repeat(64),'schema-absent':true}),'apply',async()=>{calls++;throw failure;}),failure);
 assert.equal(calls,1);
});
