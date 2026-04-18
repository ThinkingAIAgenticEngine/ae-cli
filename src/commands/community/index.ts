import type { Command } from '../../framework/types.js';
import { registerMcpMappings } from '../../core/mcp.js';
import { getChannelInfo } from './get_channel_info.js';
import { searchPosts } from './search_posts.js';
import { getPostDetail } from './get_post_detail.js';
import { getOverviewMetrics } from './get_overview_metrics.js';
import { getSentimentOverview } from './get_sentiment_overview.js';
import { getTagTrends } from './get_tag_trends.js';
import { getDailySummary } from './get_daily_summary.js';
import { getHotTopics } from './get_hot_topics.js';
import { getTopicDetail } from './get_topic_detail.js';
import { getLivestreamOverview } from './get_livestream_overview.js';
import { getLivestreamRooms } from './get_livestream_rooms.js';
import { getLivestreamRoomMetrics } from './get_livestream_room_metrics.js';
import { getLivestreamList } from './get_livestream_list.js';
import { getLivestreamDetail } from './get_livestream_detail.js';
import { getLivestreamAnalysis } from './get_livestream_analysis.js';
import { getCommentsSummary } from './get_comments_summary.js';
import { getCommentTagAnalysis } from './get_comment_tag_analysis.js';
import { getCorpusTags } from './get_corpus_tags.js';
import { getRiskContent } from './get_risk_content.js';

// Register MCP mappings for community services
registerMcpMappings({
  'community_content': { componentName: 'community', mappingPath: 'content' },
  'community_analysis': { componentName: 'community', mappingPath: 'analysis' },
  'community_hot': { componentName: 'community', mappingPath: 'hot' },
});

const commands: Command[] = [
  // Content commands
  getLivestreamList,
  getLivestreamDetail,
  getLivestreamAnalysis,
  getPostDetail,
  getCommentsSummary,
  getCommentTagAnalysis,
  getCorpusTags,
  getRiskContent,
  searchPosts,
  getLivestreamOverview,
  getLivestreamRooms,
  getLivestreamRoomMetrics,
  // Analysis commands
  getChannelInfo,
  getOverviewMetrics,
  getSentimentOverview,
  getTagTrends,
  // Hot commands
  getDailySummary,
  getHotTopics,
  getTopicDetail,
];

export default commands;
