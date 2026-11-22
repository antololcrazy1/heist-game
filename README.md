# The Gilded Hour

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/antololcrazy1/heist-game/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/antololcrazy1/heist-game/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

An original top-down heist game for the [make.fun "Make the best heist game" bounty](https://make.fun/c/best-heist-game-20261122-0559). One thief, one gallery, one very long night.

You are Rook, slipping into the Marlow Gallery after dark. The night has three acts: lift the **Aurora Star** from the central hall, crack the vault in the east wing — past a sliding laser gate — to take the **Gilded Crown**, then slip out the east door to the getaway van. Five guards patrol with vision cones you have to read before you move; three wall cameras sweep the wings; a camera terminal in the west corridor can be hacked to black them all out. Every second you spend in a cone pushes the **alarm meter** up. At full alarm the gallery locks down and the exit seals.

## How to play

- **WASD / arrows** — move, **Shift** — sneak (harder to spot)
- **Hold E** — lift the Star · crack the vault · pick the service door · hack the terminal
- **Q** — smoke bomb (×2, blinds every cone it covers)
- **F** — EMP (×2, blacks out the cameras for 8 seconds)
- **Click** — toss a coin (×3, the clink pulls nearby guards over)
- **Touch** — left stick to move, on-screen buttons to act
- **P** — pause, **R** — run it again

Grab the Star, crack the vault if you dare, pocket the bonus artefacts, and reach the exit. If a guard reaches you, you lose a nerve and wake up at the door — what you stole stays stolen. Three nerves, then the night is over.

## Run it

Static files, no build step, no network:

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/` — the game: `index.html` plus `src/` (config, geometry, level, audio, input, watchers, thief, particles, render, game, shots, main)
- `screenshots/` — real renders of the game running in a browser
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

All art is drawn in code and all sound is synthesised with WebAudio — no assets, no copies of any commercial game. The Marlow Gallery, Rook, the Aurora Star and the Gilded Crown are invented for this heist.
