import type { Command } from '../../../framework/types.js';
import { listTeams } from './list-teams.js';
import { createTeam } from './create-team.js';
import { updateTeam } from './update-team.js';
import { deleteTeam } from './delete-team.js';
import { aiGenerate } from './ai-generate.js';
import { listTemplates } from './list-templates.js';
import { listProjects } from './list-projects.js';

const commands: Command[] = [
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  aiGenerate,
  listTemplates,
  listProjects,
];

export default commands;
