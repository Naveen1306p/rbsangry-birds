// Procedural Web Audio SFX engine (no external audio assets required)
window.SoundFX = (() => {
  let ctx = null;
  let muted = false;
  let lastStretchTick = 0;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freqStart, freqEnd, duration, type = "sine", gainVal = 0.18, delay = 0) {
    const ac = ensureCtx();
    if (!ac) return;
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, filterFreq = 800, gainVal = 0.2, delay = 0) {
    const ac = ensureCtx();
    if (!ac) return;
    const sampleCount = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.45));
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    const gain = ac.createGain();
    const now = ac.currentTime + delay;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
  }

  return {
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    stretch(ratio) {
      const now = performance.now();
      if (now - lastStretchTick < 90) return;
      lastStretchTick = now;
      tone(120 + ratio * 90, 150 + ratio * 110, 0.06, "triangle", 0.05);
    },
    launch() {
      tone(220, 620, 0.18, "sawtooth", 0.11);
      tone(340, 880, 0.16, "triangle", 0.12, 0.03);
    },
    ability(type) {
      if (type === "yellow") {
        tone(420, 1300, 0.18, "sawtooth", 0.15);
      } else if (type === "blue") {
        tone(520, 980, 0.09, "sine", 0.14);
        tone(680, 1240, 0.1, "sine", 0.12, 0.05);
      } else if (type === "black") {
        noise(0.55, 520, 0.42);
        tone(140, 32, 0.45, "sawtooth", 0.25);
      } else {
        tone(360, 720, 0.14, "triangle", 0.14);
      }
    },
    hit(material, strength = 1) {
      const vol = Math.min(0.24, 0.06 + strength * 0.04);
      if (material === "ice") {
        tone(900 + Math.random() * 400, 1800, 0.08, "sine", vol);
      } else if (material === "stone") {
        noise(0.11, 450, vol);
        tone(110, 65, 0.09, "square", vol * 0.5);
      } else {
        noise(0.1, 900, vol);
        tone(220, 120, 0.08, "triangle", vol * 0.6);
      }
    },
    destroy(material) {
      if (material === "ice") {
        tone(1400, 2400, 0.12, "sine", 0.15);
        tone(1800, 900, 0.14, "triangle", 0.12, 0.03);
      } else if (material === "tnt") {
        noise(0.6, 560, 0.45);
        tone(150, 28, 0.5, "sawtooth", 0.28);
      } else {
        noise(0.2, 1100, 0.22);
        tone(180, 70, 0.15, "square", 0.1);
      }
    },
    pigPop() {
      tone(420, 190, 0.12, "sine", 0.18);
      tone(680, 980, 0.12, "triangle", 0.14, 0.05);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        tone(f, f * 1.02, 0.22, "triangle", 0.16, idx * 0.11);
      });
    },
    lose() {
      [349.23, 311.13, 277.18, 220].forEach((f, idx) => {
        tone(f, f * 0.96, 0.24, "sawtooth", 0.1, idx * 0.14);
      });
    }
  };
})();
