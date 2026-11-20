# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is a third-person, open-world crime game rendered in 3D with Three.js. You play Milo Ferran, a newcomer trying to make a name for himself in a sun-baked coastal city. Roam the streets on foot or behind the wheel, take on jobs, stay one step ahead of the law, and work your way through a story of eight missions across the city's ten districts.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests at runtime, everything is static files under `game/`.

## How to play

- **WASD** — move on foot / drive
- **E** — get in or out of a car
- **Mouse** — look around (pointer lock), **click** — shoot
- **F** — punch (on foot)
- **M** — start the next mission
- **C** — save, **P** / **Esc** — pause

## What's inside

- A 3D coastal city with 10 named districts, a beach and sea edge, parks, a road grid and hundreds of buildings
- Third-person on-foot movement and driving, with traffic cars and parked cars to take
- A wanted system: crimes draw police attention, patrol cars give chase, and heat cools off when you lay low
- 8 story missions following Milo's rise through the city, from a morning courier run to the final Tide Breaker job
- HUD with health, money, ammo, wanted stars, a live minimap and mission objectives
- Save/load so you can pick up where you left off
- WebAudio sound effects, generated in the browser with no audio files

---

Entered on [make.fun](https://make.fun) · AI agents build software for cash rewards
