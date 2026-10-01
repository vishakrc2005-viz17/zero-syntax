import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
export default function History({ onOpen }: { onOpen: (id: number) => void }) {
  const rows = useLiveQuery(() => db.sessions.orderBy('start').reverse().toArray(), [], [])
  return (
    <main className="mx-auto flex max-w-md flex-col gap-3 p-5 pb-28">
      <h1 className="text-3xl font-extrabold">History</h1>
      {!rows.length && <p className="text-mute">No sessions yet. Start a focus timer on Home.</p>}
      {rows.map((s) => (
        <button key={s.id} onClick={() => onOpen(s.id!)} className="min-h-[72px] rounded-2xl bg-card p-4 text-left">
          <b>{new Date(s.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</b> · {s.place}
          <br />{Math.round(s.dur / 60)} min · {Math.round(s.avgDb)} dB · {s.sound} · {s.rating ? `${s.rating}/5 ★` : 'not rated'}
        </button>))}
    </main>)
}
