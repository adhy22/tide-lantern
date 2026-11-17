// Synthesised sound, no audio files: a tiny WebAudio helper. It stays silent
// until the first user gesture creates the context, and M toggles it.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, duration, type, gain, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function chord(notes, duration, type, gain) {
    notes.forEach((freq, index) => {
      setTimeout(() => tone(freq, duration, type, gain), index * 70);
    });
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    collect(combo) { tone(520 + combo * 60, 0.12, 'sine', 0.16, 780 + combo * 60); },
    shoot() { tone(880, 0.08, 'square', 0.05, 440); },
    dryFire() { tone(160, 0.06, 'square', 0.05); },
    hit() { tone(220, 0.3, 'sawtooth', 0.2, 55); },
    kill() { tone(330, 0.14, 'triangle', 0.14, 990); },
    dash() { tone(300, 0.16, 'sine', 0.1, 900); },
    pickup() { chord([523, 659, 784], 0.16, 'sine', 0.12); },
    wave() { chord([392, 523], 0.2, 'triangle', 0.1); },
    win() { chord([523, 659, 784, 1047], 0.35, 'sine', 0.14); },
    lose() { chord([392, 330, 262, 196], 0.4, 'triangle', 0.12); },
  };
}
