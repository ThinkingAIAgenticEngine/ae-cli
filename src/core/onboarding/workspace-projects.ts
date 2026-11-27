import fs from 'node:fs';
import path from 'node:path';

type WorkspaceProject = { directory: string; platform: 'unity' | 'web' | 'nodejs'; evidence: string };
const ignored = new Set(['node_modules', 'vendor', 'dist', 'build', 'Library', 'Packages', 'Temp', 'obj', 'Assets']);

export function identifyWorkspaceProjects(root = process.cwd()): WorkspaceProject[] {
  const projects: WorkspaceProject[] = [];
  const pending = [{ directory: root, depth: 0 }];
  let visited = 0;
  while (pending.length && visited++ < 500 && projects.length < 30) {
    const { directory, depth } = pending.shift()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
    catch { continue; }
    const files = new Set(entries.filter(entry => entry.isFile()).map(entry => entry.name));
    const relative = path.relative(root, directory) || '.';
    if (entries.some(entry => entry.name === 'Assets' && entry.isDirectory())
      && entries.some(entry => entry.name === 'ProjectSettings' && entry.isDirectory())) {
      projects.push({ directory: relative, platform: 'unity', evidence: 'Assets/, ProjectSettings/' });
    }
    const packageManifest = files.has('package.json') ? readManifest(path.join(directory, 'package.json')) : undefined;
    const dependencies = { ...packageManifest?.dependencies, ...packageManifest?.devDependencies };
    const hasBrowser = files.has('index.html') || Object.keys(dependencies).some(name =>
      ['vite', 'next', 'react-dom', 'vue', '@angular/core', 'phaser', 'pixi.js'].includes(name));
    const hasServer = Object.keys(dependencies).some(name =>
      ['express', 'fastify', '@nestjs/core', 'koa', '@hapi/hapi', 'socket.io'].includes(name))
      || ['server.js', 'server.mjs', 'server.ts'].some(file => files.has(file));
    if (hasBrowser) projects.push({ directory: relative, platform: 'web', evidence: files.has('index.html') ? 'index.html' : 'package.json' });
    if (hasServer) projects.push({ directory: relative, platform: 'nodejs', evidence: 'server entry or package.json' });
    if (depth < 4) {
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !ignored.has(entry.name)) {
          pending.push({ directory: path.join(directory, entry.name), depth: depth + 1 });
        }
      }
    }
  }
  return projects;
}

function readManifest(filename: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | undefined {
  try {
    if (fs.statSync(filename).size <= 1024 * 1024) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch { /* An unreadable manifest is not evidence of a supported platform. */ }
  return undefined;
}
