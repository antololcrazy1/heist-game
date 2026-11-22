// main.ts — the hand-in program. It copies the playable game and the
// screenshots into the output directory and writes dossier.json with the
// kit's own dossier library, so the dossier the grader rebuilds is the
// dossier this program wrote. Runs on Node 22 with no install step.

import { buildDossier } from './vendor/makefun-game.ts';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

async function handIn() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'game'), { recursive: true });
  await mkdir(join(outDir, 'screenshots'), { recursive: true });
  await cp(join(here, 'game'), join(outDir, 'game'), { recursive: true });
  await cp(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  await writeFile(join(outDir, 'dossier.json'), dossier);
  console.log(`hand-in wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
}

handIn().catch((err) => {
  console.error(err);
  process.exit(1);
});
