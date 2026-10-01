// Calibration + settings live in localStorage (per device). Numbers only.
export interface Calibration { a: number; b: number; done: boolean }
export interface Settings {
  goodMax: number; distractMax: number; onboarded: boolean
  autoGoodPercent: number; autoDistractingPercent: number; autoLoudPercent: number
}

// dB = a + b * 20*log10(rms). Uncalibrated default: dBFS + 95 (rough phone-mic guess).
export const DEFAULT_CAL: Calibration = { a: 95, b: 1, done: false }
export const DEFAULT_SETTINGS: Settings = {
  goodMax: 45, distractMax: 60, onboarded: false,
  autoGoodPercent: 25, autoDistractingPercent: 60, autoLoudPercent: 75,
}

const load = <T,>(k: string, d: T): T => {
  try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') } } catch { return d }
}
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full/blocked */ } }

export const loadCal = () => load('cs.cal', DEFAULT_CAL)
export const saveCal = (c: Calibration) => save('cs.cal', c)
export const loadSettings = () => load('cs.settings', DEFAULT_SETTINGS)
export const saveSettings = (s: Settings) => save('cs.settings', s)

const dbfs = (rms: number) => 20 * Math.log10(Math.max(rms, 1e-8)) // RMS (0..1 full scale) -> dBFS

export const rmsToDb = (rms: number, c: Calibration) => c.a + c.b * dbfs(rms)

/** Two-point fit: quiet room (~30 dB) and a reference sound (~65 dB, e.g. normal speech ~1 m away). */
export function fitCalibration(quietRms: number, refRms: number, quietDb = 30, refDb = 65): Calibration {
  const q = dbfs(quietRms), r = dbfs(refRms)
  const b = r - q > 3 ? (refDb - quietDb) / (r - q) : 1 // guard: reference must be clearly louder
  return { a: quietDb - b * q, b, done: true }
}

export type Status = 'good' | 'distracting' | 'loud'
export const statusOf = (db: number, s: Settings): Status =>
  db <= s.goodMax ? 'good' : db <= s.distractMax ? 'distracting' : 'loud'
