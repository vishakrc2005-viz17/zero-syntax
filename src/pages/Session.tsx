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
    <main className="flex flex-col gap-5 p-4 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-md sm:p-5">
      <header className="pt-2 text-center">
        <h1 className="text-3xl font-black text-[#FFF6DC]">CalmStudy</h1>
      </header>
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
