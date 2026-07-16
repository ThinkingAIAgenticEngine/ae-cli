import fs from 'node:fs';
import path from 'node:path';

const destructiveCommand = /(?:delete|del-|remove|clear)/i;

function inspectCommand(command, relative, lineNumber, findings) {
  if (!command.includes('--yes')) return;
  const commandStart = command.includes('ae-cli ')
    ? command.slice(command.indexOf('ae-cli '))
    : command.slice(command.indexOf('+'));
  const commandPrefix = commandStart.split(/\s--/u, 1)[0];
  if (destructiveCommand.test(commandPrefix)) return;
  findings.push({
    level: 'P1',
    msg: `${relative}:${lineNumber} uses --yes for a non-destructive command example`,
  });
}

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

export async function run({ root }) {
  const skillsRoot = path.join(root, 'skills');
  const findings = [];

  for (const file of markdownFiles(skillsRoot)) {
    const relative = path.relative(root, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let inBash = false;
    let command = '';
    let commandLine = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        if (inBash && command) inspectCommand(command, relative, commandLine, findings);
        inBash = trimmed === '```bash' || trimmed === '```sh' || trimmed === '```shell';
        command = '';
        return;
      }

      if (inBash) {
        if (!command && line.includes('ae-cli ')) {
          command = line;
          commandLine = index + 1;
        } else if (command) {
          command += ` ${line}`;
        }
        if (command && !trimmed.endsWith('\\')) {
          inspectCommand(command, relative, commandLine, findings);
          command = '';
        }
        return;
      }

      for (const match of line.matchAll(/`([^`]*(?:ae-cli |\+[a-z])[^`]*)`/giu)) {
        inspectCommand(match[1], relative, index + 1, findings);
      }
    });
  }

  return { ok: findings.length === 0, findings };
}
