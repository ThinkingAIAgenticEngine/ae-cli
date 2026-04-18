# te-community get_livestream_analysis

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

AI 生成的单场直播分析报告：亮点时段（带指标与 AI 解读）与情感观点。

映射命令: `te-cli community get_livestream_analysis`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--stream-id` | string | 是 | 直播场次 ID，来自 `get_livestream_list` 的 streamId |

## 示例

```bash
te-cli community get_livestream_analysis \
  --space-id 1 --game-id 1 \
  --stream-id <stream-id>
```
