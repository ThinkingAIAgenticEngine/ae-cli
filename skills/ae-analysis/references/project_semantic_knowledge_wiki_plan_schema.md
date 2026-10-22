# Project semantic knowledge Wiki plan

The Agent authors exactly one plan per asset-package snapshot. The builder validates every referenced asset against the package. New plans must fill `recall_cards[].routing` from verified evidence. Older 2.0 plans without routing still compile with a conservative domain fallback; branches may only target assets already listed in that card's preferred or fallback references.

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
          "routing": {
            "applicable_when": "问法、对象与范围何时适用本卡",
            "answer_grain": "答案对象与统计粒度",
            "required_parameters": ["时间范围或过滤参数"],
            "branches": [
              {
                "when": "满足哪种已核验的问法和口径",
                "asset_refs": [{"resource_type": "dashboard", "resource_key": "1234", "reason": "分支采用该资产的证据"}],
                "reason": "为什么该分支使用这些资产"
              }
            ],
            "stop_when": "何时已取得足够且权威的最小证据",
            "fallback_when_unavailable": "无匹配、冲突、权限不可用时如何回到域内筛选或说明缺口",
            "evidence_boundary": "不可互替口径、当前数值执行与证据强度边界"
          },
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
  "personal_semantic_integrations": [
    {
      "integration_id": "stable-personal-semantic-integration-id",
      "context_type": "background | preference | experience | asset_context",
      "source_ids": ["personal_semantic:42"],
      "title": "融合后的项目语义标题",
      "project_usage": "这组个人语义如何被项目知识库消费",
      "integration_target": {
        "target_type": "project | domain | asset | recall_card",
        "target_id": "project, domain_id, resource_key, or card_id"
      },
      "source_people": [
        {
          "owner_name": "source owner display name from payload",
          "updated_at": "source update time from payload"
        }
      ],
      "conflict_policy": "compatible | scoped | blocked",
      "boundaries": ["适用范围、冲突或必须回源确认的边界"]
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
- Adopted personal semantic integrations must cite concrete `personal_semantic:<id>` source IDs from `sources/adopted-personal-semantics.jsonl`. Group and fuse them by `context_type`: `background`, `preference`, `experience`, and `asset_context`.
- `asset_context` integrations must target an existing dashboard, report, metric, domain, or recall card. If the referenced asset no longer exists, do not attach the personal semantic to a live asset page; mark the integration as blocked or scoped historical context.
- Personal semantic integrations are project context, routing preferences, heuristics, or asset annotations. They do not override governed project semantic records, current asset definitions, SQL/calculation facts, or live query results unless an explicit correction/decision source gives that authority.
- Domain titles represent business retrieval topics, not physical dashboard-space names.
- Every domain has one `domain_judgment_model` describing the business state judged, objects, signals, decision path, asset roles and boundaries. A domain that only lists questions, events, metrics, dimensions and assets is not acceptable.
- Every domain has at least one recall card. Preferred and fallback refs must belong to that domain's dashboard/report closure or be a reusable metric directly referenced by it.
- Every excluded ref names a concrete reason. A duplicate should name its canonical resource when known.
- Every SQL report in the package has exactly one `sql_report_semantics` row. Unknown evidence is represented explicitly; it is never filled from the title.
- SQL semantics are Agent-authored after reading the report definition and SQL. Do not populate them by reusable sentence templates or deterministic parser output alone.
- `sql_report_semantics[].evidence_locator` exactly equals that report's packaged `source_detail_path`; never cite an external or guessed SQL definition.
- A SQL report with `definition_state=valid` has at least one output field, one applicable question and one non-applicable question. Use `unknown` when those boundaries cannot be proven.
- Input parameter `name`, output column `name`, display labels and business roles are different namespaces. Preserve original identifiers even when they collide or use generated names. A display label or Selector option label never replaces its underlying identity or SQL expansion.
- When authoring or refreshing SQL summaries, include execution-relevant `calculation_rules`, `time_semantics` and `coverage_gaps`. Each is an array of `{ "meaning": "evidence-based explanation", "evidence": "exact fragment of the current packaged SQL" }`. The builder rejects stale or missing anchors. Read the SQL before authoring these facts: preserve operand filters, denominator, units and rounding; distinguish target dates from an extra differencing baseline only when proven; distinguish historical behavior from current-state tables; explain excluded rows and conditional supplementation. If a category cannot be established, leave its array empty and explain the unknown in `non_applicable_questions`; never fabricate an evidence anchor. Do not encode fixed customer lists, evaluation thresholds or reference dates. The fields remain optional for legacy compatibility; old summaries without them are rendered with explicit incomplete-calculation coverage.
- When authoring a multi-asset branch, include `combination`: `{ "compatibility": "compatible | incompatible | unknown", "reason": "verified compatibility or missing conditions", "join_keys": ["exact output column"], "time_alignment": "role of each time parameter", "missing_coverage": ["unmatched rows, unknown denominator, or candidate-only supplementation"] }`. `compatible` requires explicit keys and time alignment; SQL join keys must be declared, verified output columns. A shared field name alone never proves compatibility. Missing legacy combination evidence is rendered as `unknown`, without an inferred join.
- Use concrete report or metric references for specific questions when the source supports them; retain dashboards for exploration and required inherited context. References must already be in the card's preferred/fallback closure. Every branch links the generated page directly. Review legacy cards without routing rather than treating their generic fallback as a complete route.
- The generated `Execution contract` preserves complete saved groups, array modes, filter scopes, formula operands, aggregation parameters, model settings and time settings. It is a deterministic fact view, not a second business interpretation. Unknown timezones, snapshot reconstruction and unsupported SQL lineage remain unknown. Do not infer dimensions from the referenced metadata list.
- Explain SQL fields in business language while preserving original parameter and output identifiers. Keep exact SQL anchors and saved structural facts in clearly scoped evidence sections; do not replace identities with display labels or expose unrelated parser/debug markers as business explanations.
- The generated Markdown must not expose build-process markers such as `CLI Agent 基于同一资产快照生成`, `摘要来源`, `semantic_plan`, parser fallback labels, or builder/debug terminology. Keep those only in local artifacts when needed for audit.
- The plan contains no query results, customer rows, users, tokens, credentials, or conversation text.
