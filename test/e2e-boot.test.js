const { spawn } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

const projectRoot = path.resolve(__dirname, '..');

function waitForMarkers(child, markers, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const pending = new Set(markers);
    const onData = (buf) => {
      const text = buf.toString();
      for (const line of text.split('\n')) {
        if (!line) continue;
        for (const m of [...pending]) {
          if (line.includes(m)) pending.delete(m);
        }
      }
      if (pending.size === 0) done(null);
    };
    const onErr = (buf) => {
      // Keep stderr visible in CI logs
      process.stderr.write(buf);
    };
    const timer = setTimeout(() => done(new Error(`Timed out waiting for markers: ${[...pending].join(', ')}`)), timeoutMs);
    const done = (err) => {
      clearTimeout(timer);
      child.stdout.off('data', onData);
      child.stderr.off('data', onErr);
      err ? reject(err) : resolve();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onErr);
  });
}

async function run() {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    DEV_FULL: '1',
    E2E: '1'
  };

  const child = spawn(electron, ['.'], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForMarkers(child, ['E2E:MAIN_READY', 'E2E:WINDOW_LOADED', 'E2E:PRELOAD_EXPOSED']);
    // Optionally, give renderer a tick to settle
    await new Promise((r) => setTimeout(r, 250));
    console.log('✅ Electron booted and loaded renderer');
    child.kill('SIGINT');
    process.exit(0);
  } catch (err) {
    console.error('❌ Boot test failed:', err.message);
    child.kill('SIGINT');
    process.exit(1);
  }
}

run();