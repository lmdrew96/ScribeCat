import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");
const distDir = path.resolve(__dirname, "..", "dist");

const assets = [
  "index.html",
  "favicon.ico",
  "fonts",
  "nugget.png",
  "nugget-16.png",
  "nugget-32.png",
  "nugget-180.png",
  "server.mjs",
  "server"
];

async function removeDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
}

async function copyEntry(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);
    for (const entry of entries) {
      await copyEntry(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  await fs.copyFile(src, dest);
}

async function main() {
  await removeDist();
  for (const asset of assets) {
    const srcPath = path.join(projectRoot, asset);
    const destPath = path.join(distDir, asset);
    try {
      await copyEntry(srcPath, destPath);
    } catch (err) {
      if (err && err.code === "ENOENT") {
        throw new Error(`Missing asset for Tauri bundle: ${asset}`);
      }
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("prepare-dist failed", err);
  process.exit(1);
});
