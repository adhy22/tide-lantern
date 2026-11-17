# Tide Lantern

Keep the light alive on a dark sea. A complete, original arcade game for
make.fun's **best-game-01** bounty — plain static files, no network, no build
step, no library.

## The game

You are the keeper of the last lantern boat. The night sea is full of glowing
embers and the void wisps that hunt your light.

- **Gather embers** to feed your lantern. Light is fuel: it burns down over
  time, every ember refills it and scores — chained pickups build a combo
  up to x5.
- **Spend light to fire flares** at the wisps (each shot costs light). A sunk
  wisp scores, and sometimes drops an ember.
- **Reach 6,000 points and the dawn breaks: you win.** Lose all 3 hull
  hearts and the dark wins.
- **Waves** every 20 seconds: wisps come faster and thicker, and from wave 3
  the big brutes arrive (3 hits to sink).
- **Pickups**: hull hearts, magnets that pull embers in, shields that block
  one hit. **Dash** (Shift) makes you briefly untouchable.
- **Sound** is synthesised live with WebAudio — no audio files. **M** mutes.

## Controls

| Action | Keys / mouse |
| --- | --- |
| Move | WASD / arrow keys, or move the mouse (the boat drifts toward it) |
| Fire flare | Click (aims at the cursor) or Space (auto-aims at the nearest wisp) |
| Dash | Shift, or right-click |
| Pause | P or Esc |
| Mute | M |
| Restart | Space or click on the title / end screens |

Best score is kept in the browser's local storage.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static file server. `?seed=N` fixes
the sea's pattern; `?shot=start|play|win|end&seed=N` stages a screenshot
scene and sets `window.__shotReady` when painted.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## Files

- `game/index.html` — the page
- `game/src/config.js` — all tuning numbers and colours
- `game/src/random.js` — deterministic seeded RNG
- `game/src/world.js` — rules and state (boat, embers, wisps, bolts, waves)
- `game/src/render.js` — all drawing: sea, aurora, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/shots.js` — staged screenshot scenes with an autopilot
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts`, `serve.ts`, `vendor/makefun-game.ts` — the hand-in program
- `screenshots/` — 4 real renders of the game's own code

MIT licensed. All art, sounds, names and code are original.
