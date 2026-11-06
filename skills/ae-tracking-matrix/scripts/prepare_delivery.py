#!/usr/bin/env python3
"""Prepare a conversation-first delivery, with optional 11-sheet XLSX output.

All artifacts derive from one normalized source. This command is entirely local;
it NEVER uploads. Conversation-only mode defers Excel until the user chooses it.
A clean lint is not equivalent to semantic review or consent.
"""
from __future__ import annotations
import argparse
import html
import json
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

from finalize_plan import write_finalized_plan
from plan_contract import (DEFAULT_TEMPLATE, PlanError, normalize_plan, counts,
                           json_bytes, file_sha256)

REVIEW_CHECKS = (
    ("metric_coverage", "Metrics can be computed from the selected events, grain and windows"),
    ("identity", "Identity rules match account/guest/multi-role design"),
    ("trigger_semantics", "Names, triggers, examples and reporting granularity agree"),
    ("property_registry", "Same-name properties have consistent meaning/type/unit/enumeration"),
    ("preset_fields", "No duplicated preset fields or invented auto-collection guarantees"),
    ("object_structure", "Object/object-group cardinality and child schemas are appropriate"),
    ("correlation", "Request/result and exposure/click chains have valid join keys"),
    ("reporting_authority", "Client/server authority and dual-report deduplication are explicit"),
    ("ads_chain", "IAA: ad_show/complete/reward/fail covered; revenue callback/TBC explicitly addressed"),
    ("attribution", "First-touch first_media_source/first_campaign separated from current attribution"),
    ("user_updates", "User update operation matches type; SDK deletion is not a plan declaration"),
    ("privacy", "Personal data fields have a stated need and minimization review"),
    ("existing_plan_diff", "Additions/renames/removals and existing-plan conflicts are disclosed"),
    ("language_and_counts", "Reply language follows the user; event/property counts match source"),
    ("unknowns_and_delivery", "No blocking unknowns; chat and selected delivery artifacts are consistent; no unrequested Excel"),
)


def cell(value):
    value=html.escape(str(value),quote=False)
    for char in ("\\", "|", "`", "[", "]", "*", "_"):
        value=value.replace(char,"\\"+char)
    return value.replace("\r\n","\n").replace("\n","<br>")


def table(headers, rows):
    result=["| "+" | ".join(cell(v) for v in headers)+" |", "| "+" | ".join("---" for _ in headers)+" |"]
    result.extend("| "+" | ".join(cell(v) for v in row)+" |" for row in rows)
    return "\n".join(result)


def render_context(value, zh):
    if value is None or value == "" or value == [] or value == {}:
        return "待确认／未提供；不据此推断事实。" if zh else "TBC / not supplied; no fact is inferred."
    if isinstance(value,str):
        return cell(value)
    if isinstance(value,list) and all(isinstance(v,str) for v in value):
        return "\n".join("- "+cell(v) for v in value)
    if isinstance(value,list) and value and all(isinstance(v,dict) for v in value):
        headers=list(dict.fromkeys(key for item in value for key in item))
        return table(headers,[[item.get(key,"") for key in headers] for item in value])
    if isinstance(value,dict):
        return table(["字段","内容"] if zh else ["Field","Value"],list(value.items()))
    return cell(value)


