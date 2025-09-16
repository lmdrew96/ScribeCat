import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const CLI_PACKAGE = '@tauri-apps/cli';
const CLI_META = (() => {
  try {
    return require(`${CLI_PACKAGE}/package.json`);
  } catch (error) {
    console.warn('Could not read @tauri-apps/cli package metadata; continuing without version pin.', error);
    return null;
  }
})();
const CLI_VERSION = CLI_META?.version ?? '';
const CLI_BIN = (() => {
  try {
    const pkgPath = require.resolve(`${CLI_PACKAGE}/package.json`);
    return path.join(path.dirname(pkgPath), 'tauri.js');
  } catch (error) {
    console.error('Tauri CLI package is not installed. Install @tauri-apps/cli as a dev dependency.');
    console.error(error);
    process.exit(1);
  }
})();

function detectMusl() {
  if (process.platform !== 'linux') {
    return false;
  }
  try {
    const ldd = readFileSync('/usr/bin/ldd', 'utf8');
    if (ldd.includes('musl')) return true;
    if (ldd.includes('glibc')) return false;
  } catch {
    // ignore missing ldd
  }
  try {
    if (typeof process.report?.getReport === 'function') {
      const report = process.report.getReport();
      if (report?.header?.glibcVersionRuntime) {
        return false;
      }
      if (Array.isArray(report?.sharedObjects)) {
        if (report.sharedObjects.some((entry) => entry.includes('libc.musl-') || entry.includes('ld-musl-'))) {
          return true;
        }
      }
    }
  } catch {
    // ignore report errors
  }
  try {
    const info = spawnSync('ldd', ['--version'], { encoding: 'utf8' });
    if (typeof info.stdout === 'string' && info.stdout.includes('musl')) return true;
    if (typeof info.stdout === 'string' && info.stdout.includes('glibc')) return false;
  } catch {
    // ignore spawn errors
  }
  return false;
}

function nativePackageCandidates() {
  switch (process.platform) {
    case 'win32':
      if (process.arch === 'x64') return ['cli-win32-x64-msvc'];
      if (process.arch === 'ia32') return ['cli-win32-ia32-msvc'];
      if (process.arch === 'arm64') return ['cli-win32-arm64-msvc'];
      return [];
    case 'darwin':
      if (process.arch === 'x64') return ['cli-darwin-universal', 'cli-darwin-x64'];
      if (process.arch === 'arm64') return ['cli-darwin-universal', 'cli-darwin-arm64'];
      return [];
    case 'linux': {
      const musl = detectMusl();
      const libc = musl ? 'musl' : 'gnu';
      if (process.arch === 'x64') return [`cli-linux-x64-${libc}`];
      if (process.arch === 'arm64') return [`cli-linux-arm64-${libc}`];
      if (process.arch === 'arm') return [`cli-linux-arm-${musl ? 'musleabihf' : 'gnueabihf'}`];
      if (process.arch === 'riscv64') return [`cli-linux-riscv64-${libc}`];
      if (process.arch === 'ppc64') return ['cli-linux-ppc64-gnu'];
      if (process.arch === 's390x') return ['cli-linux-s390x-gnu'];
      return [];
    }
    case 'android':
      if (process.arch === 'arm64') return ['cli-android-arm64'];
      if (process.arch === 'arm') return ['cli-android-arm-eabi'];
      return [];
    case 'freebsd':
      if (process.arch === 'x64') return ['cli-freebsd-x64'];
      if (process.arch === 'arm64') return ['cli-freebsd-arm64'];
      return [];
    case 'openharmony':
      if (process.arch === 'arm64') return ['cli-linux-arm64-ohos'];
      if (process.arch === 'x64') return ['cli-linux-x64-ohos'];
      if (process.arch === 'arm') return ['cli-linux-arm-ohos'];
      return [];
    default:
      return [];
  }
}

function installNativeBinding() {
  const candidates = nativePackageCandidates();
  if (!candidates.length) {
    console.error(`No prebuilt Tauri CLI binary available for ${process.platform}/${process.arch}.`);
    return false;
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const versionSuffix = CLI_VERSION ? `@${CLI_VERSION}` : '';

  for (const candidate of candidates) {
    const spec = `@tauri-apps/${candidate}${versionSuffix}`;
    console.warn(`Installing missing optional dependency ${spec}...`);
    const result = spawnSync(npmCmd, ['install', '--no-save', '--package-lock=false', spec], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status === 0) {
      return true;
    }
  }
  return false;
}

function containsMissingNative(text) {
  return text.includes('Cannot find native binding') || text.includes('Failed to load native binding');
}

function buildEnv() {
  const env = { ...process.env };
  if (env.NAPI_RS_FORCE_WASI === '1') {
    console.warn('NAPI_RS_FORCE_WASI=1 detected. Clearing it to allow native Tauri CLI binaries.');
    delete env.NAPI_RS_FORCE_WASI;
  }
  return env;
}

function runCliOnce(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
    });

    let stderr = '';
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => {
      const str = chunk.toString();
      stderr += str;
      process.stderr.write(chunk);
    });

    child.on('close', (code, signal) => {
      resolve({ code, signal, missingNative: containsMissingNative(stderr) });
    });
  });
}

function exitFromResult(result) {
  if (typeof result.code === 'number') {
    process.exit(result.code);
  }
  if (result.signal) {
    console.error(`Tauri CLI exited due to signal ${result.signal}`);
    process.exit(1);
  }
  process.exit(0);
}

(async () => {
  const env = buildEnv();
  let result = await runCliOnce(env);
  if (!result.missingNative) {
    exitFromResult(result);
  }

  console.warn('Tauri CLI native binding missing (optional dependency). Attempting automatic installation...');
  const installed = installNativeBinding();
  if (!installed) {
    console.error('Could not install the required Tauri CLI native binary automatically.');
    console.error('Re-run `npm install` (without --omit=optional) or install the package listed above manually.');
    process.exit(1);
  }

  result = await runCliOnce(env);
  if (result.missingNative) {
    console.error('Tauri CLI still failed to load after installing the native binary.');
    process.exit(1);
  }
  exitFromResult(result);
})();
