// Solmar Bay entrypoint (Node 22, standard library only): hands the game in
// by copying this directory's game/ and screenshots/ to /output and writing
// /output/dossier.json with the vendored make.fun library. The game itself is
// plain static files under game/ — Three.js from game/vendor/three.min.js and
// my own ES modules under game/src/ — so it plays offline in a desktop
// browser with no build step. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps from the kit's reference/gate.json: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, and game/ holds
// at most 993 files and 48 MiB in all.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
