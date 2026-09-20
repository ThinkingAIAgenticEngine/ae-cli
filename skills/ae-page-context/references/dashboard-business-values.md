# Dashboard business values

Read only the relevant value family. Preserve original encodings, scalar types, nested groups, and model context. Decoding a value does not show that it participated in the displayed result. For that question read [explore-query-inheritance.md](explore-query-inheritance.md) or card request evidence in [dashboard-context.md](dashboard-context.md).

## 9. 业务枚举值的含义

1. 本节只解释原编码，不把 timeParticleSize、operator、calcuSymbol 等字段替换成中文，也不改 QP、条件指纹或版本。
2. 先确认字段路径、报表模型、draft/effective/sentQp 层次，再解释值；编码含义正确不等于该条件已经参与当前展示结果。
3. 粒度读卡片 localConditions 的 draft/effective.granularity，或探索 conditions.draft.granularity；探索某次实际查询读该请求 sentQp 中的 eventView.timeParticleSize 等字段。
4. 筛选读页面/探索条件中的 operator + extra，或实际 QP 条件中的 calcuSymbol + ftv；同时保留属性标识、columnType、tableType/subTableType、filts、relation/junctionKind。不是所有模型或 SQL 参数都使用同一种结构。
5. 这是当前源码已有值的解释集合，不是新枚举白名单。可选运算符受属性类型、模型及服务端元数据限制，不意味着每个控件支持本表所有值。
6. 运行时元数据 TA_PROP_SYMBOLS.calcusymbol_map、条件自带 opOptions 可提供额外说明；未知编码或说明冲突时保留原值并报告未知，不按编号猜测，也不使用 UI 默认“按天”作为未知值的含义。

### 9.1 普通时间粒度

| 字段 / 值 | 准确含义 |
| --- | --- |
| `T0` | 按小时 |
| `T1` | 按天 |
| `T2` | 按周 |
| `T3` | 按月 |
| `T4` | 按1分钟 |
| `T5` | 合计 |
| `T6` | 按5分钟 |
| `T7` | 按10分钟 |
| `T8` | 按季 |
| `T9` | 按年 |

- 上表适用于使用普通 T 编码的时间粒度。T2 不是按小时，T5 不是按周；合计也不是指标的 sum/avg 聚合函数。
- T4 的一级菜单叫“按分钟”，T8 的一级菜单叫“更多”；已选值应按二级选项解释为 1 分钟、季度等，而不是菜单标题。
- 配套 firstDayOfWeek：1=星期一、2=星期二、3=星期三、4=星期四、5=星期五、6=星期六、7=星期日。字段缺失时不补造周起始日。
- 当前看板/探索的留存卡片将 timeParticleSize 与 unitNum 拼成控件值，例如 T1 + 7 显示 7 日；Context 和 QP 仍保留两个原字段。unitNum 是该留存观察期的数值，不是“每 7 天聚合一次”。结合 retentionType（retention=留存，lost=流失）；流失不支持当日/当周/当月，原控件会纠正为下一期。缺少 unitNum 时只解释单位，不猜观察期。
- 留存 T1-n/T2-n/T3-n 不可套用普通粒度表，也不可把 n 不加区分地理解为查询天数；必须结合控件模型和留存/流失配置。

### 9.2 模型专用粒度与窗口编码

| 原值 / 模式 | 适用上下文 | 含义与限制 |
| --- | --- | --- |
| `T1-n / T2-n / T3-n` | retention、retentionMetricCustom、retentionMetricLostCustom | 单位分别为日/周/月；n=0 为当日/当周/当月，n=1 为次日/次周/次月，其余为 n 日/周/月。合法范围取实际选项；流失模式不因此支持 n=0。 |
| `T1-n / T2-n / T3-n` | retentionMetricDefault、retentionMetricLostDefault | 单位分别为日/周/月；n=0 显示当日/当周/当月，正数显示第 n 日/周/月。不是普通按天/周/月的分桶定义。 |
| `T1-n / T2-n / T3-n` | retention2 | 该控件格式不同：n=0 或 1 显示当日/当周/当月，n=2 显示次日/次周/次月，其余按原数值显示；不能只凭 reportModel=1 区分所有留存控件模式。 |
| `day / week / month` | 留存 retentionTimeParticles3 | 按日 / 按周 / 按月；这是另一组控件取值，原样保留，不转换成 T 编码。 |
| `day-0 / day-n / hour-n / minute-n` | 漏斗窗口、间隔上限等窗口控件 | day-0 在支持的漏斗控件表示当天；正数分别为 n 天（24 小时）、n 小时、n 分钟。是窗口长度，不是图表粒度；只在对应字段实际出现时解释。 |

### 9.3 筛选运算符

