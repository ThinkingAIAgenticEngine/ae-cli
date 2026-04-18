# Tech context

## 运行时与语言

- **Node.js**：`>= 18`（见 `package.json` engines）。
- **模块**：ESM（`"type": "module"`），源码 `.ts`，构建输出 `dist/`。
- **TypeScript**：^5.5；开发跑 `tsx`，构建用 `tsup` 打 ESM bundle。

## 依赖要点

- `commander`：CLI 解析与命令树。
- `cli-table3`：`--format table` 时表格输出。
- `ws`：如需 WebSocket 相关能力（以实际使用处为准）。

## 脚本

| 脚本 | 用途 |
|------|------|
| `npm run dev` | `tsx src/index.ts` |
| `npm run build` | `tsup src/index.ts --format esm --outDir dist` |
| `npm run start` | `node dist/index.js` |
| `npm test` | 当前为轻量 `--help` 调用（见 `package.json`） |

## 版本

- 包版本以 `package.json` `version` 为准（当前仓库内为 **1.0.3**，发布源以 npm 为准）。

## 说明（与全局用户规则）

- 用户规则中 **Java / Checkstyle / `mvn validate`** 适用于其它 Java 项目；**本仓库** 验证以 `npm run build` 与约定测试为准，不运行 Maven。
