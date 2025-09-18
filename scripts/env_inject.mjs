#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const runtimeDir = path.join(rootDir, "web", ".runtime");

const apiKey = (process.env.ASSEMBLYAI_API_KEY || "").trim();

const envObject = {};
if (apiKey) {
  envObject.AAI = apiKey;
}

const contents = `window.SC_ENV = Object.assign({}, window.SC_ENV || {}, ${JSON.stringify(envObject)});\n`;

async function main() {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(path.join(runtimeDir, "env.js"), contents, "utf8");
  if (apiKey) {
    console.log("AssemblyAI key injected into web/.runtime/env.js");
  } else {
    console.log("Generated web/.runtime/env.js without AssemblyAI key (not provided).");
  }
}

main().catch((error) => {
  console.error("Failed to inject runtime environment", error);
  process.exitCode = 1;
});
