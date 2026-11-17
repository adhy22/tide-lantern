// All drawing: the night sea, aurora, lantern boat, embers, wisps, HUD and
// every screen. The playfield is a fixed 1280x720 area scaled to the window.

import { FIELD, LIGHT, PALETTE, PLAYER, WIN_SCORE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

function lcg(seed) {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const rand = lcg(20261115);
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({ x: rand() * FIELD.width, y: rand() * FIELD.height * 0.7, r: 0.5 + rand() * 1.6, tw: rand() * 6.28, layer: 0.2 + rand() * 0.8 });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function frameTransform(time) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.deep;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.setTransform(scale, 0, 0, scale, ox / dpr, oy / dpr);
    return { scale, ox, oy };
  }

  function sea(time) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.seaTop);
    grad.addColorStop(1, PALETTE.seaBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Aurora ribbons drifting across the sky.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ribbons = [
      { color: PALETTE.auroraA, amp: 46, speed: 0.11, y: 120, alpha: 0.16 },
      { color: PALETTE.auroraB, amp: 60, speed: 0.07, y: 190, alpha: 0.12 },
      { color: PALETTE.auroraC, amp: 38, speed: 0.15, y: 80, alpha: 0.10 },
    ];
    for (const r of ribbons) {
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = r.y + Math.sin(x * 0.006 + time * r.speed * 6 + r.y) * r.amp * 0.5 + Math.sin(x * 0.002 - time * 0.4) * r.amp * 0.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = FIELD.width; x >= 0; x -= 16) {
        const y = r.y + 70 + Math.sin(x * 0.006 + time * r.speed * 6 + r.y) * r.amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Stars, twinkling.
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(time * 0.7 * s.layer + s.tw));
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The moon, and the faint swell lines of the sea.
    const moon = ctx.createRadialGradient(1120, 96, 8, 1120, 96, 90);
    moon.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
    moon.addColorStop(0.25, 'rgba(255, 244, 200, 0.28)');
    moon.addColorStop(1, 'rgba(255, 244, 200, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(1010, 0, 220, 200);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const y = 300 + i * 78;
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 32) {
        const yy = y + Math.sin(x * 0.008 + time * 0.9 + i * 1.7) * 7;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function glowCircle(x, y, radius, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawEmber(e, time) {
    const pulse = 1 + Math.sin(e.phase) * 0.18;
    glowCircle(e.x, e.y, 26 * pulse, 'rgba(255, 183, 3, 0.55)', 0.8);
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(e.x - 2, e.y - 2, e.size * 0.45 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWisp(w, time) {
    const squash = 1 + Math.sin(w.wobble * 2) * 0.08;
    const color = w.kind === 1 ? PALETTE.brute : PALETTE.wisp;
    const core = w.kind === 1 ? '#ffd3e2' : PALETTE.wispCore;
    glowCircle(w.x, w.y, w.radius * 2.4, color, 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, w.radius * squash, w.radius / squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail.
    ctx.beginPath();
    ctx.moveTo(w.x - w.radius * 0.7, w.y + w.radius * 0.4);
    ctx.quadraticCurveTo(w.x - w.radius * 0.2, w.y + w.radius * 1.5 + Math.sin(time * 5 + w.wobble) * 6, w.x + w.radius * 0.6, w.y + w.radius * 0.5);
    ctx.quadraticCurveTo(w.x, w.y + w.radius * 0.9, w.x - w.radius * 0.7, w.y + w.radius * 0.4);
    ctx.fill();
    // Eyes.
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(w.x - w.radius * 0.32, w.y - w.radius * 0.12, w.radius * 0.2, 0, Math.PI * 2);
    ctx.arc(w.x + w.radius * 0.32, w.y - w.radius * 0.12, w.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath();
    ctx.arc(w.x - w.radius * 0.32, w.y - w.radius * 0.12, w.radius * 0.09, 0, Math.PI * 2);
    ctx.arc(w.x + w.radius * 0.32, w.y - w.radius * 0.12, w.radius * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (w.kind === 1) {
      ctx.strokeStyle = core;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius + 6, time * 1.5, time * 1.5 + Math.PI * 1.4);
      ctx.stroke();
    }
  }

  function drawPickup(p, time) {
    const bob = Math.sin(p.phase) * 4;
    const y = p.y + bob;
    glowCircle(p.x, y, 34, p.kind === 'heart' ? 'rgba(255,93,115,0.5)' : p.kind === 'magnet' ? 'rgba(45,225,167,0.5)' : 'rgba(79,195,247,0.5)', 0.8);
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.arc(p.x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.kind === 'heart' ? PALETTE.heart : p.kind === 'magnet' ? PALETTE.magnet : PALETTE.shield;
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 20px ' + "'system-ui', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'heart' ? '♥' : p.kind === 'magnet' ? '◉' : '⛨', p.x, y + 1);
  }

  function drawPlayer(player, time) {
    const flicker = 1 + Math.sin(time * 9) * 0.12 + Math.sin(time * 23) * 0.06;
    const lightR = 90 + (player.light / LIGHT.max) * 150;
    // The lantern's light pool on the water.
    const g = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, lightR);
    const low = player.light < LIGHT.lowWarn;
    g.addColorStop(0, low ? 'rgba(255, 150, 80, 0.20)' : 'rgba(255, 209, 102, 0.22)');
    g.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(player.x, player.y, lightR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.rotate(player.angle + Math.PI / 2);
    // Hull: a little lantern boat.
    ctx.fillStyle = '#7a5230';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-16, -6);
    ctx.lineTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(16, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a9713f';
    ctx.fillRect(-10, -14, 20, 5);
    // Lantern post and flame.
    ctx.strokeStyle = '#3d2b1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -30);
    ctx.stroke();
    glowCircle(0, -34, 16 * flicker, 'rgba(255, 209, 102, 0.9)', 0.9);
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.ellipse(0, -34, 5 * flicker, 8 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (player.shield) {
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 12 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.dashTime > 0) {
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function heart(x, y, size, filled) {
    ctx.fillStyle = filled ? PALETTE.heart : 'rgba(255, 93, 115, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.9);
    ctx.bezierCurveTo(x - size * 1.2, y, x - size * 0.6, y - size, x, y - size * 0.3);
    ctx.bezierCurveTo(x + size * 0.6, y - size, x + size * 1.2, y, x, y + size * 0.9);
    ctx.fill();
  }

  function drawHud(state, best) {
    const p = state.player;
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(16, 14, 380, 64, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px ' + "'system-ui', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`SCORE ${state.score}`, 32, 42);
    ctx.font = '15px ' + "'system-ui', sans-serif";
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(best, state.score)}  ·  WAVE ${state.wave}`, 32, 66);
    if (state.combo > 1) {
      ctx.fillStyle = PALETTE.player;
      ctx.font = 'bold 20px ' + "'system-ui', sans-serif";
      ctx.fillText(`COMBO x${state.combo}`, 250, 42);
    }

    // Hearts, top right.
    for (let i = 0; i < 3; i += 1) heart(1150 + i * 34, 30, 11, i < p.hearts);

    // Light bar, bottom centre.
    const bw = 420;
    const bx = (FIELD.width - bw) / 2;
    const by = FIELD.height - 34;
    ctx.fillStyle = 'rgba(8, 14, 32, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx - 8, by - 8, bw + 16, 26, 10);
    ctx.fill();
    const low = p.light < LIGHT.lowWarn;
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, low ? '#ff8a5c' : '#ffb703');
    grad.addColorStop(1, low ? '#ff5d73' : '#ffe9a3');
    ctx.fillStyle = grad;
    const w = Math.max(0, (p.light / LIGHT.max) * bw);
    if (w > 0) {
      ctx.beginPath();
      ctx.roundRect(bx, by, w, 10, 5);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px ' + "'system-ui', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(low ? '⚠ LIGHT LOW — GATHER EMBERS' : 'LANTERN LIGHT', FIELD.width / 2, by + 24);
    ctx.textAlign = 'left';

    // Dash cooldown pip.
    const ready = p.dashCooldown <= 0;
    ctx.fillStyle = ready ? PALETTE.auroraA : 'rgba(147, 160, 196, 0.5)';
    ctx.font = 'bold 14px ' + "'system-ui', sans-serif";
    ctx.fillText(ready ? 'DASH READY  [Shift]' : 'DASH …', 16, FIELD.height - 18);
    if (p.magnetTimer > 0) {
      ctx.fillStyle = PALETTE.magnet;
      ctx.fillText(`MAGNET ${Math.ceil(p.magnetTimer)}s`, 180, FIELD.height - 18);
    }
    if (p.shield) {
      ctx.fillStyle = PALETTE.shield;
      ctx.fillText('SHIELD UP', 300, FIELD.height - 18);
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(5, 9, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function titleText(text, y, size, color, bold) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold' : ''} ${size}px 'system-ui', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, FIELD.width / 2, y);
    ctx.textAlign = 'left';
  }

  function drawTitle(state, best) {
    panel(FIELD.width / 2 - 360, 128, 720, 380);
    titleText('TIDE LANTERN', 218, 64, PALETTE.player, true);
    titleText('Keep the light alive on a dark sea.', 258, 22, PALETTE.text, false);
    const lines = [
      'Gather glowing embers to feed your lantern — light is fuel,',
      'and every ember scores. Spend light to fire flares at the',
      'void wisps that hunt your boat. Reach 6,000 points and the',
      'dawn breaks: you win. Lose all 3 hull hearts and the dark wins.',
      '',
      'Move  WASD / Arrows / Mouse      Fire  Click / Space (aims at wisps)',
      'Dash  Shift (briefly untouchable)      Pause  P      Mute  M',
    ];
    ctx.font = '18px ' + "'system-ui', sans-serif";
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'center';
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 300 + i * 26));
    ctx.textAlign = 'left';
    titleText(best > 0 ? `BEST SCORE  ${best}` : 'No voyages yet — light your first lantern.', 486, 18, PALETTE.player, true);
    const blink = Math.floor(performance.now() / 625) % 2 === 0;
    if (blink) titleText('— Press Space or click to set sail —', 530, 20, PALETTE.text, true);
  }

  function drawOver(state, best, won) {
    const isBest = state.score >= best && state.score > 0;
    panel(FIELD.width / 2 - 330, 170, 660, 320);
    titleText(won ? 'DAWN BREAKS' : 'THE LIGHT FADES', 252, 56, won ? PALETTE.auroraA : PALETTE.warn, true);
    titleText(
      won ? 'You lit the sea. The wisps scatter, and morning comes.' : 'The wisps snuffed out your lantern… this time.',
      292, 20, PALETTE.text, false,
    );
    titleText(`SCORE  ${state.score}`, 352, 34, PALETTE.player, true);
    titleText(`BEST  ${Math.max(best, state.score)}${isBest ? '  — NEW BEST!' : ''}`, 390, 20, PALETTE.muted, false);
    titleText(`Wisps sunk: ${state.kills}   ·   Embers gathered: ${state.collected}   ·   Wave ${state.wave}`, 424, 18, PALETTE.muted, false);
    const blink = Math.floor(performance.now() / 625) % 2 === 0;
    if (blink) titleText('— Press Space or click to sail again —', 466, 20, PALETTE.text, true);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 7, 16, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 220, 250, 440, 170);
    titleText('PAUSED', 322, 48, PALETTE.text, true);
    titleText('Press P or Space to keep sailing.', 366, 19, PALETTE.muted, false);
    titleText('M mutes the sound.', 394, 19, PALETTE.muted, false);
  }

  function draw(state, screen, best) {
    const time = state.time;
    frameTransform(time);
    ctx.save();
    if (state.shake > 0) {
      const s = state.shake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    sea(time);
    for (const e of state.embers) if (e.active) drawEmber(e, time);
    for (const p of state.pickups) if (p.active) drawPickup(p, time);
    for (const w of state.wisps) if (w.active) drawWisp(w, time);
    for (const b of state.bolts) {
      if (!b.active) continue;
      ctx.strokeStyle = PALETTE.bolt;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      glowCircle(b.x, b.y, 12, 'rgba(255, 233, 163, 0.8)', 0.9);
    }
    drawPlayer(state.player, time);
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of state.popups) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.font = 'bold 18px ' + "'system-ui', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();

    // Darkness closes in as the lantern dies.
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      const darkness = 1 - state.player.light / LIGHT.max;
      if (darkness > 0.25) {
        ctx.fillStyle = `rgba(2, 4, 12, ${(darkness - 0.25) * 0.5})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
    }

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_OVER) drawOver(state, best, false);
    if (screen === SCREEN_WIN) drawOver(state, best, true);
    if (screen === SCREEN_PAUSED) drawPaused();
  }

  return { draw };
}
