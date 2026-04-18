# te-community get_livestream_detail

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

单场直播详情：互动排行榜和分页互动内容。

映射命令: `te-cli community get_livestream_detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--stream-id` | string | 是 | 直播会话 ID，从 get_livestream_list 获取 |
| `--activity-types` | string | 否 | 互动类型过滤：0弹幕、1礼物、2醒目留言、3 premium，逗号分隔 |
| `--anchor-time` | string | 否 | 互动锚点时间，格式 yyyy-MM-dd HH:mm |
| `--search-word` | string | 否 | 关键词过滤互动详情 |
| `--order-by` | number | 否 | 排序：0互动时间desc、1互动时间asc |
| `--page-num` | number | 否 | 页码，从 1 开始 |
| `--page-size` | number | 否 | 每页条数 |

## 示例

```bash
# 获取直播详情
te-cli community get_livestream_detail \
  --space-id 1 --game-id 1 --stream-id <stream-id>

# 过滤弹幕类型
te-cli community get_livestream_detail \
  --space-id 1 --game-id 1 --stream-id <stream-id> \
  --activity-types 0,1
```
