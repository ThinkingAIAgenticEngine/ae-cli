import { syncSkillCollaboration } from '../../scripts/sync-skill-collaboration.mjs';

export function run({ root }) {
  return syncSkillCollaboration({ root, check: true });
}
