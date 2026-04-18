# te-community get_comment_tag_analysis

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

评论标签分析：指定标签码，返回各标签值的计数和时间趋势。

映射命令: `te-cli community get_comment_tag_analysis`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id` | number | 是 | 渠道 ID |
| `--uuid` | string | 是 | 内容 UUID |
| `--resource-type` | number | 是 | 资源类型：0帖子、1视频 |
| `--tag-code` | string | 是 | 标签码，从 get_corpus_tags 获取 |
| `--start-time` | string | 否 | 评论发布时间下限，格式 yyyy-MM-dd，默认为帖子的发布时间 |
| `--end-time` | string | 否 | 评论发布时间上限，格式 yyyy-MM-dd |

## 示例

```bash
# 分析评论标签
te-cli community get_comment_tag_analysis \
  --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid> \
  --resource-type 0 --tag-code "sentiment"
```
