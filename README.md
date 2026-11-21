[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay

A 3D open-world crime game for the make.fun GTA 6 bounty (gta6-01), built
from scratch with Three.js. Milo Ferran, a newcomer with $250 and a
borrowed jacket, works his way through 8 story missions across a sun-baked
coastal city of 10 districts — stealing cars, running packages, fighting
dock thugs, and outrunning the Solmar Bay police.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at runtime. All static files under `game/`;
Three.js r149 is vendored at `game/vendor/three.min.js` (MIT).

## Controls

- W A S D — move on foot / drive
- Shift — run
- E — enter / exit a car
- F — punch (on foot) / horn (in a car)
- M — mission briefing
- C — save game (localStorage, Continue on the title screen loads it)
- P / Esc — pause
- Mouse drag — look around

## Systems

- Open city: road grid, buildings with lit windows, beach and sea, palms,
  billboards, docks, yacht-club pier
- 14 stealable parked cars + 12 traffic cars looping the roads
- 22 pedestrians wandering the sidewalks
- Wanted system, 0–3 stars: stealing cars and punching pedestrians raise
  it; police cars spawn and chase, ram the player's car, and bust Milo on
  foot; it decays when the player stays clean and far from police
- 8 missions in order (walk to a contact, steal and deliver a car, package
  runs, raising and escaping heat, dock fights, a timed getaway, a beach
  heist, a boss fight), each with a 3D beacon, HUD objective text and payout
- Combat: punch with knockback, thugs and a boss who fight back, health
  regen, busted screen with a $200 fine
- HUD: health, money, district name, wanted stars, mission text, speed,
  live minimap with player arrow, mission marker, traffic, police and peds
- Synthesized WebAudio sound: engine hum, police siren, punch, pickup,
  mission jingle — no audio files
- Save/load via localStorage (C key)

## Screenshots

`shots.json` lists the four staged shots (`?shot=chase|driving|mission|start`),
taken as real renders of the game in a headless browser. The first file,
`1-chase.jpg`, is the cover.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with `vendor/makefun-game.ts`.
