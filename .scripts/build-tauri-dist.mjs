import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const outputDir = path.join(projectRoot, 'desktop-dist');

const entries = [
  { src: 'index.html' },
  { src: 'fonts', isDir: true },
  { src: 'icons', isDir: true, optional: true },
  { src: 'favicon.ico', optional: true },
  { src: 'nugget.png', optional: true },
  { src: 'nugget-16.png', optional: true },
  { src: 'nugget-32.png', optional: true },
  { src: 'nugget-180.png', optional: true }
];

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const entry of entries) {
  const sourcePath = path.join(projectRoot, entry.src);
  if (!fs.existsSync(sourcePath)) {
    if (!entry.optional) {
      throw new Error(`Missing required asset for Tauri build: ${entry.src}`);
    }
    continue;
  }
  const targetPath = path.join(outputDir, entry.src);
  copyRecursive(sourcePath, targetPath);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}

console.log(`Prepared Tauri frontend at ${outputDir}`);
