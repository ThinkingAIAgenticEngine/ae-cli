# te-community search_posts

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

搜索社区帖子/视频，支持多条件过滤。

映射命令: `te-cli community search_posts`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id-list` | string | 否 | 渠道 ID 列表，逗号分隔 |
| `--keywords` | string | 否 | 关键词列表，逗号分隔 |
| `--start-time` | string | 是 | 内容发布时间下限，格式 yyyy-MM-dd |
| `--end-time` | string | 是 | 内容发布时间上限，格式 yyyy-MM-dd |
| `--official` | boolean | 否 | 是否只看官方账号 |
| `--resource-type` | string | 否 | 资源类型：0帖子、1视频，逗号分隔 |
| `--search-mode` | number | 否 | 搜索模式：0分词（默认）、1精确匹配、2作者名 |
| `--search-word` | string | 否 | 全文检索词，与 searchMode 配合 |
| `--sentiment-types` | string | 否 | 情感类型：0负面、1正面、2中性，逗号分隔 |
| `--order-by` | number | 否 | 排序：0时间desc、1权重desc、2时间asc、3回复数desc、4热度desc |
| `--page-num` | number | 否 | 页码，从 1 开始 |
| `--page-size` | number | 否 | 每页条数 |

## 示例

```bash
# 基本搜索
te-cli community search_posts \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07

# 按渠道和情感过滤
te-cli community search_posts \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --channel-id-list 1,2 \
  --sentiment-types 0,1

# 分页查询
te-cli community search_posts \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --page-num 1 --page-size 20
```
