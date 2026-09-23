import { promises as fs } from 'node:fs';
import path from 'node:path';
import { kbApi, kbUpload } from '../../core/mcp-access.js';
import { CliValidationError } from '../../core/errors.js';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const ROOT = '/agent/api/external/knowledge-bases/schema';
const options = { preserveBusinessErrorCode: true, preserveErrorMetadata: true };
const flag = (name: string, type: Flag['type'], desc: string, required = false): Flag => ({ name, type, desc, required });
const targetFlags = [flag('name','string','Knowledge base name',true),flag('scope','string','Exact scope: personal | company')];
const identityFlags = [flag('import-id','string','Stable import ID',true)];
const mutationFlags = [flag('revision','number','Expected candidate revision',true),flag('request-id','string','Idempotency key; reuse only for identical retries',true)];
const hashFlag = flag('hash','string','Expected candidate SHA256',true);
const fileFlag = {...flag('file','string','Local UTF-8 Markdown file, at most 256 KiB',true),sensitive:true};
const waitFlags = [flag('wait','boolean','Poll until this task finishes; never abandon on timeout'),{...flag('timeout','number','Wait timeout in seconds'),default:300,min:1,max:3600}];
const modelFlag = flag('model','string','Optional stable model reference');
type Action='download'|'upload'|'list'|'status'|'content'|'diff'|'save'|'validate'|'optimize'|'reject'|'apply'|'abandon';
function target(ctx:RuntimeContext){return {name:ctx.str('name'),scope:getExternalKnowledgeBaseTargetScope(ctx)};}
function endpoint(ctx:RuntimeContext,action:Action) {
  if(action==='download')return ROOT;
  if(action==='upload'||action==='list')return ROOT+'/imports';
  const suffix=action==='status'?'':action==='save'?'content':action==='reject'?'reject-optimization':action;
  return `${ROOT}/imports/${encodeURIComponent(ctx.str('import-id'))}${suffix?'/'+suffix:''}`;
}
function body(ctx:RuntimeContext,action:Action) {
  const result:Record<string,unknown>={expectedRevision:ctx.num('revision'),requestId:ctx.str('request-id')};
  if(['validate','optimize','apply'].includes(action))result.contentHash=ctx.str('hash');
  if(['validate','optimize'].includes(action)&&ctx.str('model'))result.model=ctx.str('model');
  if(action==='optimize'&&ctx.list('issue-id').length)result.issueIds=ctx.list('issue-id');
  if(action==='apply'){result.reportId=ctx.str('report-id');result.expectedSchemaHash=ctx.bool('schema-absent')?null:ctx.str('schema-hash');}
  return result;
}
function query(ctx:RuntimeContext,action:Action){
  if(action==='download')return {...target(ctx),download:'1'};
  if(action==='list')return {...target(ctx),limit:ctx.num('limit')||20,cursor:ctx.str('cursor')||undefined};
  if(action==='content')return {target:ctx.str('target')||'current',download:ctx.str('output')?'1':undefined};
  if(action==='diff')return {baseline:ctx.str('baseline')||'current-schema'};
  return {};
}
function validate(ctx:RuntimeContext,action:Action){
  if(['upload','list','download'].includes(action))getExternalKnowledgeBaseTargetScope(ctx);
  for(const name of ['import-id','request-id','replaces-import-id'])if(ctx.str(name)&&!/^[A-Za-z0-9_-]{1,191}$/.test(ctx.str(name)))throw new CliValidationError(`Invalid --${name}`);
  for(const name of ['hash','schema-hash','report-id'])if(ctx.str(name)&&!/^[a-f0-9]{64}$/.test(ctx.str(name)))throw new CliValidationError(`Invalid --${name}; expected SHA256`);
  for(const name of ['revision','replaced-revision'])if(ctx.num(name)&&(!Number.isInteger(ctx.num(name))||ctx.num(name)<1))throw new CliValidationError(`Invalid --${name}`);
  if(action==='apply'&&Boolean(ctx.str('schema-hash'))===ctx.bool('schema-absent'))throw new CliValidationError('Specify exactly one of --schema-hash or --schema-absent');
  if(action==='upload'&&Boolean(ctx.str('replaces-import-id'))!==Boolean(ctx.num('replaced-revision')))throw new CliValidationError('Replacement requires --replaces-import-id and --replaced-revision');
  if(action==='content'&&!['current','original','optimization-input','optimized'].includes(ctx.str('target')||'current'))throw new CliValidationError('Invalid --target');
  if(action==='diff'&&!['original','optimization-input','current-schema'].includes(ctx.str('baseline')||'current-schema'))throw new CliValidationError('Invalid --baseline');
}
async function readMarkdown(ctx:RuntimeContext){
  const absolute=path.resolve(ctx.str('file')),stat=await fs.stat(absolute);
  if(!stat.isFile()||stat.size>262144||path.extname(absolute).toLowerCase()!=='.md')throw new CliValidationError('--file must be a Markdown file of at most 256 KiB');
  const bytes=await fs.readFile(absolute);if(bytes.length>262144)throw new CliValidationError('--file exceeds 256 KiB');
  new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  return {absolute,bytes};
}
export async function waitSchemaImport(ctx:RuntimeContext,initial:any,api=kbApi,sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))){
  const deadline=Date.now()+(ctx.num('timeout')||300)*1000;let current=initial;
  while(current.task&&Date.now()<deadline){await sleep(Math.min(2000,Math.max(1,deadline-Date.now())));current=await api(ctx,'GET',`${ROOT}/imports/${encodeURIComponent(initial.id)}`,{},undefined,options);}
  return {...current,waitTimedOut:Boolean(current.task)};
}
export async function executeSchemaImport(ctx:RuntimeContext,action:Action,api=kbApi,upload=kbUpload){
  let result:any;
  if(action==='upload'){
    const {absolute,bytes}=await readMarkdown(ctx);const form=new FormData();
    form.set('file',new Blob([new Uint8Array(bytes)]),path.basename(absolute));form.set('name',ctx.str('name'));form.set('requestId',ctx.str('request-id'));
    const scope=getExternalKnowledgeBaseTargetScope(ctx);if(scope)form.set('scope',scope);if(ctx.str('model'))form.set('model',ctx.str('model'));
    if(ctx.str('replaces-import-id')){form.set('replacesImportId',ctx.str('replaces-import-id'));form.set('expectedReplacedRevision',String(ctx.num('replaced-revision')));}
    result=await upload(ctx,endpoint(ctx,action),form,{},options);
  }else if(['download','list','status','content','diff'].includes(action)){
    const binary=action==='download'||(action==='content'&&Boolean(ctx.str('output')));
    result=await api(ctx,'GET',endpoint(ctx,action),query(ctx,action),undefined,{...options,...(binary?{responseType:'bytes' as const}:{})});
    if(binary){const output=path.resolve(ctx.str('output'));const bytes=Buffer.from(result);await fs.writeFile(output,bytes,{flag:'wx'});return {output,sizeBytes:bytes.length};}
    if(action==='diff'&&ctx.str('output')){const output=path.resolve(ctx.str('output'));await fs.writeFile(output,result.diff,{flag:'wx'});return {...result,output};}
  }else{
    const input=body(ctx,action);
    if(action==='save'){const {bytes}=await readMarkdown(ctx);input.content=bytes.toString('utf8');}
    result=await api(ctx,action==='save'?'PUT':'POST',endpoint(ctx,action),{},input,options);
  }
  return ctx.bool('wait')&&result.task?waitSchemaImport(ctx,result,api):result;
}
function command(action:Action,name:string,description:string,flags:Flag[],risk:Command['risk']):Command{
  return {service:'kb',command:name,description,flags,risk,validate:ctx=>validate(ctx,action),dryRun:ctx=>({method:action==='save'?'PUT':['upload','validate','optimize','reject','apply','abandon'].includes(action)?'POST':'GET',url:ctx.host().replace(/\/$/,'')+endpoint(ctx,action),params:query(ctx,action),body:action==='upload'?{...target(ctx),requestId:ctx.str('request-id'),file:'[REDACTED]',model:ctx.str('model')||undefined,replacesImportId:ctx.str('replaces-import-id')||undefined,expectedReplacedRevision:ctx.num('replaced-revision')||undefined}:['save','validate','optimize','reject','apply','abandon'].includes(action)?{...body(ctx,action),...(action==='save'?{content:'[REDACTED]'}:{})}:undefined}),execute:ctx=>executeSchemaImport(ctx,action)};
}
export const schemaDownload=command('download','+schema-download','Download formal schema bytes without rewriting.',[...targetFlags,flag('output','string','New destination file; never overwrite',true)],'read');
export const schemaImport=command('upload','+schema-import','Upload a candidate and start validation; formal schema is unchanged.',[...targetFlags,fileFlag,flag('request-id','string','Upload idempotency key',true),modelFlag,flag('replaces-import-id','string','Explicit pending import to replace'),flag('replaced-revision','number','Expected revision of replaced import'),...waitFlags],'write');
export const schemaImportList=command('list','+schema-import-list','List your pending candidates.',[...targetFlags,{...flag('limit','number','Page size, 1 to 100'),default:20,min:1,max:100},flag('cursor','string','Continuation cursor')],'read');
export const schemaImportStatus=command('status','+schema-import-status','Read candidate status, report and durable receipt.',[...identityFlags,...waitFlags],'read');
export const schemaImportContent=command('content','+schema-import-content','Read or download unmodified candidate bytes.',[...identityFlags,flag('target','string','current | original | optimization-input | optimized'),flag('output','string','Optional new destination file')],'read');
export const schemaImportDiff=command('diff','+schema-import-diff','Read full actual diff and current formal hash.',[...identityFlags,flag('baseline','string','original | optimization-input | current-schema'),flag('output','string','Optional new diff file')],'read');
export const schemaImportSave=command('save','+schema-import-save','Save edits without calling a model.',[...identityFlags,...mutationFlags,fileFlag],'write');
export const schemaImportValidate=command('validate','+schema-import-validate','Validate this exact saved revision.',[...identityFlags,...mutationFlags,hashFlag,modelFlag,...waitFlags],'write');
export const schemaImportOptimize=command('optimize','+schema-import-optimize','Repair selected issues once and independently revalidate.',[...identityFlags,...mutationFlags,hashFlag,modelFlag,{...flag('issue-id','string','Repeat to select repairable issues'),variadic:true},...waitFlags],'write');
export const schemaImportReject=command('reject','+schema-import-reject','Restore the most recent repair input.',[...identityFlags,...mutationFlags],'write');
export const schemaImportApply=command('apply','+schema-import-apply','Apply after reviewing full diff; BASE_CHANGED requires a new review.',[...identityFlags,...mutationFlags,hashFlag,flag('report-id','string','Current passing report ID',true),flag('schema-hash','string','Formal hash from a recent diff'),flag('schema-absent','boolean','Explicitly confirm formal schema is absent')],'write');
export const schemaImportAbandon=command('abandon','+schema-import-abandon','Abandon candidate and invalidate pending tasks.',[...identityFlags,...mutationFlags],'high-risk-write');
export const schemaImportCommands=[schemaDownload,schemaImport,schemaImportList,schemaImportStatus,schemaImportContent,schemaImportDiff,schemaImportSave,schemaImportValidate,schemaImportOptimize,schemaImportReject,schemaImportApply,schemaImportAbandon];
