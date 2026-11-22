# heist-game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/antololcrazy1/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/antololcrazy1/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**The Gilded Hour** — a top-down stealth heist game. Rook slips into the
Marlow Gallery after dark to lift the Aurora Star, crack the vault for the
Gilded Crown, and reach the east exit before the gallery's five guards,
three sweeping cameras and the sliding laser gate catch up with the plan.

Three wings, one floor: the west corridor, the central hall and the vault
wing in the east. The east door is locked until Rook picks it; the vault
mouth is crossed by two laser beams that slide as you time your step; the
camera terminal in the west corridor kills all three cameras for twenty
seconds, once. Smoke, EMP and tossed coins buy room to breathe, and every
guard reads the room before it moves — patrol, suspicion, chase, search.

The take decides the rank: the Star is $5,000, the Crown $8,000, six
artefacts $600–$1,200 each, plus a time bonus, a ghost bonus for never
letting the alarm pass 50, and a clean-vault bonus for taking the Crown
without ever tripping a laser. GHOST LEGEND starts at $16,000.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8091/ — keyboard and mouse on desktop, virtual
joystick and action buttons on touch.

Controls: WASD / arrows to move, SHIFT to sneak, E to take loot (hold E to
hack the terminal or pick the east door), Q for EMP, F for smoke, SPACE to
toss a coin, R to run it again, M to mute.

## Self-test

Open `game/index.html?drills=1` — the game runs its own ten checks (title,
starting, movement, taking the Star, guard vision raising the alarm,
taking the Crown, the laser trip, the camera hack, winning at the exit,
and the win screen's score) and prints the result on screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=antolol&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
