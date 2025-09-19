#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const runtimeDir = path.join(rootDir, "web", ".runtime");

const apiKey = (process.env.ASSEMBLYAI_API_KEY || "").trim();
const stage = (process.env.SCRIBECAT_ENV || process.env.NODE_ENV || "development").toLowerCase();
const allowSecretInjection = stage !== "production";

const contents = allowSecretInjection && apiKey
  ? `window.SC_ENV = Object.assign({}, window.SC_ENV || {}, { AAI: ${JSON.stringify(apiKey)} });\n`
  : "window.SC_ENV = window.SC_ENV || {};\n";

async function main() {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(path.join(runtimeDir, "env.js"), contents, "utf8");
  if (apiKey && !allowSecretInjection) {
    console.warn("Skipping AssemblyAI key injection outside dev environment (SCRIBECAT_ENV/ NODE_ENV indicates production).");
  } else if (apiKey) {
    console.log("AssemblyAI key injected into web/.runtime/env.js");
  } else {
    console.log("Generated web/.runtime/env.js without AssemblyAI key (not provided).");
  }
}

main().catch((error) => {
  console.error("Failed to inject runtime environment", error);
  process.exitCode = 1;
});
