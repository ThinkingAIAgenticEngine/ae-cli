// Event tag priority for #event data sheet ordering (lower = higher priority).
// Ordered: SDK autotrack events first, then business events by importance:
// Basic → core gameplay → monetization → supporting → genre-specific → non-game.
const TAG_PRIORITY: Record<string, number> = {
  // Account lifecycle
  'Basic': 1,
  // Core gameplay
  'Battle': 10, 'Stage': 11, 'Dungeon': 12, 'Gacha': 13,
  // Progression & economy
  'Growth': 20, 'Resource': 21,
  // Monetization
  'Ads': 30, 'Payment': 31, 'Subscription': 32,
  // Supporting systems
  'Shop': 40, 'Quest': 41, 'Achievement': 42, 'Check-in': 43,
  'Leaderboard': 44, 'Guild': 45, 'Social': 46,
  // Genre-specific (game)
  'Building': 50, 'Alliance': 51, 'Equipment': 52, 'Trade': 53,
  'Revive': 54, 'Slots': 55, 'Lottery': 56, 'Reward': 57,
  // Non-game
  'Discovery': 60, 'Product': 61, 'Order': 62, 'After-sales': 63,
  'Content': 64, 'Interaction': 65, 'Relationship': 66, 'Live': 67,
  'Onboarding': 68, 'Course': 69, 'Enrollment': 70, 'Quiz': 71,
  'Creation': 72, 'Material': 73, 'Export': 74, 'Playback': 75,
  'Withdraw': 76,
};

const DEFAULT_TAG_PRIORITY = 80;

// Reverse map: localized tag → canonical English tag name (for priority lookup).
// Sync with business-dimension-mapping.md Appendix: event_tag 多语言对照表.
const CANONICAL_TAG: Record<string, string> = {
  // zh
  '基础事件': 'Basic',
  '战斗': 'Battle', '关卡': 'Stage', '副本': 'Dungeon', '抽卡': 'Gacha',
  '养成': 'Growth', '成长': 'Growth', '资源': 'Resource',
  '广告': 'Ads', '支付': 'Payment', '订阅': 'Subscription',
  '商城': 'Shop', '任务': 'Quest', '成就': 'Achievement', '签到': 'Check-in',
  '排行榜': 'Leaderboard', '公会': 'Guild', '社交': 'Social',
  '建筑': 'Building', '联盟': 'Alliance', '装备': 'Equipment', '交易': 'Trade',
  '复活': 'Revive', '抽奖': 'Lottery', '奖励': 'Reward', '提现': 'Withdraw',
  '发现': 'Discovery', '商品': 'Product', '订单': 'Order', '售后': 'After-sales',
  '内容': 'Content', '互动': 'Interaction', '关系': 'Relationship', '直播': 'Live',
  '引导': 'Onboarding', '课程': 'Course', '报名': 'Enrollment', '测验': 'Quiz',
  '创作': 'Creation', '素材': 'Material', '导出': 'Export', '内容播放': 'Playback',
  // ja
  '基本イベント': 'Basic',
  '戦闘': 'Battle', 'ステージ': 'Stage', 'ダンジョン': 'Dungeon', 'ガチャ': 'Gacha',
  '育成': 'Growth', 'リソース': 'Resource',
  '広告': 'Ads', '支払い': 'Payment', 'サブスクリプション': 'Subscription',
  'ショップ': 'Shop', 'クエスト': 'Quest', '実績': 'Achievement', 'チェックイン': 'Check-in',
  'ランキング': 'Leaderboard', 'ギルド': 'Guild', 'ソーシャル': 'Social',
  '建築': 'Building', '同盟': 'Alliance', '装備': 'Equipment', 'トレード': 'Trade',
  '復活': 'Revive', 'スロット': 'Slots', '抽選': 'Lottery', '報酬': 'Reward', '引き出し': 'Withdraw',
  '発見': 'Discovery', '注文': 'Order', 'アフターサービス': 'After-sales',
  'コンテンツ': 'Content', 'インタラクション': 'Interaction', '関係': 'Relationship', 'ライブ': 'Live',
  'オンボーディング': 'Onboarding', 'コース': 'Course', '申し込み': 'Enrollment', 'クイズ': 'Quiz',
  '創作': 'Creation', 'エクスポート': 'Export', '再生': 'Playback',
  // ko
  '기본 이벤트': 'Basic',
  '전투': 'Battle', '스테이지': 'Stage', '던전': 'Dungeon', '가챠': 'Gacha',
  '육성': 'Growth', '리소스': 'Resource',
  '광고': 'Ads', '결제': 'Payment', '구독': 'Subscription',
  '상점': 'Shop', '퀘스트': 'Quest', '업적': 'Achievement', '출석체크': 'Check-in',
  '리더보드': 'Leaderboard', '길드': 'Guild', '소셜': 'Social',
  '건설': 'Building', '연맹': 'Alliance', '장비': 'Equipment', '거래': 'Trade',
  '부활': 'Revive', '슬롯': 'Slots', '추첨': 'Lottery', '보상': 'Reward', '출금': 'Withdraw',
  '발견': 'Discovery', '상품': 'Product', '주문': 'Order', 'A/S': 'After-sales',
  '콘텐츠': 'Content', '인터랙션': 'Interaction', '관계': 'Relationship', '라이브': 'Live',
  '온보딩': 'Onboarding', '코스': 'Course', '신청': 'Enrollment', '퀴즈': 'Quiz',
  '창작': 'Creation', '소재': 'Material', '내보내기': 'Export', '재생': 'Playback',
};

export function getTagPriority(tag: string): number {
  const canonical = CANONICAL_TAG[tag] ?? tag;
  return TAG_PRIORITY[canonical] ?? DEFAULT_TAG_PRIORITY;
}
