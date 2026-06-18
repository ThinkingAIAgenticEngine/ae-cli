#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

HOST="${HOST:-http://localhost:3000}"
# export AE_API_PREFIX="${AE_API_PREFIX-}"

# 用于跑 run 的现有 team（单agent）
EXISTING_TEAM_ID="cmqeu5dx81dgtps076mar0v98"
# 创建测试 team 时用的 agentId
TEST_AGENT_ID="cmqewuevf1dq8ps07vzqsujaa"

CLI="node dist/index.js --host ${HOST}"
PASS=0
FAIL=0

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1" >&2; FAIL=$((FAIL+1)); }

require_jq() {
  if ! command -v jq &>/dev/null; then
    echo "错误：需要 jq，请先安装：brew install jq" >&2
    exit 1
  fi
}

require_jq
echo "=== team 集成测试（真实服务器：${HOST}）==="

# ═════════════════════════════════════════
# 第一部分：team 管理命令
# ═════════════════════════════════════════
echo ""
echo "═══ team 管理命令 ═══"

# ── +list
echo ""
echo "── +list"
LIST_OUT=$($CLI team +list)
COUNT=$(echo "$LIST_OUT" | jq '.data.items | length')
if [ "$COUNT" -ge 0 ] 2>/dev/null; then
  ok "+list 成功，返回 $COUNT 个 team"
else
  fail "+list 失败：$LIST_OUT"
fi

# ── +create（完整参数）
echo ""
echo "── +create（完整参数）"
CREATE_OUT=$($CLI team +create --yes \
  --name "CLI集成测试_$(date +%s)" \
  --config "{\"version\":1,\"mode\":\"serial\",\"steps\":[{\"id\":\"s1\",\"name\":\"步骤1\",\"agentId\":\"$TEST_AGENT_ID\",\"prompt\":\"测试\",\"role\":\"agent\"}]}" \
  --description "集成测试自动创建，可删除" \
  --scope personal)

CREATED_ID=$(echo "$CREATE_OUT" | jq -r '.data.id // empty')
if [ -n "$CREATED_ID" ]; then
  ok "+create 成功，id=$CREATED_ID"
else
  fail "+create 失败：$CREATE_OUT"
  exit 1
fi

# ── +update（改名）
echo ""
echo "── +update（改名）"
NEW_NAME="CLI集成测试_已更新_$(date +%s)"
$CLI team +update --yes --id "$CREATED_ID" --name "$NEW_NAME" > /dev/null
VERIFY_NAME_OUT=$($CLI team +list)
UPDATED_NAME=$(echo "$VERIFY_NAME_OUT" | jq -r --arg id "$CREATED_ID" '.data.items[] | select(.id==$id) | .name // empty')
if [ "$UPDATED_NAME" = "$NEW_NAME" ]; then
  ok "+update 改名成功，新名称=${UPDATED_NAME}"
else
  fail "+update 改名失败：期望 ${NEW_NAME}，+list 返回 ${UPDATED_NAME}"
fi

# ── +update（更新 config）
echo ""
echo "── +update（更新 config）"
$CLI team +update --yes \
  --id "$CREATED_ID" \
  --config "{\"version\":1,\"mode\":\"parallel\",\"steps\":[{\"id\":\"s1\",\"name\":\"步骤1\",\"agentId\":\"$TEST_AGENT_ID\",\"prompt\":\"并行测试\",\"role\":\"agent\"}]}" > /dev/null
VERIFY_CFG_OUT=$($CLI team +list)
CFG_MODE=$(echo "$VERIFY_CFG_OUT" | jq -r --arg id "$CREATED_ID" '.data.items[] | select(.id==$id) | .config.mode // empty')
if [ "$CFG_MODE" = "parallel" ]; then
  ok "+update config 成功，mode=parallel"
else
  fail "+update config 失败：+list 返回 mode=$CFG_MODE"
fi

# ── +update（disable）
echo ""
echo "── +update（--enabled false）"
$CLI team +update --yes --id "$CREATED_ID" --enabled false > /dev/null
VERIFY_ENABLED_OUT=$($CLI team +list)
ENABLED=$(echo "$VERIFY_ENABLED_OUT" | jq --arg id "$CREATED_ID" '.data.items[] | select(.id==$id) | .enabled')
if [ "$ENABLED" = "false" ]; then
  ok "+update enabled=false 成功"
