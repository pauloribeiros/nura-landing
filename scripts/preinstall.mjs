/**
 * Keeps the repo on pnpm, and works in every shell.
 *
 * This used to be an inline `sh -c '...'` in package.json. That runs fine from
 * Git Bash and fails outright from PowerShell or cmd, where `sh` is not on the
 * PATH — so `pnpm run <anything>` broke the moment pnpm decided to verify
 * dependencies first, which it does before running a script. A guard that
 * only works in one of the shells the project is used from is worse than no
 * guard: it blocks the developer instead of the mistake.
 *
 * Node is guaranteed present here, since npm/pnpm just started it.
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

for (const stray of ['package-lock.json', 'yarn.lock']) {
  rmSync(join(root, stray), { force: true });
}

const agent = process.env.npm_config_user_agent ?? '';
if (!agent.startsWith('pnpm/')) {
  console.error(
    `This repository uses pnpm workspaces. Run "pnpm install" instead (detected: ${agent || 'unknown'}).`,
  );
  process.exit(1);
}
