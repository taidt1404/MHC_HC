let audioCtx = null;

export function playDingDong() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Note 1: G5 (783.99 Hz) - "Ding"
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.56);

    // Note 2: E5 (659.25 Hz) - "Dong"
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.38);
    gain2.gain.setValueAtTime(0.001, now + 0.38);
    gain2.gain.exponentialRampToValueAtTime(0.38, now + 0.42);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.38);
    osc2.stop(now + 1.26);
  } catch {
    // Ignore audio autoplay block if user has not interacted yet
  }
}
