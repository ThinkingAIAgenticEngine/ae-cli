import json,hashlib
from pathlib import Path
import tiktoken
base=Path(__file__).resolve().parent
enc=tiktoken.get_encoding('o200k_base')
gold=json.loads((base/'fixture/gold.json').read_text())
cost=json.loads((base/'metrics/catalog-cost.json').read_text())
assert hashlib.sha256((base/'fixture/gold.json').read_bytes()).hexdigest()==json.loads((base/'fixture/freeze.json').read_text())['gold_sha256']
metrics={}
for arm in 'ABCDE':
 p=base/'arms'/arm
 candidates=json.loads((p/'candidates.json').read_text()); candidates={x['id']:x for x in candidates}
 results=json.loads((p/'results.json').read_text());results={x['id']:x for x in results}
 hit=need=selected=relevant=full=neg_ok=0;per=[]
 for case in gold:
  q=case['id']; req=set(case['required_candidate_ids']); sel=set(candidates[q]['candidate_ids']);allowed=req|set(case['acceptable_extra_candidate_ids'])|set(case['required_dependency_ids'])
  missing=sorted(req-sel);extra=sorted(sel-allowed)
  hit+=len(req&sel);need+=len(req);selected+=len(sel);relevant+=len(sel&allowed);full+=not missing
  if not req:neg_ok+=not sel
  per.append({'id':q,'required':sorted(req),'selected':sorted(sel),'missing':missing,'unexpected_extra':extra,'all_required':not missing})
 calls=[json.loads(line) for line in (p/'detail-reads.jsonl').read_text().splitlines() if line]
 detail_tokens=sum(len(enc.encode(json.dumps(x['returned'],ensure_ascii=False,separators=(',',':'))+'\n')) for x in calls)
 read_ids={x for call in calls for x in call['ids']}
 expected=set().union(*(set(x['candidate_ids']) for x in candidates.values()))
 assert expected<=read_ids,(arm,expected-read_ids)
 metrics[arm]={**cost[arm],'required_candidate_hits':hit,'required_candidate_total':need,'candidate_recall':hit/need,'selected_candidates_total':selected,'unexpected_candidates_total':selected-relevant,'candidate_precision_with_allowed_extras':relevant/selected,'questions_all_required_recalled':full,'questions':len(gold),'negative_queries_correct':neg_ok,'unique_detail_ids':len(read_ids),'detail_call_count':len(calls),'details_tokens_o200k_base':detail_tokens,'catalog_plus_details_tokens_o200k_base':cost[arm]['model_catalog_tokens_o200k_base']+detail_tokens,'per_query':per}
(base/'metrics/results.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
for arm,m in metrics.items():print(arm,{k:v for k,v in m.items() if k not in ['per_query','reader_sha256','catalog_sha256']})
