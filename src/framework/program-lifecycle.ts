import type { Command } from 'commander';

export async function parseProgram(program: Command, argv: string[] = process.argv): Promise<void> {
  await program.parseAsync(argv);
}
