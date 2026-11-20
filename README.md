# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Neeinn/makefun-gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game set in the sun-soaked coastal city of Solmar Bay: drive and steal cars, dodge a 0–3 star wanted level with police chases, fight mouse-aimed shootouts, and play through 8 story missions with Dina, Marco and Rosa — from a first taxi fare to the final showdown with Salvo at Pier End. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, everything is static files under `game/`.

## How to play

- **WASD** — move on foot / drive
- **E** — enter or steal a car (parked and traffic cars), E again to get out
- **Mouse** — aim, **click** — shoot
- **M** — switch radio station (3 synthesized WebAudio stations)
- **F** — save (localStorage), **R** — restart the current mission, **P** — pause, **H** — help

## What's inside

- A 3600×2600 city with 10 named districts, a beach and sea edge, Juniper Park, a road grid and hundreds of buildings
- 26 traffic cars, 14 parked cars to steal, 40 wandering pedestrians
- Wanted system (0–3 stars): crimes raise heat, police cars spawn and chase, heat decays when you lay low
- 8 story missions in order: taxi fare, pickup, timed delivery, 5-checkpoint race, warehouse shootout, three fares, 30-second survival at 3 stars, final showdown
- HUD with money, health, ammo, wanted stars, live minimap, mission objective and radio station
- Save/load via localStorage, synthesized music, staged screenshot modes (`?shot=start|drive|chase|mission&seed=1`)

---

Entered on [make.fun](https://make.fun/?ref=bbrx9sbx&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