else
  fail "+update enabled=false 失败：+list 返回 enabled=$ENABLED"
fi

# ── +ai-generate
echo ""
echo "── +ai-generate"
AI_OUT=$($CLI team +ai-generate \
  --prompt "需要一个能分析用户留存并生成周报的团队")
AI_NAME=$(echo "$AI_OUT" | jq -r '.data.name // empty')
if [ -n "$AI_NAME" ]; then
  ok "+ai-generate 成功，生成名称=$AI_NAME"
else
  fail "+ai-generate 失败：$AI_OUT"
fi

# ── +list-templates（默认）
echo ""
echo "── +list-templates（默认）"
TPL_OUT=$($CLI team +list-templates)
TPL_COUNT=$(echo "$TPL_OUT" | jq '.data | if type=="array" then length else length end' 2>/dev/null || echo 0)
ok "+list-templates 成功，返回 $TPL_COUNT 个模板"

# ── +list-templates（locale en）
echo ""
echo "── +list-templates（locale en）"
TPL_EN_OUT=$($CLI team +list-templates --locale en)
TPL_EN_COUNT=$(echo "$TPL_EN_OUT" | jq '.data | if type=="array" then length else length end' 2>/dev/null || echo 0)
ok "+list-templates locale=en 成功，返回 $TPL_EN_COUNT 个模板"

# ── validation：必填参数缺失应报错
echo ""
echo "── validation：team 管理命令"

if node dist/index.js --host "$HOST" team +create --config '{"version":1}' --yes 2>/dev/null; then
  fail "+create 缺 --name 应报错但未报"; else echo "  OK: +create 缺 --name 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +create --name "test" --yes 2>/dev/null; then
  fail "+create 缺 --config 应报错但未报"; else echo "  OK: +create 缺 --config 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +create --name "t" --config '{}' --scope invalid --yes 2>/dev/null; then
  fail "+create --scope invalid 应报错但未报"; else echo "  OK: +create --scope invalid 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +update --name "test" --yes 2>/dev/null; then
  fail "+update 缺 --id 应报错但未报"; else echo "  OK: +update 缺 --id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +delete --yes 2>/dev/null; then
  fail "+delete 缺 --id 应报错但未报"; else echo "  OK: +delete 缺 --id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +ai-generate 2>/dev/null; then
  fail "+ai-generate 缺 --prompt 应报错但未报"; else echo "  OK: +ai-generate 缺 --prompt 正确拒绝"; fi

# ═════════════════════════════════════════
# 第二部分：run 执行命令
# ═════════════════════════════════════════
echo ""
echo "═══ run 执行命令 ═══"

# ── +run-start（限流时自动重试）
echo ""
echo "── +run-start（team=${EXISTING_TEAM_ID}）"
RUN_ID=""
attempt=0
while [ -z "$RUN_ID" ]; do
  attempt=$((attempt+1))
  RUN_OUT=$($CLI team +run-start --yes \
    --team-id "$EXISTING_TEAM_ID" \
    --input "写一首关于春天的短诗，50字以内")
  RUN_ID=$(echo "$RUN_OUT" | jq -r '.data.id // empty')
  ERR=$(echo "$RUN_OUT" | jq -r '.data.error // empty')
  if [ -n "$RUN_ID" ]; then
    ok "+run-start 成功，run_id=$RUN_ID"
  elif [ -n "$ERR" ]; then
    echo "   第 ${attempt} 次失败：${ERR}，等待 15s 后重试"
    sleep 15
  else
    fail "+run-start 失败：$RUN_OUT"
    break
  fi
done

# ── +run-result（轮询直到终态，最多 240s）
if [ -n "$RUN_ID" ]; then
  echo ""
  echo "── +run-result 轮询（最多 240s）"
  FINAL_STATUS=""
  STATUS=""
  for i in $(seq 1 48); do
    sleep 5
    RESULT_OUT=$($CLI team +run-result --id "$RUN_ID" 2>/dev/null || echo "{}")
    STATUS=$(echo "$RESULT_OUT" | jq -r '.data.status // empty')
    echo "   第 ${i} 次轮询：status=${STATUS}"
    if [[ "$STATUS" == "completed" || "$STATUS" == "failed" || "$STATUS" == "cancelled" ]]; then
      FINAL_STATUS="$STATUS"
      break
    fi
  done

  if [ "$FINAL_STATUS" = "completed" ]; then
    ok "+run-result 终态=completed"
  elif [ -n "$FINAL_STATUS" ]; then
    fail "+run-result 终态=${FINAL_STATUS}（非 completed）"
  else
    fail "+run-result 240s 内未到终态，最后 status=${STATUS}"
  fi

  # ── +run-artifacts
  echo ""
  echo "── +run-artifacts"
  ARTIFACTS_OUT=$($CLI team +run-artifacts --id "$RUN_ID" 2>/dev/null || echo "{}")
  ART_COUNT=$(echo "$ARTIFACTS_OUT" | jq '.data.items | length' 2>/dev/null || echo 0)
  ok "+run-artifacts 成功，返回 $ART_COUNT 个产物"
