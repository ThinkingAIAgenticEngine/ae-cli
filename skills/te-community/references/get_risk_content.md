# te-community get_risk_content

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

查询被标记为风险/审核的内容，支持按风险类型和时间过滤。可选返回趋势聚合。

映射命令: `te-cli community get_risk_content`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--start-time` | string | 是 | 风险内容发布时间下限，格式 yyyy-MM-dd |
| `--end-time` | string | 是 | 风险内容发布时间上限，格式 yyyy-MM-dd |
| `--risk-codes` | string | 否 | 风险类型码列表，逗号分隔 |
| `--search-word` | string | 否 | 关键词搜索，正文模糊匹配 |
| `--include-trends` | boolean | 否 | 是否返回趋势聚合 |
| `--order-by` | number | 否 | 排序：0发布时间desc |
| `--page-num` | number | 否 | 页码，从 1 开始 |
| `--page-size` | number | 否 | 每页条数 |

## 示例

```bash
# 查询风险内容
te-cli community get_risk_content \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07

# 按风险类型过滤
te-cli community get_risk_content \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --risk-codes 1,2

# 关键词搜索
te-cli community get_risk_content \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --search-word "违规关键词"
```
