// A small deterministic generator (mulberry32) so a seed always replays the
// same sea: screenshots and replays agree, and ?seed=N fixes a run.

export function createRandom(seed) {
  let value = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random point on the field's edge, for things that swim in from the dark. */
export function edgePoint(random, width, height, margin) {
  const side = Math.floor(random() * 4);
  if (side === 0) return { x: random() * width, y: -margin };
  if (side === 1) return { x: random() * width, y: height + margin };
  if (side === 2) return { x: -margin, y: random() * height };
  return { x: width + margin, y: random() * height };
}
