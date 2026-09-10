# 跨源资产配置 CLI 收敛版测试用例

## 验收范围

CLI 仅保留 Excel 配置上传、配置列表、触发校验和读取校验结果四项 L3 能力：

- `metadata.cross_source_config.upload`
- `metadata.cross_source_config.list`
- `metadata.cross_source_config.check`
- `metadata.cross_source_config.check_status`

不验收逐项新增、编辑、删除、模板/导出、数据源预览、扫描和枚举管理。上传复用资产中心页面现有 Excel 导入服务，校验复用页面现有 `checkBatch` 服务。

## 基础流程

```bash
ae-cli capability search "cross_source_config" --domain metadata --project-id <project_id>
ae-cli capability inspect metadata.cross_source_config.upload --project-id <project_id>
ae-cli analysis input-file upload --project-id <project_id> --purpose cross_source_config.workbook --file ./configured.xlsx
ae-cli capability run metadata.cross_source_config.upload --input '{"project_id":<project_id>,"input_file_id":"<input_file_id>","lang":"zh"}' --yes
ae-cli capability run metadata.cross_source_config.list --input '{"project_id":<project_id>}'
ae-cli capability run metadata.cross_source_config.check --input '{"project_id":<project_id>,"ids":[<route_id>]}'
ae-cli capability run metadata.cross_source_config.check_status --input '{"project_id":<project_id>,"ids":[<route_id>]}'
```

## 用例

| 编号 | 场景 | 预期 |
|---|---|---|
| CS-001 | 有编辑权限账号搜索并 inspect | 仅发现 4 项能力；`upload` 为 `high-risk-write`，其余风险与权限正确 |
| CS-002 | 无编辑权限账号搜索/上传 | 可见性遵循权限；上传文件用途或 `upload` 被拒绝，不发生写入 |
| CS-003 | 上传合法 XLSX 后执行 `upload` | 复用页面上传逻辑成功落库；返回 `status=success`、`page_path` 和可打开的 `page_url` |
| CS-004 | 上传包含已存在 route_code 的合法工作簿 | 按页面既有语义更新对应配置；执行前需要 `--yes` |
| CS-005 | 上传错误扩展名、空文件、他人/其他项目文件 ID | validate/run 拒绝；页面服务不被调用 |
| CS-006 | 工作簿解析或业务校验失败 | 返回 `CROSS_SOURCE_UPLOAD_FAILED`；`meta.business_result` 保留页面同源失败信息；不误报成功 |
| CS-007 | 页面服务返回部分警告 | 上传成功但 `requires_review=true`、`next_action=open_page`，保留 `result.fail` |
| CS-008 | `list` 查询、状态筛选和分页 | 只返回当前项目数据，snake_case 字段完整，含页面链接 |
| CS-009 | 对当前项目显式 ID 执行 `check` | 返回 `submitted` 和 `next_action=check_status`；其他项目 ID 整批拒绝 |
| CS-010 | 已处于 checking 的配置重复执行 `check` | 返回 `CROSS_SOURCE_CHECK_RUNNING`，不重复提交 |
| CS-011 | `check_status` 查询进行中结果 | `status=checking`、`completed=false`、`next_action=poll` |
| CS-012 | 所有配置校验成功 | `status=check_success`、`completed=true`、`successful=true` |
| CS-013 | 存在校验失败 | `status=check_fail`、`successful=false`，每项保留 `msg_map`，`next_action=open_page` |
| CS-014 | CLI 页面链接拼接 | 后端 `page_path` 保持 Host 无关；CLI 输出基于当前 Host 的 `page_url` |
| CS-015 | 页面回归 | 资产中心上传、列表、校验、查看结果与改动前一致；本次不需要新增或修改 `ta-web` 公用方法 |

## 本地验证

```bash
# ta-common-service，使用 JDK 11
JAVA_HOME=<jdk11> node scripts/qa/cross-source.mjs --offline

# te-cli，使用 Node 20+
npm run build
npm run verify:cross-source-config
npm run verify:analysis-skill
npm run verify:readme
npm run check:agents-docs
```
