import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
export function missingTypecheckDependencies(resolve = require.resolve) {
  return ['@astrojs/check', 'typescript'].filter(name => { try { resolve(name); return false; } catch { return true; } });
}

// Astro can exit zero after reporting that the checker is unavailable.
// Keep this explicit command fail-closed rather than recording a false pass.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const missing = missingTypecheckDependencies();
  if (missing.length) {
    console.error(`Type checking did not run. Missing development dependencies: ${missing.join(', ')}.`);
    console.error('Install and pin the required checker dependencies before claiming a full Astro type-check pass.');
    process.exitCode = 1;
  } else {
    const cli = path.join(path.dirname(require.resolve('astro/package.json')), 'astro.js');
    const result = spawnSync(process.execPath, [cli, 'check'], {stdio:'inherit', env:process.env});
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status ?? 1;
  }
}
