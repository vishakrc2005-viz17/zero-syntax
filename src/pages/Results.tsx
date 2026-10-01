import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { best, MIN, rate } from '../lib/stats'

export default function Results() {
  const rows = useLiveQuery(() => db.sessions.toArray(), [], [])
  const cuts = [['Sound', (s: any) => s.sound], ['Noise type', (s: any) => s.noiseType], ['Place', (s: any) => s.place], ['Time of day', (s: any) => s.tod]] as const
  const combo = best(rate(rows.filter((s) => s.sound !== 'none'), (s) => `${s.sound}|${s.noiseType}`))
  const bestSound = best(rate(rows, (s) => s.sound))
  const [cs, cn] = combo ? combo.k.split('|') : []
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-5 pb-28">
      <h1 className="text-3xl font-extrabold">Results</h1>
      <section className="rounded-3xl bg-accent p-5 text-bg">
        <h2 className="text-xl font-extrabold">Best for you</h2>
        <p className="text-lg">{combo ? `${cs} noise gave your highest focus (${combo.avg.toFixed(1)}/5) when ${cn === 'unknown' ? 'noise was unclassified' : cn + ' was nearby'}.`
          : bestSound ? `${bestSound.k} gave your highest focus (${bestSound.avg.toFixed(1)}/5).` : `Not enough data yet. Rate at least ${MIN} sessions per option.`}</p>
      </section>
      {cuts.map(([title, key]) => {
        const r = rate(rows, key), b = best(r)
        return (
          <section key={title} className="rounded-3xl bg-card p-5">
            <h2 className="mb-2 text-xl font-extrabold">By {title.toLowerCase()}</h2>
            {!r.length && <p className="text-mute">Not enough data yet</p>}
            {r.map((x) => <p key={x.k} className="flex justify-between py-1"><span>{x.k}{b?.k === x.k && ' ★ best'}</span><span>{x.avg.toFixed(1)}/5 · {x.n} {x.n === 1 ? 'session' : 'sessions'}</span></p>)}
          </section>)
      })}
    </main>)
}
