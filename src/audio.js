// Web Audio API synthesizer for Seasons Wheel — zero external assets, zero API calls
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playClick() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.04);
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.06);
}

export function playRumble() {
  const c = getCtx();
  const noise = c.createBufferSource();
  const buffer = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(80, c.currentTime);
  filter.frequency.linearRampToValueAtTime(150, c.currentTime + 0.2);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.41);
}

export function playSnap() {
  const c = getCtx();
  const noise = c.createBufferSource();
  const buffer = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.1);
}

export function playSeasonChime(season) {
  const c = getCtx();
  const chords = {
    spring: [659.25, 783.99, 987.77], // E major
    summer: [523.25, 659.25, 783.99], // C major
    autumn: [493.88, 587.33, 739.99], // G minor-ish
    winter: [587.33, 698.46, 880.00], // D minor-ish
  };
  const notes = chords[season] || chords.summer;
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.05 + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8 + i * 0.06);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + i * 0.06);
    osc.stop(c.currentTime + 1.0 + i * 0.06);
  });
}
