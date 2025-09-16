import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, ".tauri-dist");
const assets = [
  { type: "file", src: path.join(projectRoot, "index.html"), dest: path.join(distDir, "index.html") },
  { type: "file", src: path.join(projectRoot, "nugget.png"), dest: path.join(distDir, "nugget.png") },
  { type: "dir", src: path.join(projectRoot, "fonts"), dest: path.join(distDir, "fonts") }
];

async function ensureExists(entry) {
  try {
    await fs.access(entry.src);
  } catch (err) {
    throw new Error(`Missing asset: ${entry.src}`);
  }
}

async function copyAsset(entry) {
  if (entry.type === "file") {
    await fs.copyFile(entry.src, entry.dest);
    return;
  }
  if (entry.type === "dir") {
    await fs.cp(entry.src, entry.dest, { recursive: true });
    return;
  }
  throw new Error(`Unknown asset type for ${entry.src}`);
}

async function prepare() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  for (const asset of assets) {
    await ensureExists(asset);
    if (asset.type === "dir") {
      await fs.mkdir(asset.dest, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(asset.dest), { recursive: true });
    }
    await copyAsset(asset);
  }
}

prepare().catch((error) => {
  console.error(error);
  process.exit(1);
});
