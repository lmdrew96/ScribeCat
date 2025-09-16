import { promises as fs } from 'fs';
import { dirname as pathDirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = pathDirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const assets = [
  { source: 'assets/base64/fonts/GalaxyCaterpillar.ttf.b64', target: 'fonts/GalaxyCaterpillar.ttf' },
  { source: 'assets/base64/icons/icon32.png.b64', target: 'icons/icon32.png' },
  { source: 'assets/base64/icons/scribecat-180.png.b64', target: 'icons/scribecat-180.png' },
  { source: 'assets/base64/icons/scribecat-512.png.b64', target: 'icons/scribecat-512.png' },
  { source: 'assets/base64/icons/scribecat-src.png.b64', target: 'icons/scribecat-src.png' },
  { source: 'assets/base64/root/nugget-16.png.b64', target: 'nugget-16.png' },
  { source: 'assets/base64/root/nugget-32.png.b64', target: 'nugget-32.png' },
  { source: 'assets/base64/root/nugget-180.png.b64', target: 'nugget-180.png' },
  { source: 'assets/base64/root/nugget.png.b64', target: 'nugget.png' },
  { source: 'assets/base64/root/favicon.ico.b64', target: 'favicon.ico' },
  { source: 'assets/base64/extension/icon128.png.b64', target: 'extension/scribecat-canvas-helper/icon128.png' },
  { source: 'assets/base64/extension/scribecat-canvas-helper.crx.b64', target: 'extension/scribecat-canvas-helper.crx' }
];

async function decodeAsset(asset) {
  const sourcePath = resolve(rootDir, asset.source);
  const targetPath = resolve(rootDir, asset.target);
  const base64 = await fs.readFile(sourcePath, 'utf8');
  const cleaned = base64.replace(/\s+/g, '');
  const buffer = Buffer.from(cleaned, 'base64');
  await fs.mkdir(pathDirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
}

async function main() {
  await Promise.all(assets.map(async (asset) => {
    await decodeAsset(asset);
  }));
  console.log(`Prepared ${assets.length} assets.`);
}

main().catch((error) => {
  console.error('Failed to prepare assets');
  console.error(error);
  process.exit(1);
});
