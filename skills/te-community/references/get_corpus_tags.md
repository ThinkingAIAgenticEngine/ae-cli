# te-community get_corpus_tags

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

查询可用的语料标签列表，用于筛选。

映射命令: `te-cli community get_corpus_tags`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |

## 示例

```bash
# 获取标签列表
te-cli community get_corpus_tags --space-id 1 --game-id 1
```
