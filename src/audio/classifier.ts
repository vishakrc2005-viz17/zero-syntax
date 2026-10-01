// On-device noise type detection. Audio goes to a local Web Worker only; nothing is uploaded.
// Verify the ID, label list, size and license on the Hugging Face Hub before shipping.
export const MODEL_ID = 'Xenova/ast-finetuned-audioset-10-10-0.4593'
export type NoiseType = 'speech' | 'traffic' | 'music' | 'hum' | 'unknown'

const GROUPS: Record<Exclude<NoiseType, 'unknown'>, string[]> = {
  speech: ['speech', 'conversation', 'narration'],
  traffic: ['vehicle', 'car', 'engine', 'traffic'],
  music: ['music', 'musical instrument'],
  hum: ['hum', 'mechanical fan', 'air conditioning', 'white noise'],
}
/** Label grouping: sum AudioSet scores per category (whole-word match), return the winner. */
export function topGroup(out: { label: string; score: number }[]): NoiseType {
  const sum: Record<string, number> = {}
  for (const { label, score } of out) for (const [g, keys] of Object.entries(GROUPS))
    if (keys.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(label))) sum[g] = (sum[g] || 0) + score
  const top = Object.entries(sum).sort((a, b) => b[1] - a[1])[0]
  return top && top[1] > 0.15 ? (top[0] as NoiseType) : 'unknown'
}
/** Needs N consecutive windows agreeing before the shown type switches (stops flicker). */
export class Hysteresis {
  cur: NoiseType = 'unknown'; private cand: NoiseType = 'unknown'; private n = 0
  push(t: NoiseType) {
    if (t === this.cur) { this.n = 0; return this.cur }
    this.n = t === this.cand ? this.n + 1 : 1; this.cand = t
    if (this.n >= 2) { this.cur = t; this.n = 0 }
    return this.cur
  }
}
export class NoiseClassifier {
  private w = new Worker(new URL('../workers/classify.ts', import.meta.url), { type: 'module' })
  classify(audio: Float32Array): Promise<{ label: string; score: number }[]> {
    return new Promise((res, rej) => {
      this.w.onmessage = (e) => (e.data.error ? rej(new Error(e.data.error)) : res(e.data.out))
      this.w.onerror = rej
      this.w.postMessage({ audio, model: MODEL_ID }, [audio.buffer])
    })
  }
  stop() { this.w.terminate() }
}
