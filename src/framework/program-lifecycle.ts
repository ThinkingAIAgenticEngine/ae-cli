import type { Command, Option } from 'commander';

export async function parseProgram(program: Command, argv: string[] = process.argv): Promise<void> {
  await program.parseAsync(normalizeSubcommandVersionOption(program, argv));
}

export function normalizeSubcommandVersionOption(program: Command, argv: string[]): string[] {
  const normalized = [...argv];
  let current = program;

  for (let index = 2; index < normalized.length; index += 1) {
    const token = normalized[index];
    if (token === '--') {
      break;
    }

    if (token.startsWith('-')) {
      if (token === '--version' && current !== program && hasRequiredVersionOption(current)) {
        const value = normalized[index + 1];
        if (value && !value.startsWith('-')) {
          normalized.splice(index, 2, `--version=${value}`);
        } else {
          normalized[index] = '--version=';
        }
        continue;
      }

      if (!token.includes('=')) {
        const option = findOption(current, token);
        if (option?.required) {
          index += 1;
        } else if (option?.optional) {
          const value = normalized[index + 1];
          if (value && !value.startsWith('-')) {
            index += 1;
          }
        }
      }
      continue;
    }

    const child = current.commands.find(
      (command) => command.name() === token || command.aliases().includes(token),
    );
    if (child) {
      current = child;
    }
  }

  return normalized;
}

function hasRequiredVersionOption(command: Command): boolean {
  return command.options.some((option) => option.long === '--version' && option.required);
}

function findOption(command: Command, flag: string): Option | undefined {
  let current: Command | null = command;
  while (current) {
    const option = current.options.find((candidate) => candidate.long === flag || candidate.short === flag);
    if (option) {
      return option;
    }
    current = current.parent;
  }
  return undefined;
}
