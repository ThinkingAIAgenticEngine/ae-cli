import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function commandPath(command) {
  return [command.service, command.resource, command.command]
    .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
    .flatMap((segment) => segment.trim().split(/\s+/))
    .join(" ");
}

function isCommand(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.service === "string" &&
    typeof value.command === "string" &&
    Array.isArray(value.flags) &&
    typeof value.execute === "function"
  );
}

export async function discoverCommandExports(dir) {
  const entries = [];
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      entries.push(...await discoverCommandExports(file));
      continue;
    }
    if (!/\.(?:mjs|mts|ts)$/.test(dirent.name) || /^index\./.test(dirent.name)) continue;

    const module = await import(pathToFileURL(file).href);
    for (const [exportName, value] of Object.entries(module)) {
      if (isCommand(value)) entries.push({ command: value, exportName, file });
    }
  }
  return entries;
}

export function duplicateCommandPaths(commands) {
  const seen = new Set();
  const duplicates = new Set();
  for (const command of commands) {
    const path = commandPath(command);
    if (seen.has(path)) duplicates.add(path);
    seen.add(path);
  }
  return [...duplicates].sort();
}

export function commandRegistryDifferences(declaredCommands, registeredCommands) {
  const declaredPaths = new Set(declaredCommands.map(commandPath));
  const registeredPaths = new Set(registeredCommands.map(commandPath));
  return {
    missingRegistrations: [...declaredPaths].filter((path) => !registeredPaths.has(path)).sort(),
    missingDeclarations: [...registeredPaths].filter((path) => !declaredPaths.has(path)).sort(),
  };
}

export function assertCommandRegistryMatches(declaredCommands, registeredCommands) {
  const differences = commandRegistryDifferences(declaredCommands, registeredCommands);
  const problems = [
    ...differences.missingRegistrations.map((path) => `Command export missing from registry: ${path}`),
    ...differences.missingDeclarations.map((path) => `Registered command missing exported declaration: ${path}`),
  ];
  if (problems.length > 0) throw new Error(problems.join("\n"));
}

export function findCommanderCommand(program, command) {
  let current = program.commands.find((candidate) => candidate.name() === command.service);
  for (const segment of command.resource?.split(/\s+/).filter(Boolean) ?? []) {
    current = current?.commands.find((candidate) => candidate.name() === segment);
  }
  return current?.commands.find((candidate) => candidate.name() === command.command);
}
