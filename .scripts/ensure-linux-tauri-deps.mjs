import { spawnSync } from 'node:child_process';
import process from 'node:process';

if (process.platform !== 'linux') {
  process.exit(0);
}

const packages = new Set();
const hasPkgConfig = commandExists('pkg-config');

if (!hasPkgConfig) {
  packages.add('pkg-config');
}

const deps = [
  { pkgConfig: 'glib-2.0', apt: 'libglib2.0-dev' },
  { pkgConfig: 'gobject-2.0', apt: 'libglib2.0-dev' },
  { pkgConfig: 'gdk-3.0', apt: 'libgtk-3-dev' },
  { pkgConfig: 'gtk+-3.0', apt: 'libgtk-3-dev' },
  { pkgConfig: 'webkit2gtk-4.1', apt: 'libwebkit2gtk-4.1-dev' },
  { pkgConfig: 'ayatana-appindicator3-0.1', apt: 'libayatana-appindicator3-dev' },
  { pkgConfig: 'librsvg-2.0', apt: 'librsvg2-dev' }
];

for (const { pkgConfig, apt } of deps) {
  if (!hasPkgConfig || !commandSucceeds('pkg-config', ['--exists', pkgConfig])) {
    packages.add(apt);
  }
}

if (packages.size === 0) {
  process.exit(0);
}

if (!commandExists('apt-get')) {
  console.warn(`Missing system packages: ${Array.from(packages).join(', ')}. Install them manually using your package manager.`);
  process.exit(0);
}

console.log(`Installing Linux packages required for Tauri: ${Array.from(packages).join(', ')}`);
runCommand('apt-get', ['update']);
runCommand('apt-get', ['install', '-y', ...packages]);

function commandExists(cmd) {
  const result = spawnSync('which', [cmd], { stdio: 'ignore' });
  return result.status === 0;
}

function commandSucceeds(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'ignore' });
  return result.status === 0;
}

function runCommand(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
