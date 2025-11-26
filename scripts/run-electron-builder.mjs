import { build } from 'electron-builder';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(projectRoot, 'electron-build', timestamp);

fs.mkdirSync(outDir, { recursive: true });

console.log(`[electron] Building to ${outDir}`);

await build({
  config: {
    directories: {
      output: outDir,
    },
  },
});

const marker = path.join(projectRoot, 'electron-build', 'LATEST_OUTPUT.txt');
fs.writeFileSync(marker, outDir, 'utf8');
console.log(`[electron] Build complete. Latest output recorded at ${marker}`);
