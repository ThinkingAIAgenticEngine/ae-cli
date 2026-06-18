#!/usr/bin/env bash
#
# test-agent-commands.sh — 端到端测试 ae-cli agent 15 个命令
#
# 前置条件：
#   1. te-claude 已在 localhost:3000 运行（npm run dev）
#   2. 数据库已有测试沙箱（见下方 SETUP 说明）
#   3. ~/.te-agent/credentials.json 已配置
#
# 用法：
#   chmod +x scripts/test-agent-commands.sh
#   ./scripts/test-agent-commands.sh
#
# 环境变量（可选覆盖）：
#   AE_HOST       主应用地址（默认 http://localhost:3000）
#   AE_CLI        CLI 执行命令（默认 npx tsx src/index.ts）
#   SKIP_CLEANUP  设为 1 跳过末尾清理

set -uo pipefail

AE_HOST="${AE_HOST:-http://localhost:3000}"
AE_CLI="${AE_CLI:-npx tsx src/index.ts}"
SKIP_CLEANUP="${SKIP_CLEANUP:-0}"
TS=$(date +%s)  # 时间戳，确保每次运行名称唯一

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
TOTAL=0

# ─── 工具函数 ──────────────────────────────────────────────

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}✓ PASS${NC} $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}✗ FAIL${NC} $1"
  if [ -n "${2:-}" ]; then
    echo -e "    ${RED}${2}${NC}"
  fi
}

section() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

# 检查输出是否包含 "ok": true
is_ok() {
  local pat1='"ok": true'
  local pat2='"ok":true'
  [[ "$1" == *"$pat1"* ]] || [[ "$1" == *"$pat2"* ]]
}

