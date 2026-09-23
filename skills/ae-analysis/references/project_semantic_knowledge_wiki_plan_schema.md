# Project semantic knowledge Wiki plan

The Agent authors exactly one plan per asset-package snapshot. The builder validates every referenced asset against the package.

```json
{
  "schema_version": "2.0",
  "source_snapshot_hash": "<asset package snapshot_hash>",
  "generation_method": "agent_semantic_synthesis",
  "domains": [
    {
      "domain_id": "stable-lowercase-id",
      "title": "业务域名称",
      "summary": "这个业务域主要解决什么问题",
      "primary_questions": ["用户会怎样提问"],
      "primary_metrics": [
        "Agent 总结的核心指标、口径作用和适用问题；不要写脚本占位词，例如“自定义指标”。"
      ],
      "drilldown_dimensions": [
        "Agent 总结的常用下钻维度、字段 key 和使用场景；不要写缺少业务解释的技术字段。"
      ],
      "merge_rationale": "跨物理空间归并或拆分的证据",
      "dashboard_ids": ["dashboard resource_key"],
      "recall_cards": [
        {
          "card_id": "stable-card-id",
          "questions": ["主问法", "同义问法"],
          "intent": "要解决的业务决策",
          "preferred_asset_refs": [
            {
              "resource_type": "dashboard",
              "resource_key": "1234",
              "reason": "为什么它是首选入口"
            }
          ],
          "fallback_asset_refs": [],
          "excluded_asset_refs": [
            {
              "resource_type": "report",
              "resource_key": "5678",
              "reason": "副本、冲突或仅依赖使用",
              "canonical_resource_key": "5677"
            }
          ],
          "requires_live_execution": true,
          "live_execution_reason": "需要当前客户或数量时必须执行报表"
        }
      ]
    }
  ],
  "appendices": [
    {
      "appendix_id": "technical-or-temporary-assets",
      "title": "测试、演示与临时探索资产",
      "summary": "保留用途",
      "selection_rationale": "为什么不能进入主召回",
      "dashboard_ids": ["dashboard resource_key"]
    }
  ],
  "sql_report_semantics": [
    {
      "report_id": "SQL report resource_key",
      "business_purpose": "这张 SQL 报表解决什么业务问题",
      "input_parameters": [
        {"name": "parameter", "meaning": "业务含义", "required": true}
      ],
      "output_fields": [
        {"name": "field", "meaning": "业务含义"}
      ],
      "statistical_grain": "一行或一次聚合代表什么",
      "key_filters": ["关键过滤和排除条件"],
      "default_limits": ["默认时间、行数或范围限制；没有则写 none"],
      "applicable_questions": ["适用问题"],
      "non_applicable_questions": ["不适用问题"],
      "evidence_locator": "asset package detail locator",
      "definition_state": "valid | unknown"
    }
  ]
}
```

## Rules

- Every dashboard occurs exactly once across `domains[].dashboard_ids` and `appendices[].dashboard_ids`.
- Domain titles represent business retrieval topics, not physical dashboard-space names.
- Every domain has at least one recall card. Preferred and fallback refs must belong to that domain's dashboard/report closure or be a reusable metric directly referenced by it.
- Every excluded ref names a concrete reason. A duplicate should name its canonical resource when known.
- Every SQL report in the package has exactly one `sql_report_semantics` row. Unknown evidence is represented explicitly; it is never filled from the title.
- SQL semantics are Agent-authored after reading the report definition and SQL. Do not populate them by reusable sentence templates or deterministic parser output alone.
- `sql_report_semantics[].evidence_locator` exactly equals that report's packaged `source_detail_path`; never cite an external or guessed SQL definition.
- A SQL report with `definition_state=valid` has at least one output field, one applicable question and one non-applicable question. Use `unknown` when those boundaries cannot be proven.
- Visible SQL fields must use business names and meanings. Do not expose parser/debug terms such as `SQL 输出字段`, `来源表达式`, `${Selector:...}`, `${PartDate:...}`, `where 条件`, `order by`, or operator codes.
- The plan contains no query results, customer rows, users, tokens, credentials, or conversation text.
