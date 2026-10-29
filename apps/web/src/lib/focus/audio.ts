/**
 * Som de fim de sessão gerado com Web Audio (sem arquivo de áudio).
 * O contexto é “preparado” no clique de Iniciar (gesto do usuário) para o navegador permitir o toque depois.
 */
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    context ??= new AudioContext();
    return context;
  } catch {
    return null; // sem Web Audio
  }
}

export function primeAudio(): void {
  void getContext()?.resume();
}

/** Duas notas curtas e suaves (880 Hz → 1320 Hz). */
export function playChime(): void {
  const ctx = getContext();
  if (!ctx) return;
  void ctx.resume();
  const notes: [frequency: number, offset: number][] = [
    [880, 0],
    [1320, 0.18],
  ];
  for (const [frequency, offset] of notes) {
    const start = ctx.currentTime + offset;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.5);
  }
}
