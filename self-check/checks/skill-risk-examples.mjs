import fs from 'node:fs';
import path from 'node:path';

const destructiveCommand = /(?:delete|del-|remove|clear)/i;

function commandPrefix(command) {
  const commandStart = command.includes('ae-cli ')
    ? command.slice(command.indexOf('ae-cli '))
    : command.slice(command.indexOf('+'));
  return commandStart.split(/\s--/u, 1)[0].trim().replace(/\s+/gu, ' ');
}

function commandRisks(markdownFiles) {
  const risks = new Map();
  for (const file of markdownFiles.filter((candidate) => path.basename(candidate) === 'command_index.md')) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(
        /^\|\s*`([^`]+)`\s*\|\s*[^|]*\|\s*(read|write|high-risk-write)\s*\|/u,
      );
      if (match) risks.set(commandPrefix(match[1]), match[2]);
    }
  }
  return risks;
}

function inspectCommand(command, relative, lineNumber, risks, findings) {
  if (!command.includes('--yes')) return;
  const prefix = commandPrefix(command);
  const risk = risks.get(prefix);
  if (risk === 'high-risk-write') return;
  if (risk) {
    findings.push({
      level: 'P1',
      msg: `${relative}:${lineNumber} uses --yes for a ${risk} command example`,
    });
    return;
  }
  if (destructiveCommand.test(prefix)) return;
  findings.push({
    level: 'P1',
    msg: `${relative}:${lineNumber} uses --yes without high-risk-write metadata`,
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
  const files = markdownFiles(skillsRoot);
  const risks = commandRisks(files);

  for (const file of files) {
    const relative = path.relative(root, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let inBash = false;
    let command = '';
    let commandLine = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        if (inBash && command) inspectCommand(command, relative, commandLine, risks, findings);
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
          inspectCommand(command, relative, commandLine, risks, findings);
          command = '';
        }
        return;
      }

      for (const match of line.matchAll(/`([^`]*(?:ae-cli |\+[a-z])[^`]*)`/giu)) {
        inspectCommand(match[1], relative, index + 1, risks, findings);
      }
    });
  }

  return { ok: findings.length === 0, findings };
}
