"""Build a fixed, synthetic, offline catalogue experiment; never call a service."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parents[2]
SOURCE = WORKSPACE / 'docs/business-semantics/cli-consumption-20261116'


def read(path):
    return json.loads(path.read_text())


def write(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


state = read(SOURCE / 'fixture-lifecycle/state-final.json')
catalogue = read(SOURCE / 'scale-fixture/catalog.json')['data']['items']
core_ids = ['preference_27', 'preference_28', 'preference_29', 'preference_30',
            'preference_31', 'preference_32', 'preference_33', 'preference_34',
            'preference_49', 'preference_50', 'semantic_46', 'semantic_48',
            'semantic_52', 'preference_53']
rows = []
for entry_id in core_ids:
    entry = state[entry_id]
    # Preserve actual original metadata, including aliases that only existed in keywords.
    sources = [{'path': 'docs/business-semantics/cli-consumption-20261116/fixture-lifecycle/state-final.json',
                'entry_id': entry_id, 'excerpt': entry['content'],
                'original_keywords': entry['keywords']}]
    sources.extend({'excerpt': source['excerpt']} for source in entry.get('sources', []))
    rows.append({k: entry[k] for k in ['id', 'title', 'summary', 'keywords', 'content']}
                | {'dependency_ids': entry['dependency_ids'], 'sources': sources})

for index in [1 + 6 * n for n in range(46)]:
    entry = catalogue[index]
    # The scale source has no full-body document: its entire substantive summary
    # becomes the truth document, with scope made explicit, without new rules.
    content = '星岛餐厅。' + entry['summary']
    rows.append({k: entry[k] for k in ['id', 'title', 'summary']}
                | {'keywords': [], 'content': content, 'dependency_ids': [],
                   'sources': [{'path': 'docs/business-semantics/cli-consumption-20261116/scale-fixture/catalog.json',
                                'entry_id': entry['id'], 'excerpt': entry['summary'],
                                'note': '原目录未提供 keywords，旧关键词保留为空；正文只复用原摘要。'}]})

# Freeze questions and gold before writing any revised catalogue metadata.
questions = [
    ('Q01', '按我个人只看登录的 DAU 口径，最近七个完整自然日怎么算？只通关或领奖算活跃吗，能顺手排除内测账号吗？'),
    ('Q02', '没有个人另定口径时，星岛餐厅共享日活的登录人数和通关人数能直接相加吗？'),
    ('Q03', '上周新来的厨师进入游戏头七天一共贡献多少价值？如果再看平均每个人，分母该用什么，注册人数能代替吗？'),
    ('Q04', '我说的买量七日回本比例怎么算？是净收入除以成本，还是先减成本？成本为零以及只有活动渠道时怎么办？'),
    ('Q05', '支付成功减退款才是净流水吗？退款是正数怎么扣，CNY 和 USD 能直接加起来吗？'),
    ('Q06', '同事说的“厨房开门”对应登录还是通关？看到通关就能当成付费，看到登录就能认定首次安装吗？'),
    ('Q07', '我沿用个人登录活跃口径，想看本月星厨赛的活动覆盖。可以拿领奖人数除以全部活跃人数吗，资格数据缺了怎么办？'),
    ('Q08', '新厨师登录回访突然降了，该先查什么？分渠道样本很少、回访窗口还没跑满时怎么呈现，没安装数据能拿首次登录顶上吗？'),
    ('Q09', '星岛餐厅经营简报的金额、比例和人数各保留几位？这次我要求两位小数，是否覆盖默认精度？'),
    ('Q10', '会员月报想按会员等级拆开，先分层还是先合计？金额小数位也要跟着换一套吗？'),
    ('Q11', '登录和支付查询都没有记录，这能写成真实零活跃、零收入、零回本吗？应该先核实哪些缺口？'),
    ('Q12', '现在复用夏日限时活动的领奖率规则可以吗？依赖的奖励资格已经过期，但参加和领奖事件还在，能继续算吗？'),
    ('Q13', '餐车巡游入门组的奖励核算，玩家途中升到了别组，按开始时还是结束时的组归并？这套能顺便算全项目获客回收吗？'),
    ('Q14', '我同时核对海岛集市大师组的订单归属和海岛集市入门组的退款处理，各自以哪个时点的组为准？'),
    ('Q15', '合成蘑菇需要哪两个食材，失败会消耗多少体力？'),
    ('Q16', '俄罗斯区圣诞月卡现在卖多少卢布，苹果商店和安卓商店分别什么价格？'),
]
gold_specs = [
    ('Q01', ['preference_27'], ['preference_30'], [], '个人登录日活优先；通关、领奖与测试账号排除边界均在本条。共享口径不能替代。'),
    ('Q02', ['semantic_46'], ['preference_27'], [], '明确问无个人覆盖的共享默认，需去重并集而非人数相加。个人条仅可补充优先级解释。'),
    ('Q03', ['preference_49'], ['preference_34'], ['semantic_48'], '七日LTV总额、人均分母、首次安装不可替代来自价值规则；净收入规则是明确依赖。'),
    ('Q04', ['preference_50'], ['preference_49', 'preference_34'], ['semantic_48'], '回本别名、公式、零成本和两种渠道边界来自七日回收；净收入规则是明确依赖。'),
    ('Q05', ['semantic_48'], [], [], '净流水为原快照关键词别名；同币种、退款正负与不自动人均在收入正文。'),
    ('Q06', ['preference_30'], ['preference_27', 'semantic_46'], [], '厨房开门是原有标题及关键词别名，事件关系及不推断安装、付费由事件边界正文规定。'),
    ('Q07', ['preference_31'], ['preference_32'], ['preference_27'], '参与率需资格活跃分母、join分子与ID核验；正文要求读取有效日活，本题明确个人登录口径。'),
    ('Q08', ['preference_28'], ['preference_30', 'preference_34'], [], '回访排查流程明确样本少、窗口不成熟与缺安装边界，不需要猜测留存公式。'),
    ('Q09', ['preference_29'], [], [], '默认三位、人数整数和当次两位要求的优先级均在格式规则。'),
    ('Q10', ['preference_33', 'preference_29'], [], [], '会员月报负责顺序且不改精度；格式条负责金额精度，两条均是直接问题。'),
    ('Q11', ['preference_34'], ['preference_27', 'semantic_48', 'preference_50'], [], '空结果不是业务零；接入、窗口、权限先核实，不要求计算具体指标。'),
    ('Q12', ['preference_53'], [], ['semantic_52'], '父规则要求资格有效；依赖正文明确有效截至2026-08-31。需要读取过期依赖后停止，不能沿用。'),
    ('Q13', ['preference_10001'], ['preference_10031'], [], '仅该活动该组的奖励核算，按结束组归并且不替代全项目回收；同组分组统计可补充。'),
    ('Q14', ['preference_10223', 'preference_10073'], [], [], '分别定位大师组订单与入门组退款，不能用同活动不同组或不同主题替代。'),
    ('Q15', [], [], [], '目录没有食材配方或体力消耗规则，合成背景不能推出具体规则。'),
    ('Q16', [], [], [], '目录没有地区月卡或商店定价；金额展示或币种规则不能回答商品价格。'),
]
write('queries.json', [{'id': qid, 'question': question} for qid, question in questions])
write('gold.json', [{'id': qid, 'required_candidate_ids': required,
                     'acceptable_extra_candidate_ids': extra, 'required_dependency_ids': deps,
                     'reason': reason} for qid, required, extra, deps, reason in gold_specs])
gold_sha = hashlib.sha256((ROOT / 'gold.json').read_bytes()).hexdigest()

# Revised keywords are verbatim body phrases or aliases in the original snapshot.
improvements = {
    'preference_27': ('个人登录日活：自然日与排除边界', '个人日活仅计 ps_login 去重玩家，最近7个完整自然日不含今天；通关、领奖不能替代登录，没有测试账号标记不得自行排除。', ['日活玩家', '完整自然日', '测试账号标记']),
    'preference_28': ('新厨师回访排查：渠道、样本与窗口', '先核实登录和通关接入及窗口，再按获客渠道拆分；小样本展示人数，未成熟窗口说明，缺安装不以注册或首次登录替代。', ['新厨师回访', '渠道样本过少', '回访窗口未成熟', '历史首次安装记录']),
    'preference_29': ('经营简报格式：三位小数与当次要求', '金额和比例默认三位小数、人数为整数；展示不改计算精度，用户当次指定优先，无汇率不换算。', ['经营简报', '金额和比例', '保留三位小数', '用户当次明确指定精度']),
    'preference_30': ('厨房开门与通关：登录、安装、付费边界', 'ps_login 为登录、ps_level_complete 为关卡完成；不能互相替代，也不能据此推断首次安装或付费，日活另读适用规则。', ['厨房开门', '玩家登录游戏', '关卡完成', '玩家首次安装']),
    'preference_31': ('星厨赛参与率：资格活跃分母与参加分子', '参加按 ps_campaign_join 去重，分母为同期具资格的活跃玩家；活跃读有效日活，领奖不能替代参加或分母，缺ID或资格时暂停计算。', ['星厨赛的参与人数', '具备参赛资格的活跃玩家', '当前用户有效日活规则', '暂停参与率计算']),
    'preference_32': ('活动复盘：参加、领奖、付费与可比性', '核实活动ID和窗口，分别看参加、领奖、支付；按进入时间和获客渠道检查可比性，缺安装不声称完成新增安装批次对照。', ['活动复盘', '玩家进入时间', '获客渠道检查可比性', '新增安装 cohort 对照']),
    'preference_33': ('会员月报：会员等级分层先于合计', '仅会员月报按 ps_member_level 先分层后合计；不适用于日活或回本，不改变金额和比例的小数位。', ['星岛餐厅会员月报', '分层再给合计', '不适用于日活简报或渠道回本问题']),
    'preference_34': ('空结果边界：先查接入、窗口与权限', '星岛餐厅尚缺业务流水；查询无记录先查接入、窗口、权限，不能报告真实零活跃、零收入或零回本，区分定义明确与数值不可验证。', ['事件数据是否接入', '查询窗口与权限', '零活跃、零收入或零回本', '数值不可验证']),
    'preference_49': ('七日LTV总额与人均：首次安装批次', '头七天价值取历史首次安装批次生命天0到6累计净收入，先读收入净额；LTV默认总额，人均另除同批安装人数，缺安装不以注册或登录替代。', ['进入游戏后的头七天贡献多少价值', '历史首次安装', '累计收入净额', '默认不是人均值']),
    'preference_50': ('渠道七日回收：净收入除获客成本', '同获客渠道、同首次安装批次生命天0到6净收入除同批成本，先读收入净额且币种一致；非利润率，零成本不可除，活动渠道不能替代获客渠道。', ['渠道七日回收', '回本比例', '七日ROI', '成本为零', '玩家获客渠道']),
    'semantic_46': ('共享日活默认：登录或通关去重并集', '共享日活取登录或通关去重用户并集，不能加两种去重人数；按项目时区，最近7个完整自然日不含今天，有适用个人口径时优先采用个人口径。', ['共享日活', '去重用户并集', '完整自然日', '适用个人明确口径优先']),
    'semantic_48': ('收入净额：同窗口同币种支付减退款', '同观察窗口、同币种的支付成功金额减退款金额；退款按正值扣减前核实符号，不混币或虚构汇率，本条不自动除人数。', ['收入净额', '净流水', '退款金额按正值扣减', '不跨币种直接求和', '不自动除以人数']),
    'semantic_52': ('夏日食材节旧奖励资格：有效至2026-08-31', '仅2026年夏日食材节，先参加再同活动ID领奖才有效；资格有效至2026-08-31，之后必须取得新定义。', ['夏日食材节活动', '有效奖励用户', '规则有效至2026-08-31', '必须取得新资格定义']),
    'preference_53': ('夏日奖励转化：依赖资格有效才可计算', '先读夏日食材节资格，资格和事件有效时以合格参加者为分母、有效领奖者为分子；资格过期、缺失或不可读时停止，需补当前定义。', ['夏日限时活动', '奖励转化规则', '夏日食材节奖励资格', '不得将旧规则复活', '当前有效资格定义']),
}
for row in rows:
    if row['id'] in improvements:
        title, summary, keys = improvements[row['id']]
    else:
        # Existing topic and scope are already specific. Keep the original title.
        title = row['title']
        topic = row['title']
        summary = f'{topic}只适用于该活动和组别；跨组迁移按活动结束时最终组归并，不替代全项目新增、价值或获客回收。'
        keys = [topic, '跨组迁移', '最终组归并']
        # Full title/topic is supported by the exact original summary wording.
        if topic not in row['content']:
            keys[0] = row['summary'].split('按活动结束时')[0]
    row.update(improved_title=title, improved_summary=summary, improved_keywords=keys)
    assert 2 <= len(keys) <= 5
    for keyword in keys:
        assert (keyword in row['content']
                or any(keyword in source.get('excerpt', '') or keyword in source.get('original_keywords', [])
                       for source in row['sources'])), (row['id'], keyword)

assert len(rows) == 60 and len({row['id'] for row in rows}) == 60
ids = {row['id'] for row in rows}
for item in read(ROOT / 'gold.json'):
    for field in ['required_candidate_ids', 'acceptable_extra_candidate_ids', 'required_dependency_ids']:
        assert set(item[field]) <= ids, item
assert len(questions) == 16
write('rows.json', rows)
write('bodies.json', [{'id': row['id'], 'content': row['content'],
                       'dependency_ids': row['dependency_ids']} for row in rows])
for arm, improved, keywords in [('A', False, False), ('B', False, True), ('C', True, False), ('D', True, True)]:
    output = []
    for row in rows:
        prefix = 'improved_' if improved else ''
        entry = {'id': row['id'], 'title': row[prefix + 'title'], 'summary': row[prefix + 'summary']}
        if keywords:
            entry['keywords'] = row[prefix + 'keywords']
        output.append(entry)
    write(f'catalog-{arm}.json', output)
write('freeze.json', {'row_count': len(rows), 'query_count': len(questions),
                      'gold_sha256': gold_sha,
                      'source_state_sha256': hashlib.sha256((SOURCE / 'fixture-lifecycle/state-final.json').read_bytes()).hexdigest(),
                      'source_catalog_sha256': hashlib.sha256((SOURCE / 'scale-fixture/catalog.json').read_bytes()).hexdigest(),
                      'source_manifest': 'docs/business-semantics/cli-consumption-20261116/fixture-refinement/manifest.json',
                      'source_manifest_sha256': hashlib.sha256((SOURCE / 'fixture-refinement/manifest.json').read_bytes()).hexdigest(),
                      'construction_order': '正文与原元数据 -> queries/gold -> 改写元数据 -> 四臂目录',
                      'baseline_keyword_rows': sum(bool(row['keywords']) for row in rows),
                      'improved_keyword_rows': sum(bool(row['improved_keywords']) for row in rows)})
print(json.dumps({'rows': len(rows), 'queries': len(questions), 'gold_sha256': gold_sha}, ensure_ascii=False))