def render_conversation(plan, language="zh", machine_passed=False, review_only=False):
    zh=language=="zh"
    metrics=counts(plan)
    title=plan.get("meta",{}).get("product_name") or ("埋点方案" if zh else "Tracking plan")
    if review_only:
        intro=("这是可在对话中直接审阅的方案概览。当前仅生成会话内容，尚未生成 Excel，也未同步至埋点管理页面。" if zh else "Review this plan overview in the conversation. No Excel file has been generated and nothing has been synced to Tracking Management.")
        schema_note=("请先审阅方案并选择交付方式；选择之前不会自动生成 Excel 或执行同步。" if zh else "Review the plan and choose a delivery method; no Excel generation or sync starts before your choice.")
    else:
        intro=("这是可在对话中直接审阅的方案；配套完整 11-sheet 文件为 `plan.xlsx`。两者来自同一份方案数据。" if zh else "Review this plan directly in the conversation. The accompanying `plan.xlsx` contains all 11 sheets and uses the same source data.")
        schema_note=("文件固定使用中文导入表头和类型枚举，业务内容不强制翻译。" if zh else "The XLSX uses the verified Chinese import headers and type enums; business content is not translated.")
    parts=[f"# {cell(title)}", intro,
           (f"事件：{metrics['events']}；事件属性行：{metrics['event_property_rows']}；去重事件属性：{metrics['event_properties_unique']}；公共属性：{metrics['common_event_properties']}；用户属性：{metrics['user_properties']}。" if zh else f"Events: {metrics['events']}; event-property rows: {metrics['event_property_rows']}; unique event properties: {metrics['event_properties_unique']}; common properties: {metrics['common_event_properties']}; user properties: {metrics['user_properties']}."),
           schema_note, "## "+("用户 ID 体系" if zh else "Identity rules")]
    ids=[[p['product_type'],p['property_name'],p['display_name'],p['assignment'],p['description'],p.get('remarks','')] for p in plan['user_id_sheet']]
    parts.append(table(["产品类型","属性名","显示名","赋值规则","说明","备注"] if zh else ["Product","Property","Display name","Assignment","Description","Notes"], ids))
    parts.append("## "+("事件总览" if zh else "Event overview"))
    parts.append(table(["事件名","显示名","触发说明","模块","采集端","属性数"] if zh else ["Event","Display name","Trigger","Module","Collection side","Properties"],[[e['event_name'],e['display_name'],e['description'],e['tag'],e['platform'],len(e['properties'])] for e in plan['events']]))
    parts.append("## "+("事件属性明细" if zh else "Event property details"))
    rows=[[e['event_name'],p['property_name'],p['display_name'],p['property_type'],p['description']] for e in plan['events'] for p in e['properties']]
    parts.append(table(["事件","属性名","显示名","类型","说明"] if zh else ["Event","Property","Display name","Type","Description"],rows))
    parts.append("## "+("公共事件属性" if zh else "Common event properties"))
    parts.append(table(["属性名","显示名","类型","说明"] if zh else ["Property","Display name","Type","Description"],[[p['property_name'],p['display_name'],p['property_type'],p['description']] for p in plan['common_event_properties']]))
    parts.append("## "+("用户属性" if zh else "User properties"))
    parts.append(table(["属性名","显示名","类型","更新操作","说明"] if zh else ["Property","Display name","Type","Update operation","Description"],[[p['property_name'],p['display_name'],p['property_type'],p['update_method'],p['description']] for p in plan['user_properties']]))
    for key,cn,en in (("business_context","业务范围与口径","Business scope and definitions"),("notes","埋点注意事项","Tracking notes"),("timezone","时区说明","Timezone"),("metric_mapping","指标与事件映射","Metric-to-event mapping"),("change_log","变更与差异","Change log and differences"),("assumptions","假设与依据","Assumptions and evidence"),("open_questions","待确认项","Open questions"),("blocking_unknowns","阻塞项","Blocking unknowns")):
        parts.append("## "+(cn if zh else en))
        parts.append(render_context(plan.get('meta',{}).get(key),zh))
    if review_only:
        parts.append("## "+("请选择交付方式" if zh else "Choose a delivery method"))
        if zh:
            parts.append("1. **直接同步至数数埋点管理页面**：不生成本地 Excel。完成目标项目、已有方案冲突和业务语义检查后，我会再向你确认具体项目与同步范围。\n2. **生成本地 Excel 文件**：选择后才生成完整 11-sheet Excel，并执行对应校验。")
            parts.append("请回复“同步至埋点管理”或“生成本地 Excel”。当前尚未生成 Excel，也未执行同步。")
        else:
            parts.append("1. **Sync directly to ThinkingData Tracking Management**: no local Excel deliverable. After target, baseline-conflict and semantic checks, I will confirm the exact project and sync scope with you.\n2. **Generate a local Excel file**: the complete 11-sheet workbook and its validation run only after you choose this option.")
            parts.append("Reply 'Sync to Tracking Management' or 'Generate local Excel'. No Excel has been generated and no sync has run.")
    else:
        parts.append("## "+("验证与上传" if zh else "Validation and upload"))
        if zh:
            parts.append("机器校验："+("通过。" if machine_passed else "未通过，需修复后重新生成。"))
            parts.append("业务语义复核、目标项目与已有方案冲突检查尚未完成。机器校验通过不代表所有业务验收通过。全部门禁完成后，提供一次明确的“上传到埋点管理”确认；确认前不上传，不删除或覆盖现有方案。")
        else:
            parts.append("Machine validation: "+("passed." if machine_passed else "failed; fix the source and regenerate."))
            parts.append("Semantic review, target-project verification and existing-plan conflict checks remain pending. A clean lint is not full business acceptance. Once all gates pass, offer one explicit 'Upload to Tracking Management' confirmation. Do not upload before consent or delete/replace an existing plan.")
    return "\n\n".join(parts)+"\n"


