/**
 * Web Audio API synthesizer for stream donation alerts
 * Zero external assets needed, perfectly reliable in OBS browser source!
 */

export function playAlertChime(volume: number = 0.8) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.4, now);
    masterGain.connect(ctx.destination);

    // Modern 3-note melodic chime (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      // Attack and soft exponential decay
      const noteStart = now + i * 0.1;
      const noteDuration = 0.6;
      noteGain.gain.setValueAtTime(0.001, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.3, noteStart + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDuration + 0.05);
    });

    // Clean up context after sound completes
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 1500);
  } catch (err) {
    console.warn('AudioContext chime error:', err);
  }
}
