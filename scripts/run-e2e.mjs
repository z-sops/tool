#!/usr/bin/env node
/**
 * Playwright launcher with deterministic port isolation.
 *
 * Why this exists: Playwright loads the configuration file in the main process
 * *and* in every worker process. A port that is chosen by probing at config
 * load time therefore resolves differently per process (the dev server started
 * by the main process makes the probe pick the next port), and workers end up
 * talking to a server that does not exist.
 *
 * The port is therefore resolved exactly once, here, and handed to every child
 * process through LISTINGAI_TEST_PORT. Nothing outside this repository is
 * touched, and no other running application is stopped or reconfigured.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { findFreePort } from './free-port.mjs';

console.log('DEBUG: Starting run-e2e.mjs');

const here = path.dirname(fileURLToPath(import.meta.url));
console.log('DEBUG: here =', here);
const repoRoot = path.resolve(here, '..');
console.log('DEBUG: repoRoot =', repoRoot);

const preferred = Number(process.env.LISTINGAI_TEST_PORT || 5181);
const host = process.env.LISTINGAI_TEST_HOST || '127.0.0.1';
console.log('DEBUG: preferred =', preferred, 'host =', host);
const port = await findFreePort(preferred, 40, host);
console.log('DEBUG: port =', port);

const playwrightCli = path.join(repoRoot, 'node_modules', 'playwright', 'cli.js');
console.log('DEBUG: playwrightCli =', playwrightCli);
const args = process.argv.slice(2);
console.log('DEBUG: args =', args);

const child = spawn(process.execPath, [playwrightCli, 'test', ...args], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    LISTINGAI_TEST_PORT: String(port),
    LISTINGAI_TEST_HOST: host,
    PORT: String(port),
    LISTINGAI_DEV_PORT: String(port),
  },
});

child.on('exit', (code, signal) => {
  console.log('DEBUG: child exit', code, signal);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});