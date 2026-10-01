import { Session } from '../db/db'
export const MIN = 3 // sessions needed before we call anything "best"
export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
export const todOf = (h: number) => (h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening')
export const mode = (a: string[]) => { const c: Record<string, number> = {}; a.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '–' }
export function rate(rows: Session[], key: (s: Session) => string) {
  const m: Record<string, number[]> = {}
  rows.filter((s) => s.rating).forEach((s) => (m[key(s)] ||= []).push(s.rating!))
  return Object.entries(m).map(([k, v]) => ({ k, n: v.length, avg: avg(v) })).sort((a, b) => b.avg - a.avg)
}
export const best = (r: ReturnType<typeof rate>) => r.find((x) => x.n >= MIN)
