// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, game over and victory.
//
// ?seed=N fixes the sea's pattern. ?shot=start|play|win|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  createWorld, EVENT_COLLECT, EVENT_DASH, EVENT_DRY, EVENT_HIT,
  EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. 3 hull hearts. Gather embers, shoot the wisps, reach 6000 to win.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) { audio.win(); announce(`You win! Dawn breaks. Score ${world.state.score}. Best ${best}.`); }
    else { audio.lose(); announce(`Game over. Score ${world.state.score}. Best ${best}.`); }
  }

  function handleEvents(events) {
    if (events & EVENT_COLLECT) audio.collect(world.state.combo);
    if (events & EVENT_KILL) audio.kill();
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_HIT) { audio.hit(); announce(world.state.player.hearts === 1 ? 'Hit. 1 hull heart left.' : `Hit. ${world.state.player.hearts} hull hearts left.`); }
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_DRY) audio.dryFire();
    if (events & EVENT_WAVE) { audio.wave(); announce(`Wave ${world.state.wave}.`); }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    const move = input.movement();
    const dash = dashQueued;
    dashQueued = false;
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0, fire: false, dash: false, aimX: undefined, aimY: undefined, pointerActive: false, pointerX: 0, pointerY: 0 }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const aim = move.pointer.active ? { aimX: move.pointer.x, aimY: move.pointer.y } : { aimX: undefined, aimY: undefined };
    const events = world.step(STEP, {
      x: move.x, y: move.y,
      fire: move.firing,
      dash,
      ...aim,
      pointerActive: move.pointer.active, pointerX: move.pointer.x, pointerY: move.pointer.y,
    }, false);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Tide Lantern. Press Space or click to set sail.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
