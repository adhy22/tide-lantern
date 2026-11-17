// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Score that lights the dawn and wins the game. */
export const WIN_SCORE = 6000;

export const PLAYER = {
  radius: 20,
  accel: 2600,
  maxSpeed: 360,
  drag: 3.2,
  fireCooldown: 0.22,
  fireCost: 4,
  dashCooldown: 1.4,
  dashTime: 0.22,
  dashSpeed: 900,
  invulnerable: 1.6,
};

export const LIGHT = {
  max: 100,
  start: 70,
  drain: 1.6,
  emberGain: 14,
  lowWarn: 25,
};

export const HEARTS = 3;

export const EMBER = {
  radius: 9,
  points: 10,
  drift: 26,
  spawnInterval: 0.85,
  maxAlive: 14,
};

export const WISP = {
  radius: 18,
  speed: 78,
  speedPerWave: 9,
  hp: 1,
  points: 25,
  spawnInterval: 1.15,
  intervalScale: 0.92,
  minInterval: 0.34,
};

export const BRUTE = {
  radius: 30,
  speed: 52,
  speedPerWave: 6,
  hp: 3,
  points: 60,
  firstWave: 3,
  chance: 0.18,
};

export const BOLT = { radius: 5, speed: 760, life: 1.1 };

/** Seconds of play per wave; difficulty stops growing at the last wave. */
export const WAVE = { seconds: 20, max: 12 };

export const COMBO = { window: 2.5, max: 5 };

export const PICKUP = { interval: 17, magnetTime: 8 };

export const POOL = { embers: 24, wisps: 40, bolts: 48, particles: 220, popups: 16, pickups: 6 };

export const PALETTE = {
  deep: '#060a18',
  seaTop: '#0a1230',
  seaBottom: '#05070f',
  auroraA: '#2de1a7',
  auroraB: '#4fc3f7',
  auroraC: '#b388ff',
  player: '#ffd166',
  playerCore: '#fff3c4',
  bolt: '#ffe9a3',
  ember: '#ffb703',
  emberCore: '#fff1b8',
  wisp: '#a06bff',
  wispCore: '#e6d5ff',
  brute: '#ff5d8f',
  heart: '#ff5d73',
  shield: '#4fc3f7',
  magnet: '#2de1a7',
  panel: 'rgba(8, 14, 32, 0.72)',
  text: '#eef3ff',
  muted: '#93a0c4',
  warn: '#ff8a5c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'tide-lantern.best';
