// Takes the entry's screenshots: serves app/, screenshots each scene from
// shots.json headlessly, and scales it into screenshots/ as a JPEG.
//   node shots.mjs
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const chrome = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;
const port = 8091;
const tmpDir = '/tmp/vice-cover-shots';
mkdirSync(tmpDir, { recursive: true });
mkdirSync(join(here, 'screenshots'), { recursive: true });

const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: here, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1500));

const waitForServer = async () => {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('serve.ts did not come up');
};
await waitForServer();

try {
  for (const shot of shots) {
    const png = join(tmpDir, `${shot.name}.png`);
    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--window-size=${shot.w},${shot.h}`,
        '--virtual-time-budget=15000',
        `--screenshot=${png}`,
        `http://127.0.0.1:${port}/${shot.query}`,
      ],
      { stdio: 'inherit', timeout: 60000 },
    );
    execFileSync(
      'python3',
      [join(here, 'shots-convert.py'), png, join(here, 'screenshots', shot.name), String(shot.w), String(shot.h)],
      { stdio: 'inherit' },
    );
    console.log(`shot ${shot.name} done`);
  }
} finally {
  server.kill();
}
console.log('all shots done');