fi

# ── +run-chat
echo ""
echo "── +run-chat（team=${EXISTING_TEAM_ID}）"
CHAT_RUN_ID=""
chat_attempt=0
while [ -z "$CHAT_RUN_ID" ]; do
  chat_attempt=$((chat_attempt+1))
  CHAT_OUT=$($CLI team +run-chat --yes \
    --team-id "$EXISTING_TEAM_ID" \
    --input "写一首关于夏天的短诗，30字以内")
  CHAT_RUN_ID=$(echo "$CHAT_OUT" | jq -r '.data.item.id // empty')
  CHAT_ERR=$(echo "$CHAT_OUT" | jq -r '.data.error // empty')
  if [ -n "$CHAT_RUN_ID" ]; then
    ok "+run-chat 成功，run_id=$CHAT_RUN_ID"
  elif [ -n "$CHAT_ERR" ]; then
    echo "   第 ${chat_attempt} 次失败：${CHAT_ERR}，等待 15s 后重试"
    sleep 15
  else
    fail "+run-chat 失败：$CHAT_OUT"
    break
  fi
done

# ── validation：run 命令必填参数缺失应报错
echo ""
echo "── validation：run 执行命令"

if node dist/index.js --host "$HOST" team +run-start --input "test" --yes 2>/dev/null; then
  fail "+run-start 缺 --team-id 应报错但未报"; else echo "  OK: +run-start 缺 --team-id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-start --team-id "x" --yes 2>/dev/null; then
  fail "+run-start 缺 --input 应报错但未报"; else echo "  OK: +run-start 缺 --input 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-chat --input "test" 2>/dev/null; then
  fail "+run-chat 缺 --team-id 应报错但未报"; else echo "  OK: +run-chat 缺 --team-id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-chat --team-id "x" 2>/dev/null; then
  fail "+run-chat 缺 --input 应报错但未报"; else echo "  OK: +run-chat 缺 --input 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-cancel --yes 2>/dev/null; then
  fail "+run-cancel 缺 --id 应报错但未报"; else echo "  OK: +run-cancel 缺 --id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-reply --input "x" --yes 2>/dev/null; then
  fail "+run-reply 缺 --id 应报错但未报"; else echo "  OK: +run-reply 缺 --id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-reply --id "x" --yes 2>/dev/null; then
  fail "+run-reply 缺 --input 应报错但未报"; else echo "  OK: +run-reply 缺 --input 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-result 2>/dev/null; then
  fail "+run-result 缺 --id 应报错但未报"; else echo "  OK: +run-result 缺 --id 正确拒绝"; fi

if node dist/index.js --host "$HOST" team +run-artifacts 2>/dev/null; then
  fail "+run-artifacts 缺 --id 应报错但未报"; else echo "  OK: +run-artifacts 缺 --id 正确拒绝"; fi

# ═════════════════════════════════════════
# 第三部分：清理
# ═════════════════════════════════════════
echo ""
echo "═══ 清理 ═══"

echo ""
echo "── +delete（清理 id=${CREATED_ID}）"
DELETE_OUT=$($CLI team +delete --yes --id "$CREATED_ID")
OK_VAL=$(echo "$DELETE_OUT" | jq '.data.ok // .ok')
if [ "$OK_VAL" = "true" ]; then
  ok "+delete 成功"
else
  fail "+delete 失败：$DELETE_OUT"
fi

# ═════════════════════════════════════════
# 汇总
# ═════════════════════════════════════════
echo ""
echo "════════════════════════════════════════"
echo "结果：通过 ${PASS}，失败 ${FAIL}"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "所有测试通过。"
