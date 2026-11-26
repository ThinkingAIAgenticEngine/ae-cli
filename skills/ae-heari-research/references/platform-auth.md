# 认证与失败恢复

## 认证

ae-cli heari login 默认通过当前 AE 绑定的 HearI 地址验证只读访问，默认命令不需要 endpoint，地址由当前 AE 注册信息提供。已通过 ae-cli auth login 登录当前 AE 时，可直接运行 ae-cli heari studies list --no-input。部署方须启用 HEARI_CLI_LOGIN_ENABLED。首次 CLI 登录时，HearI 验票后会按当前 AE 身份建立工作区绑定，无需提前登录 HearI 网页。已停用的身份仍会被拒绝。自动兑换得到的个人只读凭据最长有效 5 分钟，仅用于本次调用。切换 AE 环境或账号后重新兑换；拒绝或超时后不切换到其他账号重试。

显式设置 HEARI_ENDPOINT 和 HEARI_TOKEN 时沿用该身份。没有 AE 登录态时仍可使用已保存的 HearI 登录。需要写权限时请使用具备相应权限的显式 HearI 凭据。离线 auth status 和 doctor 只检查本机；加 --online 会按业务命令的身份来源验证只读访问。换票失败时按 stage、site、http_status 和 service_code 定位，调查数量未知。

需要独立令牌时，将 HEARI_ENDPOINT 设为对应 HearI 站点的 /mcp 地址，并通过 --token-stdin 从标准输入传入令牌。

CI 中通过受保护的环境同时配置 HEARI_ENDPOINT 和 HEARI_TOKEN；不要把令牌放进参数、聊天、源码或日志。普通命令不会保存环境凭据；logout 只清除本机文件，服务端撤销在工作台完成。

先用本地帮助核对命令，遇到 AUTH 再解释认证/权限问题，不在每次只读查询前强制重新登录。`ae-cli heari tools --no-input` 可查看实际工具，但不能据此假设账号可执行所有操作。

## 恢复

- 用法错误（退出 2）：修正参数，不原样重复请求。
- AUTH/HTTP：根据错误码、http_status 与工作台权限处理；不要尝试扩大权限或泄露响应内容来绕过拒绝。
- 创建/发布/分析/报告生成超时，或创建返回 PROTOCOL、TOOL、CANCELLED 等无法确定写入结果的错误：结果可能已写入，失败不表示回滚。创建失败后先用 `studies list` 查找此次研究，有实际 ID 时用 `studies status`、`guide show` 核对。找到对象则沿用同一对象；未找到或只读核对也失败时报告结果未知并停止创建，不据此改用另一个创建入口。列表只有最多30条，无法单凭查无结果证明未创建。其他操作查最新报告或已有任务，不自动重新提交写操作。
- guide edit 网络失败：保留错误中的 turn_id，先 `guide show` 核对；确需核对重试时复用相同 `--turn-id`，不要重新生成随机候选身份。guide apply 失败后检查原候选和当前提纲。
- 导出超时：先查询已有任务；确需重试时保持原幂等键与参数。
- 刷新凭据互斥冲突：等待其他本机命令结束后再试。不要删除锁或修改凭据文件；刷新轮换后进程崩溃可能需要重新登录。
- 需要更新时先 `ae-cli update --dry-run`；安装更新按用户授权执行，不将一般研究操作理解为更新授权。

CLI 不自动重试写操作，技能也不增加盲目重试。状态仍不确定、持续失败或需要用户完成网页步骤时，报告已知结果和下一步并停止依赖该结果的操作。

已验证的权限错误可附 tool_code：EXECUTION_SCOPE_REQUIRED 需执行授权，TOKEN_READ_ONLY 需草稿授权，ROLE_FORBIDDEN 需工作区角色，IDENTITY_REQUIRED 需核实身份；RATE_LIMITED 不意味着可以立即重试写入。未知错误保持原契约，不从提示文字猜测权限或自动更换身份。

TOOL 提示是客户端固定安全文案，不透传远端错误正文；不要要求用户收集或粘贴令牌、原始响应或客户研究内容来恢复。保留 code、已验证的 tool_code、操作/候选/任务 ID；按实际状态核对后再继续。

环境排查可用 `ae-cli heari doctor --no-input`；仅在需要连接/只读访问验证时加 `--online`。报告在stdout，即使退出1也读取checks逐项解释；WARN/SKIP不代表全部通过。doctor不刷新或修复凭据，不从READ_VERIFIED推断EXECUTE权限。

`ae-cli heari auth status --no-input` 只查本机；`--online` 用同一只读诊断流程验证访问。authenticated=true 仅证明READ，false仅表示HTTP401或身份缺失，权限不足时 authenticated 仍为null、read_access=false；网络或协议失败同样不能证明未登录。configured 与 usable_locally 不代表服务端认可；不刷新或保存凭据。先保留 code/checks 排错，不索取原始响应。

CANCELLED（退出1）表示本地请求/等待已停止，不证明服务端任务已取消或写操作回滚。保留job_id或turn_id，先查同一对象；不要自动重建任务。服务端AUTH/TOOL拒绝后CLI不会自动重握手、刷新令牌或重放写入。