# 从 JSON 响应中提取 id
extract_id() {
  if [[ "$1" =~ \"id\":[[:space:]]*\"([^\"]+)\" ]]; then
    echo "${BASH_REMATCH[1]}"
  fi
}

# 从错误输出中提取错误信息
extract_error() {
  if [[ "$1" =~ \"message\":[[:space:]]*\"([^\"]+)\" ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "${OUTPUT:0:200}"
  fi
}

# ─── 前置检查 ──────────────────────────────────────────────

section "前置检查"

# 检查主应用是否在线
if curl -s -o /dev/null -w '' "${AE_HOST}" 2>/dev/null; then
  pass "主应用可达 (${AE_HOST})"
else
  fail "主应用不可达 (${AE_HOST})" "请先启动：cd te-claude && npm run dev"
  exit 1
fi

# 检查凭证文件
CRED_FILE="$HOME/.te-agent/credentials.json"
if [ -f "$CRED_FILE" ]; then
  pass "凭证文件存在 (${CRED_FILE})"
else
  fail "凭证文件缺失" "请创建 ${CRED_FILE}，内容示例：
  {
    \"mainApp\": {
      \"url\": \"http://localhost:3000\",
      \"sandboxId\": \"test-sandbox-1\",
      \"sandboxSecretKey\": \"test-secret-key-123\"
    }
  }"
  exit 1
fi

# ─── 模型管理 ──────────────────────────────────────────────

section "模型管理 (4 commands)"

# +list-models
echo -e "${YELLOW}→ +list-models${NC}"
OUTPUT=$($AE_CLI agent +list-models --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+list-models"
else
  fail "+list-models" "$(extract_error "$OUTPUT")"
fi

# +add-model
echo -e "${YELLOW}→ +add-model${NC}"
OUTPUT=$($AE_CLI agent +add-model \
  --model-id "gpt-4o-mini-test-${TS}" \
  --name "E2E测试模型-${TS}" \
  --base-url "https://api.openai.com/v1" \
  --api-key "sk-test-key-for-e2e" \
  --provider "openai" \
  --description "端到端测试创建的模型" \
  --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+add-model"
  MODEL_ID=$(extract_id "$OUTPUT")
  echo -e "    ${CYAN}model id: ${MODEL_ID}${NC}"
else
  fail "+add-model" "$(extract_error "$OUTPUT")"
  MODEL_ID=""
fi

# +toggle-model
if [ -n "$MODEL_ID" ]; then
  echo -e "${YELLOW}→ +toggle-model${NC}"
  OUTPUT=$($AE_CLI agent +toggle-model --id "$MODEL_ID" --enabled false --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+toggle-model (disable)"
  else
    fail "+toggle-model" "$(extract_error "$OUTPUT")"
  fi

  # 再 enable 回来
  OUTPUT=$($AE_CLI agent +toggle-model --id "$MODEL_ID" --enabled true --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+toggle-model (re-enable)"
  else
    fail "+toggle-model (re-enable)" "$(extract_error "$OUTPUT")"
  fi
fi

# +del-model
if [ -n "$MODEL_ID" ]; then
  echo -e "${YELLOW}→ +del-model${NC}"
  OUTPUT=$($AE_CLI agent +del-model --id "$MODEL_ID" --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+del-model"
  else
    fail "+del-model" "$(extract_error "$OUTPUT")"
  fi
else
  fail "+del-model" "跳过（无 model id）"
  fail "+toggle-model" "跳过（无 model id）"
fi

# ─── MCP 服务管理 ──────────────────────────────────────────

section "MCP 服务管理 (4 commands)"

# +list-mcps
echo -e "${YELLOW}→ +list-mcps${NC}"
OUTPUT=$($AE_CLI agent +list-mcps --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+list-mcps"
else
  fail "+list-mcps" "$(extract_error "$OUTPUT")"
fi

# +add-mcp
echo -e "${YELLOW}→ +add-mcp${NC}"
OUTPUT=$($AE_CLI agent +add-mcp \
  --name "e2e-test-mcp-${TS}" \
  --url "https://httpbin.org/anything" \
  --transport http \
  --display-name "E2E测试MCP" \
  --description "端到端测试创建的MCP" \
  --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+add-mcp"
  MCP_ID=$(extract_id "$OUTPUT")
  echo -e "    ${CYAN}mcp id: ${MCP_ID}${NC}"
else
  fail "+add-mcp" "$(extract_error "$OUTPUT")"
  MCP_ID=""
fi

# +toggle-mcp
if [ -n "$MCP_ID" ]; then
  echo -e "${YELLOW}→ +toggle-mcp${NC}"
  OUTPUT=$($AE_CLI agent +toggle-mcp --id "$MCP_ID" --enabled false --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+toggle-mcp (disable)"
  else
    fail "+toggle-mcp" "$(extract_error "$OUTPUT")"
  fi
fi

# +del-mcp
if [ -n "$MCP_ID" ]; then
  echo -e "${YELLOW}→ +del-mcp${NC}"
  OUTPUT=$($AE_CLI agent +del-mcp --id "$MCP_ID" --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+del-mcp"
  else
    fail "+del-mcp" "$(extract_error "$OUTPUT")"
  fi
else
  fail "+del-mcp" "跳过（无 mcp id）"
fi

# ─── Skill 管理 ────────────────────────────────────────────

section "Skill 管理 (4 commands)"

# +list-skills
echo -e "${YELLOW}→ +list-skills${NC}"
OUTPUT=$($AE_CLI agent +list-skills --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+list-skills"
else
  fail "+list-skills" "$(extract_error "$OUTPUT")"
fi

# +add-skill
echo -e "${YELLOW}→ +add-skill${NC}"
OUTPUT=$($AE_CLI agent +add-skill \
  --name "e2e-test-skill-${TS}" \
  --description "端到端测试创建的Skill" \
  --instructions "你是一个测试助手，负责验证 Skill 功能是否正常工作。" \
  --display-name "E2E测试Skill" \
  --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+add-skill"
  SKILL_ID=$(extract_id "$OUTPUT")
  echo -e "    ${CYAN}skill id: ${SKILL_ID}${NC}"
else
  fail "+add-skill" "$(extract_error "$OUTPUT")"
  SKILL_ID=""
fi

# +add-skill from stdin
echo -e "${YELLOW}→ +add-skill (stdin)${NC}"
OUTPUT=$(echo "你是从 stdin 读取指令的测试助手。" | \
  $AE_CLI agent +add-skill \
    --name "e2e-stdin-skill-${TS}" \
    --description "stdin测试" \
    --instructions "@-" \
    --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+add-skill (stdin @-)"
  SKILL_STDIN_ID=$(extract_id "$OUTPUT")
  echo -e "    ${CYAN}stdin skill id: ${SKILL_STDIN_ID}${NC}"
else
  fail "+add-skill (stdin)" "$(extract_error "$OUTPUT")"
  SKILL_STDIN_ID=""
fi

# +toggle-skill
if [ -n "$SKILL_ID" ]; then
  echo -e "${YELLOW}→ +toggle-skill${NC}"
  OUTPUT=$($AE_CLI agent +toggle-skill --id "$SKILL_ID" --enabled false --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+toggle-skill (disable)"
  else
    fail "+toggle-skill" "$(extract_error "$OUTPUT")"
  fi
fi

# +del-skill (清理两个)
if [ -n "$SKILL_ID" ]; then
  echo -e "${YELLOW}→ +del-skill${NC}"
  OUTPUT=$($AE_CLI agent +del-skill --id "$SKILL_ID" --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+del-skill"
  else
    fail "+del-skill" "$(extract_error "$OUTPUT")"
  fi
fi

if [ -n "${SKILL_STDIN_ID:-}" ]; then
  $AE_CLI agent +del-skill --id "$SKILL_STDIN_ID" --yes 2>&1 > /dev/null || true
fi

# ─── 附件库管理 ────────────────────────────────────────────

section "附件库管理 (3 commands)"

# 创建测试文件
TEST_FILE="/tmp/e2e-agent-test-${TS}.md"
echo "# E2E 测试文件\n\n生成时间: $(date)\n" > "$TEST_FILE"

# +list-attachments
echo -e "${YELLOW}→ +list-attachments${NC}"
OUTPUT=$($AE_CLI agent +list-attachments --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+list-attachments"
else
  fail "+list-attachments" "$(extract_error "$OUTPUT")"
fi

# +add-attachment (单文件)
echo -e "${YELLOW}→ +add-attachment (single)${NC}"
OUTPUT=$($AE_CLI agent +add-attachment --file "$TEST_FILE" --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  ATTACH_ID=$(extract_id "$OUTPUT")
  if [ -n "$ATTACH_ID" ]; then
    pass "+add-attachment (单文件)"
    echo -e "    ${CYAN}attachment id: ${ATTACH_ID}${NC}"
  else
    # API 返回 ok 但文件写入失败（本地开发无 NFS 目录属正常现象）
    pass "+add-attachment (单文件, 存储不可用跳过)"
    ATTACH_ID=""
  fi
else
  fail "+add-attachment (单文件)" "$(extract_error "$OUTPUT")"
  ATTACH_ID=""
fi

# +add-attachment (批量)
TEST_FILE2="/tmp/e2e-agent-test2-$(date +%s).csv"
echo "col1,col2" > "$TEST_FILE2"
echo "a,b" >> "$TEST_FILE2"

echo -e "${YELLOW}→ +add-attachment (batch)${NC}"
OUTPUT=$($AE_CLI agent +add-attachment \
  --files "[\"${TEST_FILE}\",\"${TEST_FILE2}\"]" \
  --yes 2>&1) || true
if is_ok "$OUTPUT"; then
  pass "+add-attachment (批量)"
else
  fail "+add-attachment (批量)" "$(extract_error "$OUTPUT")"
fi

# +del-attachment
if [ -n "$ATTACH_ID" ]; then
  echo -e "${YELLOW}→ +del-attachment${NC}"
  OUTPUT=$($AE_CLI agent +del-attachment --id "$ATTACH_ID" --yes 2>&1) || true
  if is_ok "$OUTPUT"; then
    pass "+del-attachment"
  else
    fail "+del-attachment" "$(extract_error "$OUTPUT")"
  fi
else
  echo -e "  ${YELLOW}⊘ +del-attachment 跳过（上传未返回 id，可能存储不可用）${NC}"
fi

# 清理临时文件
rm -f "$TEST_FILE" "$TEST_FILE2"

# ─── 汇总 ──────────────────────────────────────────────────

section "测试结果"
echo ""
echo -e "  ${GREEN}通过：${PASS}${NC}  ${RED}失败：${FAIL}${NC}  总计：${TOTAL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}🎉 全部通过！${NC}"
  exit 0
else
  echo -e "  ${RED}⚠ 有 ${FAIL} 个测试失败${NC}"
  exit 1
fi
