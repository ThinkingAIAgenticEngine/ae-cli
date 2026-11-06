#!/usr/bin/env python3
"""Guarded AE upload adapter. No write occurs without --confirm and all gates.

Stages: preflight (read-only) -> semantic review and user confirmation -> import
-> readback evidence. Import success is NOT declared full acceptance: an Agent
must compare readback fields/associations before reporting 'uploaded and verified'.
This adapter deliberately has no delete, replace or automatic retry operation.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit
import openpyxl

from plan_contract import (DEFAULT_TEMPLATE, PlanError, file_sha256, json_bytes,
                           normalize_plan, counts, ensure_new_path)
from finalize_plan import verify_round_trip
from prepare_delivery import REVIEW_CHECKS


class UploadError(PlanError):
    pass


def read_json(path):
    with Path(path).open(encoding='utf-8') as f:
        return json.load(f)


def write_new_json(path, obj):
    path=ensure_new_path(path)
    with path.open('xb') as f:
        f.write(json_bytes(obj))


def digest(value):
    return hashlib.sha256(json_bytes(value)).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


def check_target(project_id, host):
    if isinstance(project_id,bool) or not isinstance(project_id,int) or project_id<=0:
        raise UploadError('project_id must be a positive, verified integer')
    parsed=urlsplit(host)
    if parsed.scheme not in ('https','http') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('','/'):
        raise UploadError('host must be the verified AE origin, without credentials, query, path or fragment')
    return {'project_id':project_id,'host':host.rstrip('/')}


def local_gate(delivery, template=DEFAULT_TEMPLATE):
    root=Path(delivery).resolve()
    validation=read_json(root/'validation.json')
    if validation.get('schema_version')!=1 or validation.get('status')!='machine_passed_semantic_pending' or validation.get('machine_validation',{}).get('passed') is not True:
        raise UploadError('Delivery has not passed machine validation')
    expected=validation.get('fingerprints',{})
    for name in ('plan.normalized.json','plan.xlsx','conversation.md'):
        path=root/name
        if path.is_symlink() or not path.is_file() or file_sha256(path)!=expected.get(name):
            raise UploadError(f'Delivery changed or fingerprint missing: {name}; regenerate and review again')
    if validation['machine_validation'].get('template_sha256')!=file_sha256(template):
        raise UploadError('Template changed since validation; regenerate')
    source=normalize_plan(read_json(root/'plan.normalized.json'))
    if counts(source)!=validation.get('counts'):
        raise UploadError('Counts do not match normalized source')
    wb=openpyxl.load_workbook(root/'plan.xlsx',data_only=False)
    try:
        verify_round_trip(wb,source)
    finally:
        wb.close()
    result=subprocess.run([sys.executable,str(Path(__file__).with_name('lint_tracking_plan.py')),'--input',str(root/'plan.xlsx'),'--strict-delivery','--template',str(template)],capture_output=True,text=True,check=False)
    if result.returncode!=0:
        raise UploadError('Fresh strict lint failed; upload blocked: '+result.stdout+result.stderr)
    return root,validation,source


def require_context(cwd=None):
    path=Path(cwd or Path.cwd())/'.ae/cli-agent-context.json'
    if not path.is_file():
        raise UploadError('Agent must maintain .ae/cli-agent-context.json before gateway calls (see ae-capability skill)')
    context=read_json(path)
    for name in ('agent_client','agent_session_id','intent_source','user_intent','session_goal'):
        if not isinstance(context.get(name),str) or not context[name].strip():
            raise UploadError(f'Missing agent-context field: {name}')
    if context['intent_source']!='agent_context_file':
        raise UploadError('Invalid agent-context intent_source')
    if not context.get('agent_model') and context.get('context_capture_status')!='partial':
        raise UploadError('Confirm agent_model, or explicitly mark partial when it cannot be confirmed')


def default_runner(argv):
    env=dict(os.environ)
    env['AE_LANG']='zh'  # XLSX schema language; conversation language is independent.
    return subprocess.run(argv,capture_output=True,text=True,check=False,env=env)


def run_help(cli, command, flags, runner):
    result=runner([cli,*command,'--help'])
    text=result.stdout+'\n'+result.stderr
    if result.returncode!=0:
        raise UploadError('Unable to inspect installed command: '+' '.join(command))
    for flag in flags:
        if not re.search(re.escape(flag)+r'(?=[\s=,]|$)',text):
            raise UploadError(f'Installed command does not advertise {flag}; stop and rediscover supported interfaces')


def api(cli, command, runner):
    result=runner([cli,*command])
    try:
        envelope=json.loads(result.stdout)
    except (ValueError,TypeError) as exc:
        raise UploadError('CLI response is not one JSON envelope; outcome may be unknown; do not retry a write automatically') from exc
    if not isinstance(envelope,dict):
        raise UploadError('CLI response must be an object envelope, not a scalar/list')
    notice=envelope.get('_notice',{}).get('host_compat') if isinstance(envelope.get('_notice'),dict) else None
    if result.stderr.strip() or notice:
        print('⚠️ AE CLI warning: '+result.stderr.strip(),file=sys.stderr)
        if notice:
            print(json.dumps({'host_compat':notice},ensure_ascii=False),file=sys.stderr)
    if result.returncode!=0 or envelope.get('ok') is not True or 'data' not in envelope:
        raise UploadError('CLI operation did not return a verified success envelope: '+json.dumps(envelope,ensure_ascii=False))
    if not isinstance(envelope['data'],dict):
        raise UploadError('CLI data is inconclusive (not an object); do not infer an empty plan or accepted import')
    return envelope


def capability_contract(envelope):
    data=envelope.get('data')
    if not isinstance(data,dict):
        raise UploadError('Unsupported capability inspection envelope; inspect the deployed schema before adapting')
    identifier=data.get('capability_id',data.get('id'))
    schema=data.get('input_schema')
    if identifier!='tracking.plan.import_excel' or data.get('risk')!='write':
        raise UploadError('Unexpected or destructive capability contract; no import will run')
    if not isinstance(schema,dict) or schema.get('type')!='object' or not isinstance(schema.get('properties'),dict) or not {'project_id','input_file_id'}.issubset(schema['properties']):
        raise UploadError('Unknown import input schema; stop rather than guess input fields')
    return {'capability_id':identifier,'risk':data['risk'],'input_schema':schema}


def discover(cli, runner, target):
    # --host is a global CLI option; capability subcommand help may omit it.
    run_help(cli,[],['--host'],runner)
    run_help(cli,['tracking','plan','get'],['--project-id','--host'],runner)
    run_help(cli,['tracking','plan','import-excel'],['--project-id','--input-file','--lang','--host'],runner)
    run_help(cli,['capability','inspect'],['--project-id'],runner)
    inspected=api(cli,['capability','inspect','tracking.plan.import_excel','--project-id',str(target['project_id']),'--host',target['host']],runner)
    capability_contract(inspected)
    return inspected


def validate_baseline(envelope, target):
    """Recognize documented camelCase and draft-shaped pools; unknown is not empty.

    Live gateway variants must be inspected and deliberately adapted. This
    conservative guard never interprets null, omitted pools or scalars as empty.
    """
    data=envelope.get('data')
    if not isinstance(data,dict):
        raise UploadError('Project baseline schema is inconclusive (not an object); do not infer an empty plan')
    layouts=[('events','eventProps','commonEventProps','userProps'),
             ('events','event_props','common_event_props','user_props'),
             ('events','event_properties','common_event_properties','user_properties')]
    layout=next((keys for keys in layouts if all(isinstance(data.get(k),list) for k in keys)),None)
    if layout is None and all(isinstance(data.get(k),list) for k in ('events','event_props')):
        # Verified tracking-plan-get behavior: empty common/user pools may be
        # omitted. Events and event_props remain mandatory; null/wrong types fail.
        optional=('common_event_props','user_props')
        if all(k not in data or isinstance(data[k],list) for k in optional):
            layout=('events','event_props',*optional)
    if layout is None:
        raise UploadError('Unsupported or partial baseline pools; inspect the actual get schema before continuing')
    if data.get('projectId',data.get('project_id',target['project_id']))!=target['project_id']:
        raise UploadError('Baseline project identity does not match the confirmed target')
    for key in layout:
        if key in data and any(not isinstance(record,dict) for record in data[key]):
            raise UploadError('Baseline pool has non-object records; cannot verify business scope')
    return data


def freeze_payload(root, fingerprints):
    """Freeze exactly the reviewed bytes after the last remote read, not a mutable path."""
    payloads={}
    for name,expected in fingerprints.items():
        if name not in ('plan.normalized.json','plan.xlsx','conversation.md'):
            raise UploadError('Unexpected artifact name in fingerprint receipt')
        path=root/name
        if path.is_symlink():
            raise UploadError('Artifact became a symlink before dispatch')
        payload=path.read_bytes()
        if hashlib.sha256(payload).hexdigest()!=expected:
            raise UploadError('Artifact changed during preflight; no write dispatched: '+name)
        payloads[name]=payload
    snapshot=root/'.upload-snapshot'
    snapshot.mkdir(mode=0o700,exist_ok=False)
    for name,payload in payloads.items():
        with (snapshot/name).open('xb') as f:
            f.write(payload)
            f.flush()
            os.fchmod(f.fileno(),0o400)
    return snapshot/'plan.xlsx'


def import_errors(envelope):
    errors=[]
    def walk(value):
        if isinstance(value,dict):
            for key,item in value.items():
                if key=='eventErrorMap' and item:
                    errors.append({key:item})
                elif key=='return_code' and item not in (0,'0'):
                    errors.append({key:item})
                else:
                    walk(item)
        elif isinstance(value,list):
            for item in value: walk(item)
    walk(envelope.get('data'))
    return errors


def preflight(delivery,project_id,host,output,cli='ae-cli',runner=default_runner,context_cwd=None,template=DEFAULT_TEMPLATE):
    root,validation,_=local_gate(delivery,template)
    target=check_target(project_id,host)
    output=ensure_new_path(output,(root/'validation.json',root/'plan.normalized.json',root/'plan.xlsx'))
    require_context(context_cwd)
    schema=discover(cli,runner,target)
    baseline=api(cli,['tracking','plan','get','--project-id',str(project_id),'--host',target['host']],runner)
    validate_baseline(baseline,target)
    result={'schema_version':1,'created_at':now(),'target':target,'fingerprints':validation['fingerprints'],'baseline_sha256':digest(baseline['data']),'baseline':baseline,'import_capability':schema,'status':'read_only_preflight_complete','warning':'An empty response/error is not proof of an empty plan. Review this verified baseline before confirming an append.'}
    write_new_json(output,result)
    return result


def review_gate(review,preflight_data,validation,target):
    if review.get('schema_version')!=1 or review.get('status')!='passed':
        raise UploadError('Semantic review has not passed')
    if not isinstance(review.get('reviewer'),str) or not review['reviewer'].strip():
        raise UploadError('Semantic reviewer identity/evidence is missing')
    for obj in (review,preflight_data):
        if obj.get('fingerprints')!=validation['fingerprints'] or obj.get('target')!=target:
            raise UploadError('Review/preflight targets or artifact fingerprints do not match')
    if review.get('baseline_sha256')!=preflight_data.get('baseline_sha256'):
        raise UploadError('Review did not cover the inspected baseline')
    if review.get('blocking_unknowns')!=[] or review.get('conflicts_resolved') is not True:
        raise UploadError('Blocking unknowns or unresolved project conflicts remain')
    checks=review.get('checks',[])
    expected={key for key,_ in REVIEW_CHECKS}
    if not isinstance(checks,list) or any(not isinstance(item,dict) for item in checks):
        raise UploadError('Semantic review checks must be objects')
    if len(checks)!=len(expected) or {item.get('id') for item in checks}!=expected:
        raise UploadError('All fifteen review checks are required exactly once')
    for item in checks:
        if item.get('status') not in ('passed','not_applicable') or not isinstance(item.get('evidence'),str) or not item['evidence'].strip():
            raise UploadError('Pending/failed/unsubstantiated semantic check: '+str(item.get('id')))


def upload(delivery,project_id,host,preflight_path,review_path,confirmed=False,cli='ae-cli',runner=default_runner,context_cwd=None,template=DEFAULT_TEMPLATE):
    if confirmed is not True:
        raise UploadError('Explicit user upload confirmation is required; --confirm is not permission to delete or replace')
    root,validation,_=local_gate(delivery,template)
    target=check_target(project_id,host)
    prepared=read_json(preflight_path)
    review=read_json(review_path)
    review_gate(review,prepared,validation,target)
    if prepared.get('status')!='read_only_preflight_complete':
        raise UploadError('Read-only preflight is incomplete')
    receipt_path=ensure_new_path(root/'upload-attempt.json')
    require_context(context_cwd)
    inspected=discover(cli,runner,target)
    if capability_contract(inspected)!=capability_contract(prepared.get('import_capability',{})):
        raise UploadError('Import capability contract changed since preflight; review the new scope before writing')
    current=api(cli,['tracking','plan','get','--project-id',str(project_id),'--host',target['host']],runner)
    validate_baseline(current,target)
    if digest(current['data'])!=prepared['baseline_sha256']:
        raise UploadError('Project plan changed since review; inspect the diff and obtain fresh confirmation')
    # Recheck after slow discovery/network calls, then upload only a frozen copy.
    _,fresh_validation,source=local_gate(root,template)
    if fresh_validation['fingerprints']!=validation['fingerprints']:
        raise UploadError('Delivery validation changed during preflight; confirmation is stale')
    if source.get('meta',{}).get('blocking_unknowns'):
        raise UploadError('Source still contains blocking unknowns')
    payload_path=freeze_payload(root,validation['fingerprints'])
    # Persist a one-shot attempt BEFORE dispatch. A crash/timeout must not silently retry.
    attempt={'schema_version':1,'started_at':now(),'target':target,'fingerprints':validation['fingerprints'],'baseline_sha256':prepared['baseline_sha256'],'status':'dispatch_started_outcome_unknown','mode':'non_destructive_import','user_confirmation_supplied':True,'snapshot_file':str(payload_path),'snapshot_sha256':file_sha256(payload_path)}
    write_new_json(receipt_path,attempt)
    try:
        imported=api(cli,['tracking','plan','import-excel','--project-id',str(project_id),'--input-file',str(payload_path),'--lang','zh','--host',target['host']],runner)
        # The gateway can return success while rows are rejected: capture fresh content,
        # never claim 'verified' merely from ok=true or a zero process exit status.
        readback=api(cli,['tracking','plan','get','--project-id',str(project_id),'--host',target['host']],runner)
        errors=import_errors(imported)
        status='import_reported_errors_require_review' if errors else 'import_accepted_readback_requires_review'
        result={**attempt,'finished_at':now(),'status':status,'import_response':imported,'import_errors':errors,'readback':readback,'readback_sha256':digest(readback['data']),'management_url':target['host']+'/#/data/plan','next_step':'Compare event names, property types, associations, platform and existing items against the source and baseline; inspect per-item errors; only then report upload verified. Do not auto-run delete/replace or retry.'}
        write_new_json(root/'upload-result.json',result)
        return result
    except (OSError,ValueError,subprocess.SubprocessError) as exc:
        write_new_json(root/'upload-error.json',{**attempt,'finished_at':now(),'status':'outcome_requires_reconciliation','error':str(exc),'next_step':'Read back the target plan before any retry; preserve attempt evidence.'})
        raise


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--delivery',required=True)
    ap.add_argument('--project-id',required=True,type=int)
    ap.add_argument('--host',required=True,help='Verified AE origin; not guessed from a template')
    ap.add_argument('--ae-cli',default='ae-cli')
    ap.add_argument('--preflight',action='store_true',help='Read-only discovery and baseline capture; never uploads')
    ap.add_argument('--output',help='NEW preflight evidence JSON')
    ap.add_argument('--preflight-file')
    ap.add_argument('--review')
    ap.add_argument('--confirm',action='store_true',help='Use only after the user explicitly confirms the displayed target and plan')
    args=ap.parse_args(argv)
    try:
        if args.preflight:
            if not args.output or args.confirm or args.review or args.preflight_file:
                raise UploadError('--preflight requires --output only; do not combine with a write confirmation')
            result=preflight(args.delivery,args.project_id,args.host,args.output,args.ae_cli)
            code=0
        else:
            if not args.preflight_file or not args.review or args.output:
                raise UploadError('Upload requires --preflight-file, --review and explicit --confirm')
            result=upload(args.delivery,args.project_id,args.host,args.preflight_file,args.review,args.confirm,args.ae_cli)
            code=3  # accepted, but remote acceptance still requires comparison by the Agent
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return code
    except (OSError,ValueError,KeyError) as exc:
        print(f'ERROR: {exc}',file=sys.stderr)
        return 1


if __name__=='__main__':
    raise SystemExit(main())
