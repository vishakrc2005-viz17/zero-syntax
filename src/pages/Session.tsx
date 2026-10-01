import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'

export default function Session({ id, onClose }: { id: number; onClose: () => void }) {
  const s = useLiveQuery(() => db.sessions.get(id), [id])
  const [err, setErr] = useState(false)
  if (!s) return <main className="p-6">Loading…</main>
  const save = (patch: Partial<typeof s>) => db.sessions.update(id, patch).catch(() => setErr(true))
  const opt = (on: boolean) => `min-h-[48px] rounded-xl px-4 font-bold ${on ? 'bg-accent text-bg' : 'border-2 border-mute'}`
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-5 pb-28">
      <h1 className="text-3xl font-extrabold">Session summary</h1>
      <p className="text-mute">{new Date(s.start).toLocaleString()} · {s.place} · {Math.round(s.dur / 60)} min</p>
      <section className="rounded-3xl bg-card p-4">
        <div className="h-56" role="img" aria-label="Noise level across the session">
          <ResponsiveContainer>
            <LineChart data={s.samples}>
              <CartesianGrid strokeOpacity={0.2} />
              <XAxis type="number" dataKey="t" domain={[0, 'dataMax']} tickFormatter={(t) => `${Math.round(t / 60)}m`} stroke="var(--mute)" />
              <YAxis domain={[20, 90]} unit=" dB" width={56} stroke="var(--mute)" />
              <Tooltip labelFormatter={(t) => `${Math.round(Number(t) / 60)} min`} />
              {s.events.map((e, i) => <ReferenceLine key={i} x={e.t} stroke="var(--warn)" strokeDasharray="4 3" label={{ value: e.label, fontSize: 10, fill: 'var(--ink)', angle: -90, position: 'insideTopRight' }} />)}
              <Line dataKey="db" dot={false} stroke="var(--accent)" strokeWidth={3} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-5">
        <p>Average<br /><b className="text-2xl">{Math.round(s.avgDb)} dB</b></p>
        <p>Peak<br /><b className="text-2xl">{Math.round(s.peakDb)} dB</b></p>
        <p>Good<br /><b>{Math.round(s.pct.good)}%</b></p>
        <p>Distracting<br /><b>{Math.round(s.pct.distracting)}%</b></p>
        <p>Too loud<br /><b>{Math.round(s.pct.loud)}%</b></p>
        <p>Sound<br /><b>{s.sound}</b></p>
      </section>
      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">How focused were you?</h2>
        <div className="flex gap-1" role="radiogroup" aria-label="Focus rating">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={s.rating === n} aria-label={`${n} stars`} className="h-14 w-14 text-4xl" style={{ color: (s.rating ?? 0) >= n ? 'var(--warn)' : 'var(--mute)' }} onClick={() => save({ rating: n })}>★</button>)}
        </div>
        <h2 className="text-xl font-extrabold">Did the sound help?</h2>
        <div className="flex flex-wrap gap-2">
          {([['helped', 'Helped'], ['none', 'No difference'], ['annoying', 'Annoying']] as const).map(([k, l]) => <button key={k} className={opt(s.helped === k)} onClick={() => save({ helped: k })}>{l}</button>)}
        </div>
        {err && <p role="alert" className="text-bad">Couldn’t save your rating. Storage may be full or blocked.</p>}
      </section>
      <button className="btn btn-primary" onClick={onClose}>Done</button>
    </main>
  )
}
