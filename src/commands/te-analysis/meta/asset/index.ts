import type { Command } from '../../../../framework/types.js';
import { metadataAssetSearch } from './search.js';
import { metadataAssetRecentList } from './recent-list.js';
import { metadataAssetAuthenticationList } from './authentication-list.js';
import { metadataAssetAuthenticationUpdate } from './authentication-update.js';
import { metadataAssetAbnormalList } from './abnormal-list.js';
import { metadataAssetAbnormalGet } from './abnormal-get.js';
import { analysisMetaAssetUrlGet } from './url-get.js';

const commands: Command[] = [
  metadataAssetSearch,
  metadataAssetRecentList,
  metadataAssetAuthenticationList,
  metadataAssetAuthenticationUpdate,
  metadataAssetAbnormalList,
  metadataAssetAbnormalGet,
  analysisMetaAssetUrlGet,
];

export default commands;
export { metadataAssetSearch };
export { metadataAssetRecentList };
export { metadataAssetAuthenticationList };
export { metadataAssetAuthenticationUpdate };
export { metadataAssetAbnormalList };
export { metadataAssetAbnormalGet };
export { analysisMetaAssetUrlGet };
