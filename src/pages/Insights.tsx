import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { db, type Log, type Session } from '../db/db'
import { avg, MIN, mode } from '../lib/stats'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const hr = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
export default function Insights() {
  const logs = useLiveQuery<Log[], Log[]>(() => db.logs.toArray(), [], [])
  const sess = useLiveQuery<Session[], Session[]>(() => db.sessions.toArray(), [], [])
  const cell: Record<string, number[]> = {}
  logs.forEach((l) => (cell[`${l.dow}-${l.hour}`] ||= []).push(l.db))
  // Quietest 2-hour weekday window (Mon–Fri averaged), needs >= 2 h of logs overall.
  const wk = (h: number) => logs.filter((l) => l.dow >= 1 && l.dow <= 5 && l.hour === h).map((l) => l.db)
  const wins = Array.from({ length: 23 }, (_, h) => ({ h, v: [...wk(h), ...wk(h + 1)] })).filter((w) => w.v.length >= 20)
  const win = logs.length >= 120 && wins.length ? wins.sort((a, b) => avg(a.v) - avg(b.v))[0].h : null
  const byPlace = Object.entries(sess.reduce<Record<string, Session[]>>((m, s) => ((m[s.place] ||= []).push(s), m), {})).map(([place, a]) => {
    const rated = a.filter((s) => s.rating)
    return { place, n: a.length, db: Math.round(avg(a.map((s) => s.avgDb))), type: mode(a.map((s) => s.noiseType)), rating: rated.length ? avg(rated.map((s) => s.rating!)) : 0 }
  })
  const ok = byPlace.filter((p) => p.n >= MIN), top = ok.sort((a, b) => a.db - b.db)[0]?.place
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-5 pb-28">
      <h1 className="text-3xl font-extrabold">Insights</h1>
      <section className="rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">Focus windows</h2>
        <p className="my-2 text-lg">{win === null ? 'Not enough data yet' : `Your quietest window is weekdays ${hr(win)}–${hr(win + 2)}.`}</p>
        <div className="overflow-x-auto" role="img" aria-label="Average noise by hour and weekday">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'auto repeat(24, 14px)' }}>
            {DAYS.map((d, i) => [<span key={d} className="pr-1 text-xs">{d}</span>, ...Array.from({ length: 24 }, (_, h) => {
              const v = cell[`${i}-${h}`]; const a = v ? avg(v) : null
              return <span key={h} title={a ? `${d} ${hr(h)}: ${Math.round(a)} dB` : 'no data'} className="h-4 rounded-sm" style={{ background: a === null ? 'var(--bg)' : `hsl(${Math.max(0, 150 - (a - 30) * 3)} 55% 45%)` }} />
            })])}
          </div>
          <p className="mt-1 text-xs text-mute">Hours 0–23 left to right. Green is quieter, red is louder.</p>
        </div>
      </section>
      <section className="rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">Places</h2>
        {!byPlace.length ? <p className="text-mute">Not enough data yet</p> : <>
          <div className="h-40"><ResponsiveContainer><BarChart data={byPlace}><XAxis dataKey="place" stroke="var(--mute)" /><YAxis unit=" dB" width={50} stroke="var(--mute)" /><Bar dataKey="db" fill="var(--accent)" radius={6} /></BarChart></ResponsiveContainer></div>
          <table className="mt-2 w-full text-left text-sm"><thead><tr><th>Place</th><th>Avg dB</th><th>Type</th><th>Focus</th><th>Sessions</th></tr></thead><tbody>
            {byPlace.map((p) => <tr key={p.place} className={p.place === top ? 'font-extrabold text-good' : ''}><td className="py-1">{p.place}{p.place === top && ' ★'}</td><td>{p.db}</td><td>{p.type}</td><td>{p.rating ? p.rating.toFixed(1) : '–'}</td><td>{p.n}</td></tr>)}
          </tbody></table>
          <p className="mt-2">{top ? `${top} is your quietest place.` : `Not enough data yet. Each place needs ${MIN} sessions.`}</p></>}
      </section>
    </main>)
}
