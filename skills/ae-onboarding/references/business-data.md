# Connect business data in a local agent

Use this flow when the user selects **Connect my data** after the Demo or directly asks to connect business data. Keep the signed-in account, host and onboarding session. Route an explicit task first. An existing data file or Feishu Sheet or Bitable link supplied for this task is enough to start source inspection in the same turn. Follow the route's own confirmation steps for writes.

When a route needs an AE project, reuse the user's verified business project. Use `analysis onboarding status --session-id <session-id>` if the current response lacks that context. A `business_project` with the matching top-level `project_id` is the bound registration project. If AE returns only a candidate, confirm it with the user. If the project is missing, ask which business project to use. Verify any explicitly selected target on the same host before writing. Use the business project throughout and keep the Demo project for sample results. Only the SDK route uses `analysis onboarding run --choice business`.

## Data source choices

If the source and intent are unclear, show a short introduction in the [onboarding language](../SKILL.md#onboarding-language-and-currency). In English, use **Try it with your data** and ask for a CSV or Excel file or a Feishu Sheet or Bitable link. Explain that you will check which fields can be imported. In Chinese, use the introduction below. Keep CSV and Excel as the file examples.

> **用你的数据试一次**
>
> 上传 CSV 或 Excel 文件，或粘贴飞书电子表格、多维表格链接。我会先检查字段，告诉你哪些数据可以导入。

Render `business_data.interaction` in the native picker. Use the onboarding language for the labels. Keep this order for older CLI builds.

| Value | 中文 | English |
| --- | --- | --- |
| `import_data` | 导入文件或飞书表格 | Import a file or Feishu table |
| `sdk` | 接入应用 SDK | Connect an app SDK |
| `more_data_tools` | 更多接入工具 | More integration tools |

- **Import a file or Feishu table.** Use `ae-data-integration`. Ask for the file or link if missing. Inspect its structure, account identifiers and event time when applicable. Show the proposed mapping and validation results before any upload. After ingestion, verify the expected data in AE. Use the same route for other supported formats when the user provides one.
- **Connect an app SDK.** Run `ae-cli analysis onboarding run --session-id <session-id> --choice business`. Follow [SDK setup](business-sdk.md) with the selected application platform and code directory. An SDK how-to question can go directly to `ae-data-integration-helper`.
- **More integration tools.** Show the choices below. Handle a user's explicit request for any of them directly.

## More integration tools

Render `business_data.tools` in the native picker. If the host cannot fit the list in its picker, show the labels as text and accept their selection or a natural-language request.

| Value | 中文 | English | Route |
| --- | --- | --- | --- |
| `datax` | 用 DataX 接入 | Connect with DataX | Follow [DataX setup](#datax-setup). |
| `logbus2` | 配置 LogBus2 | Configure LogBus2 | Use `ae-data-integration-helper` for setup and troubleshooting. Use the tracking code route for configuration generated from a confirmed plan. |
| `tracking_plan` | 生成埋点方案 | Create a tracking plan | Use `ae-tracking-matrix` to route to `ae-generate-tracking-plan`. |
| `migrate_tracking` | 迁移已有埋点 | Migrate existing tracking | Start with `ae-tracking-matrix`, then use `ae-migrate-tracking-code` for the existing provider and confirm the migration mode. |
| `dimension_table` | 导入维度表 | Import a dimension table | Use `ae-metadata` to create or bind the dimension table in the business project. |
| `check_ingestion` | 检查已有上报 | Check existing ingestion | Use `ae-tracking-matrix` for verification. Read `tracking live-data list`, `tracking ingest summary` or `tracking ingest-error list` as needed. |

When the customer selects **More integration tools** or directly requests database sync, check `ae-cli --host <verified-host> config show`. If `businesses.dataops` is `true`, append **Sync a DataOps data source** in the onboarding language or route the request to `ae-dataops`. Verify the DataOps space when required by that route.

### DataX setup

Use `ae-data-integration-helper` and the [DataX Quick Start](https://github.com/alibaba/DataX/blob/master/userGuid.md) and [ThinkingAI Writer guide](https://docs.thinkingai.io/en/manual/ta-datax-writer). Ask only for the missing source type and the machine that will run DataX. If setup is needed, check Java and Python, install DataX and the ThinkingAI Writer on the selected machine, then run the DataX self-test. For an existing installation, check the Reader and Writer and proceed to configuration.

Configure the Reader, Writer and field mapping for the verified business project. Run a small confirmed batch using `datax.py` when the machine is accessible. Otherwise, provide the configuration and commands for the user's machine. Verify that the expected rows landed in AE with the ingestion tools and report the actual result.
