import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personalSemanticPreferenceList } from '../src/commands/personal-semantic-preference/list.js';
import { personalSemanticPreferenceGet } from '../src/commands/personal-semantic-preference/get.js';
import { personalSemanticPreferenceAdd } from '../src/commands/personal-semantic-preference/add.js';
import { personalSemanticPreferenceUpdate } from '../src/commands/personal-semantic-preference/update.js';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';
import type { RuntimeContext } from '../src/framework/types.js';
const host='https://business-semantic.example.test';
setCliTokenManual('synthetic-local-test',host);
const oldFetch=globalThis.fetch;
let input: Record<string, unknown>={};
let url='';
globalThis.fetch=(async (address, options)=>{
 url=String(address); input=JSON.parse(String(options?.body)).input;
 return new Response(JSON.stringify({ok:true,data:{dry_run:true}}),{status:200});
}) as typeof fetch;
function context(values:Record<string,unknown>):RuntimeContext {
 return {host:()=>host,str:(key)=>values[key]===undefined?'':typeof values[key]==='string'?values[key]:JSON.stringify(values[key]),num:(key)=>Number(values[key]||0),optionalNum:(key)=>values[key]===undefined?undefined:Number(values[key]),bool:(key)=>values[key]===true,json:(key)=>values[key],list:()=>[]} as RuntimeContext;
}
try {
 assert.ok(!personalSemanticPreferenceList.flags.some(flag=>flag.name==='all'), 'The full catalog is the only list behavior; no mode flag is exposed.');
 for (const projectId of [6,-1]) {
  for (const invoke of [personalSemanticPreferenceList.validateInput!,personalSemanticPreferenceList.dryRun!,personalSemanticPreferenceList.execute]) {
   await invoke(context({'project-id':projectId}));
   assert.deepEqual(input,{project_id:projectId}, 'Every list transport sends only the selected scope.');
   assert.match(url,projectId===-1?/global_personal_context.list/:/business_semantics.personal_context.list/);
  }
 }
 const candidate={'project-id':6,id:'preference_31',title:'Rule'};
 await personalSemanticPreferenceGet.dryRun!(context(candidate));
 assert.equal(input.mark_used,false,'Candidate and maintenance reads must not count as adoption.');
 await personalSemanticPreferenceGet.dryRun!(context({...candidate,'mark-used':true}));
 assert.equal(input.mark_used,true,'Adoption remains an explicit, separate get flag.');
 const flags={'project-id':6,id:'preference_31',title:'Rule','include-expired':true};
 await personalSemanticPreferenceGet.dryRun!(context(flags));
 assert.equal(input.include_expired,true);
 assert.throws(()=>personalSemanticPreferenceGet.validate!(context({...flags,'mark-used':true})),/cannot be combined/);
 const source={name:'rule.md',input_file_id:'file_fixture'};
 const values={'project-id':6,'context-type':'business_rule',title:'Active users',summary:'Login users',content:'Count users with login events','applicable-question':'Monthly active users','dependency-ids':['preference_20'],sources:[source],'request-id':'import:rule-1'};
 const write=context(values);
 personalSemanticPreferenceAdd.validate!(write);
 await personalSemanticPreferenceAdd.dryRun!(write);
 assert.deepEqual(input.sources,[source]);
 assert.ok(!JSON.stringify(input.sources).includes('excerpt'));
 assert.deepEqual(input.dependency_ids,['preference_20']);
 assert.equal(input.request_id,'import:rule-1');
 assert.equal(input.applicable_question,'Monthly active users');
 for (const command of [personalSemanticPreferenceAdd, personalSemanticPreferenceUpdate]) {
  for (const sources of [[{name:'rule.md'}], [{evidence_id:'7'}], [{...source,excerpt:'Confirmed definition',location:'line 3'}]]) {
   await command.dryRun!(context({...values,id:'preference_31','expected-revision':1,sources}));
   assert.deepEqual(input.sources,sources,'Filename-only saves, evidence reuse and explicit existing descriptors preserve their transport.');
  }
 }
 const skill=readFileSync(new URL('../skills/ae-analysis/references/business_semantics_workspace.md',import.meta.url),'utf8');
 for(const pattern of [/same conversation NEVER reloads directories/,/every item has actually entered model context/,/CURRENT details/,/Topologically save dependencies first/,/SAME request_id and identical payload/,/Uploading a file alone does not authorize public writes/,/Private originals remain private/,/Personal saves remain successful/,/current explicit user intent first/,/No company-level entry semantics exist/,/Keywords are model-visible selection hints/,/no literal keyword match is required/,/often 2–5/,/Keep the complete business phrase/,/Use an empty array when title and summary already cover/,/Preserve existing supported aliases/,/each limited to 5,000/,/Do not truncate automatically/,/restoration copies the full history into a draft/])assert.match(skill,pattern);
 console.log('Business semantic full catalog, adoption flags, source transport and workflow contracts passed.');
} finally {globalThis.fetch=oldFetch;clearCliToken(host);}
