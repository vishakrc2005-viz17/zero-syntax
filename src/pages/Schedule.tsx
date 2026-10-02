import { FormEvent, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ScheduleTask } from '../db/db'

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function Schedule() {
  const tasks = useLiveQuery(() => db.scheduleTasks.orderBy('date').toArray(), [], [])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ScheduleTask['category']>('study')
  const [date, setDate] = useState(localDate)
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Enter a task name before adding it.')
      return
    }
    try {
      await db.scheduleTasks.add({ title: cleanTitle, category, date, time, completed: false, createdAt: Date.now() })
      setTitle('')
      setError('')
    } catch {
      setError('Could not save the schedule item. Check device storage and try again.')
    }
  }

  const setCompleted = async (task: ScheduleTask, completed: boolean) => {
    if (task.id === undefined) return
    try {
      await db.scheduleTasks.update(task.id, { completed })
      setError('')
    } catch {
      setError('Could not update the completion status. Please try again.')
    }
  }

  const removeTask = async (task: ScheduleTask) => {
    if (task.id === undefined) return
    try {
      await db.scheduleTasks.delete(task.id)
      setError('')
    } catch {
      setError('Could not delete the schedule item. Please try again.')
    }
  }

  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.createdAt - b.createdAt)
  const pending = sorted.filter((task) => !task.completed)
  const completed = sorted.filter((task) => task.completed)

  const taskList = (items: ScheduleTask[], heading: string) => (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      <h2 className="text-xl font-extrabold">{heading} <span className="text-sm font-normal text-mute">({items.length})</span></h2>
      {!items.length ? <p className="text-mute">{heading === 'To do' ? 'Nothing planned yet. Add a work or study task above.' : 'Completed tasks will appear here.'}</p> : items.map((task) => (
        <article key={task.id} className="flex items-center gap-3 rounded-2xl border border-mute/30 p-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(event) => void setCompleted(task, event.currentTarget.checked)}
            aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
            className="h-6 w-6 accent-[var(--accent)]"
          />
          <div className="min-w-0 flex-1">
            <p className={`break-words font-bold ${task.completed ? 'text-mute line-through' : ''}`}>{task.title}</p>
            <p className="text-sm text-mute">
              {task.category === 'study' ? 'Study' : 'Work'} · {new Date(`${task.date}T00:00:00`).toLocaleDateString([], { dateStyle: 'medium' })}
              {task.time && ` · ${task.time}`}
            </p>
          </div>
          <button type="button" className="min-h-[44px] px-2 text-sm text-bad underline" onClick={() => void removeTask(task)} aria-label={`Delete ${task.title}`}>Delete</button>
        </article>
      ))}
    </section>
  )

  return (
    <main className="flex flex-col gap-5 p-4 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-md sm:p-5">
      <h1 className="text-3xl font-extrabold">Schedule</h1>
      <form onSubmit={(event) => void addTask(event)} className="flex flex-col gap-4 rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">Plan work or study</h2>
        <label className="flex flex-col gap-2 font-semibold">
          Task
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder="e.g. Review lecture notes" className="h-12 rounded-xl border-2 border-mute bg-bg px-3" />
        </label>
        <label className="flex flex-col gap-2 font-semibold">
          Type
          <select value={category} onChange={(event) => setCategory(event.target.value as ScheduleTask['category'])} className="h-12 rounded-xl border-2 border-mute bg-bg px-3">
            <option value="study">Study</option>
            <option value="work">Work</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 font-semibold">
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="h-12 min-w-0 rounded-xl border-2 border-mute bg-bg px-2" />
          </label>
          <label className="flex flex-col gap-2 font-semibold">
            Time (optional)
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-12 min-w-0 rounded-xl border-2 border-mute bg-bg px-2" />
          </label>
        </div>
        <button type="submit" className="btn btn-primary">Add to schedule</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </form>
      {taskList(pending, 'To do')}
      {taskList(completed, 'Completed')}
    </main>
  )
}
