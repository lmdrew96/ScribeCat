import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tauriRoot = path.join(repoRoot, 'src-tauri');
const targetRoot = path.join(tauriRoot, 'target');
const uiDist = path.join(targetRoot, 'ui-dist');
const runtimeDist = path.join(targetRoot, 'runtime');

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function copyNuggets() {
  const entries = await fs.readdir(repoRoot);
  const tasks = entries
    .filter((name) => name.startsWith('nugget') && name.endsWith('.png'))
    .map((name) => copyRecursive(path.join(repoRoot, name), path.join(uiDist, name)));
  await Promise.all(tasks);
}

async function main() {
  await emptyDir(uiDist);
  await emptyDir(runtimeDist);

  await copyRecursive(path.join(repoRoot, 'index.html'), path.join(uiDist, 'index.html'));
  await copyRecursive(path.join(repoRoot, 'fonts'), path.join(uiDist, 'fonts'));
  await copyNuggets();

  await copyRecursive(path.join(repoRoot, 'server.mjs'), path.join(runtimeDist, 'server.mjs'));
  await copyRecursive(path.join(repoRoot, 'server'), path.join(runtimeDist, 'server'));
}

main().catch((err) => {
  console.error('[prepare-tauri-assets] Failed:', err);
  process.exit(1);
});
