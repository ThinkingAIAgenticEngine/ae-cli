# te-community get_post_detail

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

获取帖子/视频的完整详情，包括正文、媒体、弹幕、情感、关键词、话题、标签值和评论分页。

映射命令: `te-cli community get_post_detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id` | number | 是 | 渠道 ID |
| `--uuid` | string | 是 | 内容 UUID |
| `--resource-type` | number | 是 | 资源类型：0帖子、1视频 |
| `--danmu-order-by` | number | 否 | 弹幕排序：0时间戳desc、1发布时间desc |
| `--danmu-page-num` | number | 否 | 弹幕页码，从 1 开始 |
| `--danmu-page-size` | number | 否 | 弹幕每页条数 |
| `--reply-order-by` | number | 否 | 评论排序：0发布时间desc、1发布时间asc |
| `--reply-page-num` | number | 否 | 评论页码，从 1 开始 |
| `--reply-page-size` | number | 否 | 评论每页条数 |

## 示例

```bash
# 获取帖子详情
te-cli community get_post_detail \
  --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid> --resource-type 0

# 获取视频详情并分页评论
te-cli community get_post_detail \
  --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid> --resource-type 1 \
  --reply-page-num 1 --reply-page-size 20
```
