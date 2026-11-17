// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (gather the nearest ember, keep clear of wisps, fire
// at the nearest wisp when there is light to spend), so the frame is what a
// real game looks like and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const END_SECONDS = 600;
const WIN_SECONDS = 600;

function nearest(state, pool, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const item of pool) {
    if (!item.active) continue;
    const dx = item.x - x;
    const dy = item.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = item; }
  }
  return best;
}

/** Steer toward the nearest ember, fleeing a wisp that gets too close. */
function pilotInput(state, brave) {
  const p = state.player;
  let tx = p.x;
  let ty = p.y;
  const threat = nearest(state, state.wisps, p.x, p.y);
  const threatD = threat ? Math.hypot(threat.x - p.x, threat.y - p.y) : Infinity;
  if (threat && threatD < (brave ? 130 : 190)) {
    // Run away from the wisp, toward the middle of the sea.
    tx = p.x + (p.x - threat.x) + (FIELD.width / 2 - p.x) * 0.4;
    ty = p.y + (p.y - threat.y) + (FIELD.height / 2 - p.y) * 0.4;
  } else {
    const ember = nearest(state, state.embers, p.x, p.y);
    if (ember) { tx = ember.x; ty = ember.y; }
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const dash = threatD < 70 && p.dashCooldown <= 0;
  const target = brave ? nearest(state, state.wisps, p.x, p.y) : null;
  return {
    x: d > 12 ? dx / d : 0,
    y: d > 12 ? dy / d : 0,
    fire: !!target && p.light > 20,
    dash,
    aimX: target ? target.x : undefined,
    aimY: target ? target.y : undefined,
    pointerActive: false, pointerX: 0, pointerY: 0,
  };
}

function idleInput() {
  return { x: 0, y: 0, fire: false, dash: false, aimX: undefined, aimY: undefined, pointerActive: false, pointerX: 0, pointerY: 0 };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, idleInput(), true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      world.step(STEP, pilotInput(world.state, true), false);
      if (world.state.status !== 'play') break;
    }
    return { screen: world.state.status === 'won' ? SCREEN_WIN : world.state.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    // The brave pilot gathers and shoots until the dawn breaks.
    for (let i = 0; i < WIN_SECONDS / STEP; i += 1) {
      world.step(STEP, pilotInput(world.state, true), false);
      if (world.state.status !== 'play') break;
    }
    return { screen: world.state.status === 'won' ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
  }
  // end: a timid pilot that never fires and never dashes is caught out.
  for (let i = 0; i < END_SECONDS / STEP; i += 1) {
    const input = pilotInput(world.state, false);
    input.fire = false;
    input.dash = false;
    world.step(STEP, input, false);
    if (world.state.status !== 'play') break;
  }
  return { screen: world.state.status === 'won' ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
}
