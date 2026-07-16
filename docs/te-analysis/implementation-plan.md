# te-analysis implementation plan archive

This file is intentionally kept as a short archive pointer. The original plan described the old MCP `+tool_name` implementation approach and is no longer the source of truth for agent-facing analysis commands.

Current source of truth:

- Command surface overview: `docs/te-analysis/te-analysis-mcp-tools.md`
- Agent skill entrypoint: `skills/ae-analysis/SKILL.md`
- Shared AI-facing model registry: `skills/ae-analysis/references/ai_models.md`
- Per-command contracts: `skills/ae-analysis/references/*.md`
- Registration verification: `scripts/verify-te-analysis-tools.mjs`

Current design constraints:

- Use capability-gateway resource/action commands for analysis reports, ad-hoc analysis, dashboard report data, BI page data, and query follow-ups.
- Use `model_type + definition` for ad-hoc and report create/update.
- Do not expose removed ad-hoc QP builder/schema helper commands as agent-facing docs.
- Store follow-up drilldown context server-side and pass `query_context_id`; do not ask agents to resend raw QP.
