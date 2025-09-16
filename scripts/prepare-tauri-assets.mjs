import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist-tauri");

async function ensureDir(dir) {
  if (!dir) return;
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function resetDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
}

async function copyFileRelative(src, dest = src) {
  const srcPath = path.join(projectRoot, src);
  const destPath = path.join(distDir, dest);
  if (!(await pathExists(srcPath))) {
    throw new Error(`Missing required asset: ${src}`);
  }
  await ensureDir(path.dirname(destPath));
  await fs.copyFile(srcPath, destPath);
}

async function copyDirRelative(src, dest = src) {
  const srcPath = path.join(projectRoot, src);
  const destPath = path.join(distDir, dest);
  if (!(await pathExists(srcPath))) {
    throw new Error(`Missing required directory: ${src}`);
  }
  await ensureDir(path.dirname(destPath));
  await fs.cp(srcPath, destPath, { recursive: true });
}

async function copyNuggetImages() {
  const entries = await fs.readdir(projectRoot);
  const nuggets = entries.filter((name) => /^nugget.*\.png$/i.test(name));
  if (!nuggets.length) {
    throw new Error("No nugget*.png assets found");
  }
  for (const file of nuggets) {
    await copyFileRelative(file);
  }
}

async function copyRuntimeDependencies() {
  const pkgJsonPath = path.join(projectRoot, "package.json");
  const pkgRaw = await fs.readFile(pkgJsonPath, "utf8");
  const pkg = JSON.parse(pkgRaw);
  const dependencies = Object.keys(pkg.dependencies || {});
  if (!dependencies.length) return;

  const nodeModulesRoot = path.join(projectRoot, "node_modules");
  const destRoot = path.join(distDir, "node_modules");
  await ensureDir(destRoot);

  for (const dep of dependencies) {
    const src = path.join(nodeModulesRoot, dep);
    if (!(await pathExists(src))) {
      console.warn(`Skipping missing dependency: ${dep}`);
      continue;
    }
    const dest = path.join(destRoot, dep);
    await fs.cp(src, dest, { recursive: true });
  }
}

async function main() {
  console.log("Preparing dist-tauri assets...");
  await resetDist();

  await copyFileRelative("index.html");
  await copyFileRelative("favicon.ico");
  await copyNuggetImages();

  await copyDirRelative("icons");
  await copyDirRelative("fonts");
  await copyDirRelative("server");
  await copyFileRelative("server.mjs");

  await copyRuntimeDependencies();
  console.log("dist-tauri ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
