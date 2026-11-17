// The game's rules and state, with no drawing and no browser in it: the
// lantern boat, drifting embers, void wisps, flare bolts, pickups, waves,
// light, combo and score. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Pools are allocated once, at boot.

import {
  BOLT, BRUTE, COMBO, EMBER, FIELD, HEARTS, LIGHT, PICKUP, PLAYER,
  POOL, WAVE, WIN_SCORE, WISP,
} from './config.js';
import { edgePoint } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_COLLECT = 2;
export const EVENT_KILL = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_WAVE = 32;
export const EVENT_PICKUP = 64;
export const EVENT_DRY = 128;
export const EVENT_DASH = 256;
export const EVENT_SHOOT = 512;

const KIND_WISP = 0;
const KIND_BRUTE = 1;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
    hearts: HEARTS, light: LIGHT.start, invulnerable: 0,
    dashTime: 0, dashCooldown: 0, fireCooldown: 0,
    shield: false, magnetTimer: 0,
  };
  const embers = [];
  for (let i = 0; i < POOL.embers; i += 1) embers.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, phase: random() * 6.28, size: EMBER.radius });
  const wisps = [];
  for (let i = 0; i < POOL.wisps; i += 1) wisps.push({ active: false, kind: KIND_WISP, x: 0, y: 0, vx: 0, vy: 0, hp: 1, radius: WISP.radius, speed: 0, wobble: random() * 6.28 });
  const bolts = [];
  for (let i = 0; i < POOL.bolts; i += 1) bolts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  const popups = [];
  for (let i = 0; i < POOL.popups; i += 1) popups.push({ active: false, x: 0, y: 0, text: '', life: 0, color: '#ffffff' });
  const pickups = [];
  for (let i = 0; i < POOL.pickups; i += 1) pickups.push({ active: false, kind: 'heart', x: 0, y: 0, phase: 0 });

  const state = {
    player, embers, wisps, bolts, particles, popups, pickups,
    score: 0, combo: 0, comboTimer: 0, wave: 1, elapsed: 0,
    kills: 0, collected: 0, status: 'title', shake: 0, time: 0,
  };

  let emberTimer = 0.4;
  let wispTimer = 1.2;
  let pickupTimer = PICKUP.interval;

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2;
    player.hearts = HEARTS; player.light = LIGHT.start; player.invulnerable = 0;
    player.dashTime = 0; player.dashCooldown = 0; player.fireCooldown = 0;
    player.shield = false; player.magnetTimer = 0;
    for (const e of embers) e.active = false;
    for (const w of wisps) w.active = false;
    for (const b of bolts) b.active = false;
    for (const p of particles) p.active = false;
    for (const p of popups) p.active = false;
    for (const p of pickups) p.active = false;
    state.score = 0; state.combo = 0; state.comboTimer = 0;
    state.wave = 1; state.elapsed = 0; state.kills = 0; state.collected = 0;
    state.status = 'play'; state.shake = 0; state.time = 0;
    emberTimer = 0.4; wispTimer = 1.2; pickupTimer = PICKUP.interval;
  }

  function free(pool) {
    for (const item of pool) if (!item.active) return item;
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const a = random() * Math.PI * 2;
      const s = speed * (0.3 + random() * 0.7);
      p.active = true; p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.maxLife = 0.4 + random() * 0.5; p.life = p.maxLife;
      p.size = 1.5 + random() * 3; p.color = color;
    }
  }

  function popup(x, y, text, color) {
    const p = free(popups);
    if (!p) return;
    p.active = true; p.x = x; p.y = y; p.text = text; p.life = 1.1; p.color = color;
  }

  function spawnEmber(x, y) {
    const e = free(embers);
    if (!e) return;
    e.active = true;
    e.x = x ?? 40 + random() * (FIELD.width - 80);
    e.y = y ?? 40 + random() * (FIELD.height - 80);
    const a = random() * Math.PI * 2;
    e.vx = Math.cos(a) * EMBER.drift; e.vy = Math.sin(a) * EMBER.drift;
    e.phase = random() * 6.28;
  }

  function spawnWisp() {
    const w = free(wisps);
    if (!w) return;
    const at = edgePoint(random, FIELD.width, FIELD.height, 40);
    const brute = state.wave >= BRUTE.firstWave && random() < BRUTE.chance;
    w.active = true;
    w.kind = brute ? KIND_BRUTE : KIND_WISP;
    w.x = at.x; w.y = at.y;
    w.hp = brute ? BRUTE.hp : WISP.hp;
    w.radius = brute ? BRUTE.radius : WISP.radius;
    w.speed = (brute ? BRUTE.speed + BRUTE.speedPerWave : WISP.speed + WISP.speedPerWave) * (state.wave - 1) + (brute ? BRUTE.speed : WISP.speed);
    w.wobble = random() * 6.28;
  }

  function spawnPickup() {
    const p = free(pickups);
    if (!p) return;
    const kinds = player.hearts < HEARTS ? ['heart', 'magnet', 'shield'] : ['magnet', 'shield', 'magnet'];
    p.active = true;
    p.kind = kinds[Math.floor(random() * kinds.length)];
    p.x = 60 + random() * (FIELD.width - 120);
    p.y = 60 + random() * (FIELD.height - 120);
    p.phase = random() * 6.28;
  }

  function nearestWisp(x, y, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const w of wisps) {
      if (!w.active) continue;
      const d = dist2(x, y, w.x, w.y);
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  }

  function fireBolt(aimX, aimY) {
    if (player.fireCooldown > 0) return 0;
    if (player.light < PLAYER.fireCost) return EVENT_DRY;
    const b = free(bolts);
    if (!b) return 0;
    player.light -= PLAYER.fireCost;
    player.fireCooldown = PLAYER.fireCooldown;
    const dx = aimX - player.x;
    const dy = aimY - player.y;
    const len = Math.hypot(dx, dy) || 1;
    b.active = true;
    b.x = player.x + (dx / len) * (PLAYER.radius + 6);
    b.y = player.y + (dy / len) * (PLAYER.radius + 6);
    b.vx = (dx / len) * BOLT.speed;
    b.vy = (dy / len) * BOLT.speed;
    b.life = BOLT.life;
    player.angle = Math.atan2(dy, dx);
    return EVENT_SHOOT;
  }

  /**
   * One fixed step. input: {x, y} move vector, fire, dash, aimX, aimY.
   * With harmless set (the title screen's backdrop) things drift but nothing
   * touches the player and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.time += dt;
    if (state.status !== 'play' && !harmless) return events;
    if (state.status === 'play') {
      state.elapsed += dt;
      const wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
      if (wave !== state.wave) {
        state.wave = wave;
        events |= EVENT_WAVE;
      }
    }

    // Light burns down; an empty lantern leaves the boat defenceless.
    if (!harmless) player.light = Math.max(0, player.light - LIGHT.drain * dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.magnetTimer > 0) player.magnetTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    // Steering: keyboard vector, or drift toward the pointer when idle.
    let mx = input.x;
    let my = input.y;
    if (mx === 0 && my === 0 && input.pointerActive) {
      const dx = input.pointerX - player.x;
      const dy = input.pointerY - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 48) { mx = (dx / d) * 0.65; my = (dy / d) * 0.65; }
    }
    if (player.dashTime > 0) {
      player.dashTime -= dt;
    } else {
      player.vx += mx * PLAYER.accel * dt;
      player.vy += my * PLAYER.accel * dt;
      const drag = Math.exp(-PLAYER.drag * dt);
      player.vx *= drag; player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER.maxSpeed) { player.vx *= PLAYER.maxSpeed / speed; player.vy *= PLAYER.maxSpeed / speed; }
    }
    if (input.dash && player.dashCooldown <= 0 && player.dashTime <= 0) {
      const dx = mx !== 0 || my !== 0 ? mx : Math.cos(player.angle);
      const dy = mx !== 0 || my !== 0 ? my : Math.sin(player.angle);
      const len = Math.hypot(dx, dy) || 1;
      player.vx = (dx / len) * PLAYER.dashSpeed;
      player.vy = (dy / len) * PLAYER.dashSpeed;
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.1);
      burst(player.x, player.y, '#4fc3f7', 10, 160);
      events |= EVENT_DASH;
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
    if (mx !== 0 || my !== 0) player.angle = Math.atan2(my, mx);

    // Firing: toward the aim point, or the nearest wisp when aiming with keys.
    if (input.fire && !harmless) {
      let ax = input.aimX;
      let ay = input.aimY;
      if (ax === undefined) {
        const target = nearestWisp(player.x, player.y, 560);
        if (target) { ax = target.x; ay = target.y; } else { ax = player.x + Math.cos(player.angle) * 100; ay = player.y + Math.sin(player.angle) * 100; }
      }
      const before = player.fireCooldown;
      events |= fireBolt(ax, ay);
      if (player.fireCooldown !== before && player.fireCooldown > 0) burst(player.x, player.y, '#ffe9a3', 2, 60);
    }

    // Spawning.
    emberTimer -= dt;
    if (emberTimer <= 0) {
      const alive = embers.filter((e) => e.active).length;
      if (alive < EMBER.maxAlive) { spawnEmber(); if (random() < 0.4) spawnEmber(); }
      emberTimer += EMBER.spawnInterval;
    }
    wispTimer -= dt;
    if (wispTimer <= 0) {
      spawnWisp();
      if (state.wave >= 4 && random() < 0.4) spawnWisp();
      const interval = Math.max(WISP.minInterval, WISP.spawnInterval * WISP.intervalScale ** (state.wave - 1));
      wispTimer += interval;
    }
    pickupTimer -= dt;
    if (pickupTimer <= 0) { spawnPickup(); pickupTimer += PICKUP.interval; }

    // Embers drift, glow, and are gathered (magnet pulls them in).
    for (const e of embers) {
      if (!e.active) continue;
      e.phase += dt * 2;
      if (player.magnetTimer > 0 && !harmless) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 260) { e.vx += (dx / d) * 900 * dt; e.vy += (dy / d) * 900 * dt; }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < 12 || e.x > FIELD.width - 12) e.vx *= -1;
      if (e.y < 12 || e.y > FIELD.height - 12) e.vy *= -1;
      e.x = Math.min(FIELD.width - 8, Math.max(8, e.x));
      e.y = Math.min(FIELD.height - 8, Math.max(8, e.y));
      if (harmless) continue;
      if (dist2(e.x, e.y, player.x, player.y) < (EMBER.radius + PLAYER.radius + 6) ** 2) {
        e.active = false;
        state.collected += 1;
        state.combo = Math.min(COMBO.max, state.combo + 1);
        state.comboTimer = COMBO.window;
        const gained = EMBER.points + (state.combo - 1) * 5;
        state.score += gained;
        player.light = Math.min(LIGHT.max, player.light + LIGHT.emberGain);
        burst(e.x, e.y, '#ffb703', 8, 140);
        popup(e.x, e.y - 14, `+${gained}`, '#ffd166');
        events |= EVENT_COLLECT;
      }
    }

    // Wisps hunt the boat.
    for (const w of wisps) {
      if (!w.active) continue;
      w.wobble += dt * 2;
      const dx = player.x - w.x;
      const dy = player.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(w.wobble) * 0.4;
      w.vx = (dx / d) * w.speed + -dy / d * wob * w.speed * 0.5;
      w.vy = (dy / d) * w.speed + dx / d * wob * w.speed * 0.5;
      w.x += w.vx * dt; w.y += w.vy * dt;
      if (harmless) continue;
      if (dist2(w.x, w.y, player.x, player.y) < (w.radius + PLAYER.radius - 4) ** 2) {
        if (player.invulnerable > 0) continue;
        w.active = false;
        burst(w.x, w.y, '#a06bff', 14, 200);
        if (player.shield) {
          player.shield = false;
          popup(player.x, player.y - 30, 'SHIELD!', '#4fc3f7');
        } else {
          player.hearts -= 1;
          player.invulnerable = PLAYER.invulnerable;
          state.shake = 1;
          state.combo = 0;
          events |= EVENT_HIT;
          if (player.hearts <= 0) {
            state.status = 'over';
            events |= EVENT_OVER;
            return events;
          }
        }
      }
    }

    // Flare bolts fly and burst wisps.
    for (const b of bolts) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height) { b.active = false; continue; }
      for (const w of wisps) {
        if (!w.active) continue;
        if (dist2(b.x, b.y, w.x, w.y) < (w.radius + BOLT.radius) ** 2) {
          b.active = false;
          w.hp -= 1;
          burst(b.x, b.y, '#ffe9a3', 6, 120);
          if (w.hp <= 0) {
            w.active = false;
            state.kills += 1;
            const gained = w.kind === KIND_BRUTE ? BRUTE.points : WISP.points;
            state.score += gained;
            burst(w.x, w.y, w.kind === KIND_BRUTE ? '#ff5d8f' : '#a06bff', 18, 240);
            popup(w.x, w.y - 16, `+${gained}`, '#e6d5ff');
            events |= EVENT_KILL;
            if (random() < 0.22) spawnEmber(w.x, w.y);
          }
          break;
        }
      }
    }

    // Pickups.
    for (const p of pickups) {
      if (!p.active) continue;
      p.phase += dt * 2;
      if (harmless) continue;
      if (dist2(p.x, p.y, player.x, player.y) < (PLAYER.radius + 22) ** 2) {
        p.active = false;
        if (p.kind === 'heart') { player.hearts = Math.min(HEARTS, player.hearts + 1); popup(p.x, p.y - 16, '+1 HULL', '#ff5d73'); }
        else if (p.kind === 'magnet') { player.magnetTimer = PICKUP.magnetTime; popup(p.x, p.y - 16, 'MAGNET', '#2de1a7'); }
        else { player.shield = true; popup(p.x, p.y - 16, 'SHIELD', '#4fc3f7'); }
        burst(p.x, p.y, '#ffffff', 10, 160);
        events |= EVENT_PICKUP;
      }
    }

    // Particles and popups fade.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
    }
    for (const p of popups) {
      if (!p.active) continue;
      p.life -= dt;
      p.y -= 34 * dt;
      if (p.life <= 0) p.active = false;
    }

    // Winning: the dawn breaks at WIN_SCORE.
    if (!harmless && state.score >= WIN_SCORE) {
      state.status = 'won';
      events |= EVENT_WIN;
    }
    return events;
  }

  reset();
  state.status = 'title';
  return { state, reset, step, nearestWisp };
}