def prepare(plan_path, output_dir, language="zh", template=DEFAULT_TEMPLATE, review_only=False):
    root=Path(output_dir)
    if root.exists() or root.is_symlink():
        raise PlanError(f"Output directory must be new: {root}")
    if language not in ("zh","en"):
        raise PlanError("This deterministic conversation renderer supports zh/en; do not silently substitute another language")
    with open(plan_path,encoding="utf-8") as f: source=json.load(f)
    normalized=normalize_plan(source)
    normalized['meta']['reply_language']=language
    root.mkdir(parents=True,exist_ok=False)
    source_out=root/'plan.normalized.json'
    with source_out.open('xb') as f: f.write(json_bytes(normalized))
    result=None
    if review_only:
        metrics=counts(normalized)
        passed=None
    else:
        normalized, metrics=write_finalized_plan(normalized,root/'plan.xlsx',template,(plan_path,source_out))
        command=[sys.executable,str(Path(__file__).with_name('lint_tracking_plan.py')),'--input',str(root/'plan.xlsx'),'--strict-delivery','--template',str(template)]
        result=subprocess.run(command,capture_output=True,text=True,check=False)
        with (root/'lint.txt').open('x',encoding='utf-8') as f: f.write(result.stdout+result.stderr)
        passed=result.returncode==0
    with (root/'conversation.md').open('x',encoding='utf-8') as f: f.write(render_conversation(normalized,language,passed,review_only))
    artifact_names=('plan.normalized.json','conversation.md') if review_only else ('plan.normalized.json','plan.xlsx','conversation.md')
    fingerprints={name:file_sha256(root/name) for name in artifact_names}
    machine_validation=({"passed":None,"status":"not_run_excel_not_requested"} if review_only else {"passed":passed,"exit_code":result.returncode,"strict_delivery":True,"round_trip":True,"instruction_sheets_preserved":True,"template_sha256":file_sha256(template)})
    status="review_ready_delivery_choice_pending" if review_only else ("machine_passed_semantic_pending" if passed else "machine_failed")
    pending=(["delivery_choice","semantic_review"] if review_only else ["semantic_review","verified_target_and_baseline","user_upload_confirmation","remote_readback"])
    validation={"schema_version":1,"package_version":"2.0.2","created_at":datetime.now(timezone.utc).isoformat(),"status":status,"machine_validation":machine_validation,"counts":metrics,"fingerprints":fingerprints,"xlsx_language":"zh","reply_language":language,"delivery_choice_pending":review_only,"upload_eligible":False,"upload_status":"not_requested","pending":pending}
    with (root/'validation.json').open('xb') as f: f.write(json_bytes(validation))
    review={"schema_version":1,"status":"pending","fingerprints":fingerprints,"reviewer":"","checks":[{"id":key,"description":description,"status":"pending","evidence":""} for key,description in REVIEW_CHECKS],"blocking_unknowns":[],"target":{"project_id":None,"host":""},"baseline_sha256":"","conflicts_resolved":False,"notes":"Complete using real evidence; never auto-mark all checks passed. This file is not upload consent."}
    with (root/'semantic-review.template.json').open('xb') as f: f.write(json_bytes(review))
    return validation


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--plan',required=True)
    ap.add_argument('--output-dir',required=True)
    ap.add_argument('--language',choices=['zh','en'],default='zh')
    ap.add_argument('--template',default=str(DEFAULT_TEMPLATE))
    ap.add_argument('--conversation-only',action='store_true',
                    help='Render the review first; do not generate XLSX before a delivery choice')
    args=ap.parse_args(argv)
    try:
        result=prepare(args.plan,args.output_dir,args.language,args.template,
                       review_only=args.conversation_only)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0 if args.conversation_only or result['machine_validation']['passed'] else 2
    except (ValueError,OSError,KeyError) as exc:
        print(f"ERROR: {exc}",file=sys.stderr)
        return 1


if __name__=='__main__':
    raise SystemExit(main())