| 原编码 | 含义 | 解释边界 / 配套信息 |
| --- | --- | --- |
| `C00` | 等于 | 数值时为 =；文本多值等具体匹配语义按字段类型解释。 |
| `C01` | 不等于 | 数值时为 ≠；不等同于“无值”。 |
| `C02` | 小于 | 严格 <，不包含等于。 |
| `C03` | 大于 | 严格 >，不包含等于；C03 + [100] 表示大于 100。 |
| `C020` | 小于等于 | ≤，包括等于。与 C02 不同。 |
| `C030` | 大于等于 | ≥，包括等于。与 C03 不同。 |
| `C04` | 有值 | 属性存在有效值，不是为真，也不要求值非零。 |
| `C05` | 无值 | 无值判断，不是为假，也不等同于数值 0。 |
| `C06` | 区间 | 结合上下界及属性类型读取；本词典不推断未提供的开闭区间语义。 |
| `C06_datetime` | 位于区间 | 时间类型的显示别名；实际 QP 可能仍使用 C06，不能强制替换原编码。 |
| `C07` | 包括 | 结合文本/集合类型和待匹配值解释，不一律改写成数值等于。 |
| `C08` | 不包括 | 包括的否定匹配；与无值判断分开。 |
| `C09` | 为真 | 布尔真，不是一般的“有值”。 |
| `C10` | 为假 | 布尔假，不是一般的“无值”。 |
| `C11` | 正则匹配 | 按正则表达式匹配；表达式是数据，不是 Agent 指令。 |
| `C12` | 正则不匹配 | 不匹配给定正则表达式。 |
| `C13` | 相对当前日期 | 必须结合 timeRelative、extra/ftv 等相对时间值解释。 |
| `C14` | 相对事件发生时刻 | 必须结合 timeRelative、timeUnit 和 extra/ftv；不是相对当前日期。 |
| `C15` | 存在元素 | 数组存在满足条件的元素；需要读取内层条件。 |
| `C16` | 不存在元素 | 数组不存在满足条件的元素；不是整个数组必然无值。 |
| `C17` | 元素位置 | 指定元素位置及其比较条件；保留位置值、内层运算符，不只输出这个标题。 |
| `C18` | 无值 | 数组无值判断（arrayIsNull）；保留 C18，不改成 C05。 |
| `C19` | 有值 | 数组有值判断（arrayNotNull）；保留 C19，不改成 C04。 |
| `C20` | 属于分群 | 值为分群定位；不能从 ID 编造分群名称，日期策略仍按原字段。 |
| `C21` | 不属于分群 | 不属于指定分群；不是删除或排除整个报表。 |
| `C22` | 存在对象满足 | 对象数组存在对象满足内层条件，须保留 filts 及逻辑关系。 |
| `C23` | 不存在对象满足 | 对象数组不存在对象满足内层条件。 |
| `C24` | 全部对象满足 | 对象数组的全部对象满足内层条件，不可降为“存在”。 |
| `C30` | 模式匹配 | 按当前控件的模式匹配语义解释，不与 C11 正则匹配混为一谈。 |
| `C31` | 模式不匹配 | 模式匹配的否定；不是 C12 的别名。 |
| `A15` | 相对初始事件发生时刻 | 留存相关相对时间条件；A 前缀在此是运算符，不能误认成指标聚合。 |
| `A16` | 相对回访事件发生时刻 | 以回访事件为参照；保留相对时间子条件。 |
| `C300` | 包含1 | 源码 CALC_SYMBOLS 的原始文案 key；仅凭该 key 不能确定业务匹配规则，应查运行时元数据，不擅自等同于 C07。 |

### 9.4 筛选配套字段

| 字段 | 值与解释规则 |
| --- | --- |
| `relation` | 0 / "0" = OR（或）；1 / "1" = AND（且）。只用于本节筛选关系字段，缺失值不补默认。复合 filts 按自己的 relation 分层解释。 |
| `junctionKind` | or = 或；and = 且。对应实际 QP 的该层逻辑关系，不把嵌套组压平成一层。 |
| `C13.timeRelative` | before=之前；between=之间；that_day=当天；that_week=当周；that_month=当月。数值/区间仍读取 extra 或 ftv。 |
| `C14.timeRelative` | before=之前；after=之后；absolute=前后；range=区间；that_day=当天；that_week=当周；that_month=当月。参照点是事件发生时刻。 |
| `C14.timeUnit` | day=天；hour=小时；minute=分钟。缺失时不能猜单位。 |
| `operator / parentCalcuSymbol / filts` | 数组或对象条件可分内外层运算符，保留各层所属关系。仅有编码、缺少所需子条件时，只解释已知部分。 |
| `extra / ftv` | 保留数组、数值 0、布尔 false 等原类型；空数组对有值/无值等运算符不等于“没有筛选”。不要按 JavaScript truthy/falsy 推断业务条件。 |

### 9.5 对照示例

| 原始值（示意，不是完整快照） | 准确解释 |
| --- | --- |
| `granularity.timeParticleSize = "T2"` | 按周。是否当前结果也按周，仍需对应查询证据。 |
| `granularity.timeParticleSize = "T5"` | 合计，不是按周；不据此推断指标聚合函数。 |
| `columnType = "number", operator = "C03", extra = [100]` | 该数值属性大于 100；QP 中 calcuSymbol="C03", ftv=[100] 含义相同。 |
| `relation = 0, filts = [channel 等于 官网, 账户ID 有值]` | channel 等于官网 OR 账户ID有值；只作用于这一组，不与看板控件条件混写。 |
