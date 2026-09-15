import { startExerciseItem } from '@/db/api';

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

let audioCtx: AudioContext | null = null;
const alerted = new Set<string>();

function audioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
}

export async function unlockExerciseAudio() {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

function beep(ctx: AudioContext, at: number, freq: number, dur: number, peak = 0.2) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export async function playExerciseChime() {
  await unlockExerciseAudio();
  if (!audioCtx) return;
  const ctx = audioCtx;
  const t = ctx.currentTime + 0.02;
  [0, 0.9].forEach((offset) => {
    beep(ctx, t + offset, 784, 0.28, 0.18);
    beep(ctx, t + offset + 0.22, 988, 0.32, 0.22);
    beep(ctx, t + offset + 0.46, 1175, 0.5, 0.2);
  });
}

export function exerciseAlertKey(id: string, startedAt: string) {
  return `${id}:${startedAt}`;
}

export async function announceExerciseDone(title: string, key: string) {
  if (alerted.has(key)) return;
  alerted.add(key);
  try {
    navigator.vibrate?.([280, 120, 280, 120, 450]);
  } catch {
    /* ignore */
  }
  await playExerciseChime();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Mimom', { body: `${title} : c’est terminé`, tag: key });
    } catch {
      /* ignore */
    }
  }
}

export async function startExerciseWithAlarm(id: string) {
  void unlockExerciseAudio();
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission().catch(() => {
      /* ignore */
    });
  }
  await startExerciseItem(id);
}
