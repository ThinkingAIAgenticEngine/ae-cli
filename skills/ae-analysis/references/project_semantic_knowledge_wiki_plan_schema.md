# Project semantic knowledge Wiki plan

The Agent authors exactly one plan per asset-package snapshot. The builder validates every referenced asset against the package.

```json
{
  "schema_version": "2.0",
  "source_snapshot_hash": "<asset package snapshot_hash>",
  "generation_method": "agent_semantic_synthesis",
  "project_business_model": {
    "business_positioning": "该项目观察的业务系统、服务对象和决策范围。必须从当前资产包证据归纳，不得写项目特化模板。",
    "audience_roles": ["会使用这个项目做业务判断的角色"],
    "business_objects": [
      {
        "object_id": "stable-object-id",
        "name": "业务对象名称",
        "meaning": "对象在本项目中的业务含义",
        "evidence_refs": [
          {"resource_type": "dashboard", "resource_key": "1234"}
        ]
      }
    ],
    "object_relationships": [
      {
        "from_object": "业务对象A",
        "to_object": "业务对象B",
        "relationship": "两个对象如何形成判断链路",
        "evidence_refs": [
          {"resource_type": "report", "resource_key": "5678"}
        ]
      }
    ],
    "decision_chains": [
      {
        "chain_id": "stable-chain-id",
        "title": "业务判断链路名称",
        "decision_question": "这条链路帮助用户判断什么",
        "signals": ["判断信号、指标、状态或维度"],
        "decision_steps": ["先看什么", "再看什么", "如何下钻或停止"],
        "preferred_domain_ids": ["domain-id"],
        "asset_refs": [
          {"resource_type": "dashboard", "resource_key": "1234"}
        ],
        "requires_live_execution": true,
        "boundaries": ["不能由知识库直接回答的边界"]
      }
    ],
    "non_goals": ["本知识库不承载的内容"]
  },
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
      "domain_judgment_model": {
        "business_state_judged": "这个业务域判断什么业务状态",
        "main_objects": ["涉及的业务对象"],
        "signals": ["这个域使用的判断信号"],
        "decision_path": ["域内判断步骤"],
        "asset_attachment_logic": [
          {
            "asset_ref": {"resource_type": "dashboard", "resource_key": "1234"},
            "role": "primary_entry | supporting_evidence | drilldown | exclusion",
            "reason": "为什么这个资产挂在该业务判断链路上"
          }
        ],
        "boundaries": ["这个域不能直接回答或必须实时执行的边界"]
      },
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
- `project_business_model` is required. It must explain how the project observes business before listing assets: positioning, audience roles, business objects, object relationships, decision chains, and non-goals.
- `project_business_model` and every `domain_judgment_model` must be derived from current asset-package evidence. Do not hardcode project names, business domains, asset IDs, event names, metric names, or example decision chains into the workflow.
- Every business object, object relationship and decision chain must cite concrete `dashboard`, `report`, or `metric` refs from the current package. A decision chain must reference existing domain IDs and explain when live execution is required.
- Domain titles represent business retrieval topics, not physical dashboard-space names.
- Every domain has one `domain_judgment_model` describing the business state judged, objects, signals, decision path, asset roles and boundaries. A domain that only lists questions, events, metrics, dimensions and assets is not acceptable.
- Every domain has at least one recall card. Preferred and fallback refs must belong to that domain's dashboard/report closure or be a reusable metric directly referenced by it.
- Every excluded ref names a concrete reason. A duplicate should name its canonical resource when known.
- Every SQL report in the package has exactly one `sql_report_semantics` row. Unknown evidence is represented explicitly; it is never filled from the title.
- SQL semantics are Agent-authored after reading the report definition and SQL. Do not populate them by reusable sentence templates or deterministic parser output alone.
- `sql_report_semantics[].evidence_locator` exactly equals that report's packaged `source_detail_path`; never cite an external or guessed SQL definition.
- A SQL report with `definition_state=valid` has at least one output field, one applicable question and one non-applicable question. Use `unknown` when those boundaries cannot be proven.
- Visible SQL fields must use business names and meanings. Do not expose parser/debug terms such as `SQL 输出字段`, `来源表达式`, `${Selector:...}`, `${PartDate:...}`, `where 条件`, `order by`, or operator codes.
- The generated Markdown must not expose build-process markers such as `CLI Agent 基于同一资产快照生成`, `摘要来源`, `semantic_plan`, parser fallback labels, or builder/debug terminology. Keep those only in local artifacts when needed for audit.
- The plan contains no query results, customer rows, users, tokens, credentials, or conversation text.
