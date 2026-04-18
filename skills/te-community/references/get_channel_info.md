# te-community get_channel_info

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

获取社区空间的有效渠道列表，包含渠道 ID 和名称。**这是多数需要 `--channel-id` / `--channel-id-list` 的命令的前置步骤**：先在此拿到真实渠道 ID，再带参调用 `search_posts`、`get_post_detail`、`get_comments_summary`、`get_livestream_list` 等（以各命令 reference 为准）。

映射命令: `te-cli community get_channel_info`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |

## 示例

```bash
# 获取渠道列表
te-cli community get_channel_info --space-id 1 --game-id 1
```
