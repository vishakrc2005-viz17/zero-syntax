import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calibration, Settings, statusOf } from '../audio/calibration'
import { useMeter } from '../hooks/useMeter'
import { Masker, Sound, SAFE_MAX } from '../audio/masking'
import { Hysteresis, NoiseClassifier, NoiseType, topGroup } from '../audio/classifier'
import { db, Ev, Sample } from '../db/db'
import { avg, best, rate, todOf } from '../lib/stats'
import StatusBadge from '../components/StatusBadge'
import MicError from '../components/MicError'

const QUIET_DB = 35
const AUTO_RESPONSE_MS = 8000
const SOUNDS: Sound[] = ['none', 'white', 'pink', 'brown', 'rain']
const NOTE: Partial<Record<NoiseType, string>> = {
  speech: 'Speech is the most distracting for reading and writing.',
  music: 'Music nearby. Lower it or use headphones.', traffic: 'Traffic noise: using medium masking.', hum: 'Steady hum: using light masking.',
}
const PLACES = ['library', 'bedroom', 'balcony']
const num = (k: string, d: number) => Number(localStorage.getItem(k)) || d
interface Rec { start: number; elapsed: number; samples: Sample[]; events: Ev[]; secs: Record<string, number>; min: number[]; minType: string[] }

export default function Home({ cal, settings, onFinish }: { cal: Calibration; settings: Settings; onFinish: (id: number) => void }) {
  const { active, db: level, error, start, stop, meter } = useMeter(cal)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const customSound = useLiveQuery(() => db.customSounds.get('user'), [], null)
  const customUrl = useMemo(() => customSound ? URL.createObjectURL(customSound.file) : null, [customSound])
  const [place, setPlace] = useState(localStorage.getItem('cs.place') || 'library')
  const [sound, setSound] = useState<Sound>('none'); const [vol, setVol] = useState(0.3)
  const [mute, setMute] = useState(false); const [auto, setAuto] = useState(false)
  const [customError, setCustomError] = useState('')
  const [ntype, setNtype] = useState<NoiseType>('unknown'); const [mlOk, setMlOk] = useState(true)
  const [focusMin, setFocusMin] = useState(num('cs.focus', 25)); const [breakMin, setBreakMin] = useState(num('cs.break', 5))
  const [phase, setPhase] = useState<'focus' | 'break'>('focus'); const [run, setRun] = useState(false); const [left, setLeft] = useState(focusMin * 60)
  const [saveErr, setSaveErr] = useState(false)
  const masker = useRef(new Masker()).current; const hyst = useRef(new Hysteresis()); const clf = useRef<NoiseClassifier>()
  const rec = useRef<Rec | null>(null); const leftRef = useRef(left); const phaseRef = useRef(phase); const wake = useRef<any>(null)
  const autoVol = useRef(0)
  const status = statusOf(level, settings)
  const live = useRef({ db: 0, active: false, ntype, sound, vol, mute, auto, kind: 'none' as string, place, status })
  live.current = { ...live.current, db: level, active, ntype, sound, vol, mute, auto, place, status }
  const suggestion = best(rate(sessions, (s) => s.sound))
  const pick = (k: Sound) => {
    masker.unlock()
    masker.play(k, () => setCustomError('Could not play this audio file. Try another audio format.'))
    setSound(k)
    setCustomError('')
  }
  const uploadCustomSound = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setCustomError('Choose an audio file.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setCustomError('Audio files must be 25 MB or smaller.')
      return
    }
    try {
      await db.customSounds.put({ id: 'user', name: file.name, file })
      setCustomError('')
    } catch {
      setCustomError('Could not save this audio file on this device. Check available storage and try again.')
    }
  }
  const removeCustomSound = async () => {
    try {
      await db.customSounds.delete('user')
      if (sound === 'custom') pick('none')
      setCustomError('')
    } catch {
      setCustomError('Could not remove the custom audio file from this device.')
    }
  }

  useEffect(() => {
    masker.setCustomSound(customUrl)
    return () => {
      masker.setCustomSound(null)
      if (customUrl) URL.revokeObjectURL(customUrl)
    }
  }, [customUrl, masker])
  useEffect(() => () => masker.dispose(), [masker])

  // Auto volume follows every target with the same smooth response up and down.
  useEffect(() => {
    let lastKind = 'none', lastType = 'unknown'
    let previousTick = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const elapsed = Math.min(500, now - previousTick)
      previousTick = now
      const L = live.current; const kind = L.sound; let v = L.vol
      if (L.auto) {
        const target = !L.active || L.sound === 'none' ? 0
          : SAFE_MAX * (L.status === 'loud' ? settings.autoLoudPercent
            : L.status === 'distracting' ? settings.autoDistractingPercent : settings.autoGoodPercent) / 100
        const progress = 1 - Math.exp(-elapsed / AUTO_RESPONSE_MS)
        autoVol.current += (target - autoVol.current) * progress
        if (Math.abs(target - autoVol.current) < 0.0001) autoVol.current = target
        v = autoVol.current
      } else autoVol.current = 0
      if (L.mute || (L.auto && !L.active)) v = 0
      masker.play(kind); masker.setVolume(Math.min(SAFE_MAX, v))
      L.kind = v > 0 && kind !== 'none' ? kind : 'none'
      const r = rec.current
      if (r) {
        if (L.kind !== lastKind) r.events.push({ t: r.elapsed, label: L.kind === 'none' ? 'Sound stopped' : `${L.kind} started` })
        if (L.ntype !== lastType) r.events.push({ t: r.elapsed, label: `${L.ntype} noise` })
      }
      lastKind = L.kind; lastType = L.ntype
    }, 100)
    return () => clearInterval(id)
  }, [settings.autoGoodPercent, settings.autoDistractingPercent, settings.autoLoudPercent])

  // Noise type: 4 s window every 8 s, only above the quiet baseline. Falls back to volume-only on failure.
  useEffect(() => {
    if (!active || !mlOk) return
    const c = (clf.current ||= new NoiseClassifier()); let busy = false
    const id = setInterval(async () => {
      if (busy || live.current.db < QUIET_DB) return
      const a = meter.current?.grab(4); if (!a) return
      busy = true
      try { setNtype(hyst.current.push(topGroup(await c.classify(a)))) } catch { setMlOk(false) }
      busy = false
    }, 8000)
    return () => clearInterval(id)
  }, [active, mlOk])

  const finish = async () => {
    const r = rec.current; rec.current = null; setRun(false); wake.current?.release?.()
    if (!r || r.elapsed < 10) return
    const dbs = r.samples.map((s) => s.db), n = dbs.length, pc = (f: (d: number) => boolean) => (dbs.filter(f).length / n) * 100
    const sound = Object.entries(r.secs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none'
    try {
      const id = await db.sessions.add({
        start: r.start, dur: r.elapsed, place, avgDb: avg(dbs), peakDb: Math.max(...dbs), sound, volume: vol, tod: todOf(new Date(r.start).getHours()),
        noiseType: ntype, samples: r.samples, events: r.events,
        pct: { good: pc((d) => d <= settings.goodMax), distracting: pc((d) => d > settings.goodMax && d <= settings.distractMax), loud: pc((d) => d > settings.distractMax) },
      })
      onFinish(id)
    } catch { setSaveErr(true) }
  }

  // Timer tick. Samples every 5 s for the chart; one averaged log row per minute for the heatmap.
  useEffect(() => {
    if (!run) return
    const id = setInterval(() => {
      leftRef.current -= 1; setLeft(leftRef.current)
      const r = rec.current, L = live.current
      if (r && phaseRef.current === 'focus') {
        r.elapsed++; r.min.push(L.db); r.minType.push(L.ntype); r.secs[L.kind] = (r.secs[L.kind] || 0) + 1
        if (r.elapsed % 5 === 0) r.samples.push({ t: r.elapsed, db: Math.round(L.db), type: L.ntype })
        if (r.min.length >= 60) {
          const d = new Date()
          db.logs.add({ ts: +d, dow: d.getDay(), hour: d.getHours(), db: avg(r.min), type: r.minType[r.minType.length - 1], place: L.place }).catch(() => setSaveErr(true))
          r.min = []; r.minType = []
        }
      }
      if (leftRef.current <= 0) {
        const next = phaseRef.current === 'focus' ? 'break' : 'focus'
        if (next === 'break') finish()
        phaseRef.current = next; setPhase(next); setRun(false)
        leftRef.current = (next === 'focus' ? focusMin : breakMin) * 60; setLeft(leftRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [run])

  const begin = async () => {
    masker.unlock(); if (!active) await start()
    if (phaseRef.current === 'focus' && !rec.current) rec.current = { start: Date.now(), elapsed: 0, samples: [], events: [], secs: {}, min: [], minType: [] }
    try { wake.current = await (navigator as any).wakeLock?.request('screen') } catch { /* optional */ }
    setRun(true)
  }
  const reset = () => { rec.current = null; setRun(false); wake.current?.release?.(); phaseRef.current = 'focus'; setPhase('focus'); leftRef.current = focusMin * 60; setLeft(leftRef.current) }
  const setMin = (k: 'focus' | 'break', v: number) => {
    v = Math.max(1, Math.min(120, v || 1)); localStorage.setItem('cs.' + k, String(v))
    if (k === 'focus') { setFocusMin(v); if (!run && phase === 'focus') { leftRef.current = v * 60; setLeft(v * 60) } } else setBreakMin(v)
  }
  const mm = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
  const tab = 'min-h-[48px] rounded-xl px-4 font-bold'
  const chip = (on: boolean) => `${tab} ${on ? 'bg-accent text-bg' : 'border-2 border-mute'}`

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-5 pb-28">
      <section className="flex flex-col items-center gap-3 rounded-3xl bg-card p-5">
        {active && <p className="flex items-center gap-2 font-semibold"><span className="h-3 w-3 animate-pulse rounded-full bg-bad" />Mic active</p>}
        <p className="text-6xl font-extrabold tabular-nums">{active ? `≈ ${Math.round(level)} dB` : '— dB'}</p>
        <div className="h-5 w-full overflow-hidden rounded-full bg-bg" role="meter" aria-valuenow={Math.round(level)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`${{ good: 'bg-good', distracting: 'bg-warn', loud: 'bg-bad' }[status]} h-full transition-[width] duration-200`} style={{ width: `${active ? Math.min(100, level) : 0}%` }} />
        </div>
        {active ? <StatusBadge status={status} /> : <p className="text-mute">Start listening to see your level.</p>}
        {active && <p className="text-mute">Noise type: <b className="text-ink">{mlOk ? (ntype === 'unknown' ? 'listening…' : ntype) : 'volume only'}</b></p>}
        {active && NOTE[ntype] && <p className="text-center">{NOTE[ntype]}</p>}
        {!mlOk && <p className="text-center text-sm text-mute">Noise type model couldn’t load, so CalmStudy is using volume only.</p>}
        <p className="text-sm text-mute">Approximate{cal.done ? ', calibrated to your device.' : '. Not calibrated yet, so this is a rough guess.'}</p>
        {active ? <button className="btn btn-ghost w-full" onClick={stop}>Stop listening</button>
          : <><button className="btn btn-primary w-full" onClick={start}>Start listening</button>
            <p className="text-center text-sm text-mute">CalmStudy listens only to measure noise. Audio is never recorded or uploaded.</p></>}
        <MicError error={error} />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">Choose masking sound</h2>
        <div className="flex flex-wrap gap-2">
          {[...SOUNDS, ...(customSound ? ['custom' as const] : [])].map((k) => <button key={k} className={chip(sound === k)} aria-pressed={sound === k} onClick={() => pick(k)}>{k === 'none' ? 'No sound' : k === 'custom' ? `My sound: ${customSound?.name}` : k[0].toUpperCase() + k.slice(1)}</button>)}
        </div>
        {suggestion && sound === 'none' && <button className="text-left underline" onClick={() => pick(suggestion.k as Sound)}>Suggested: {suggestion.k} noise gave you {suggestion.avg.toFixed(1)}/5. Use it</button>}
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn btn-ghost cursor-pointer">
            {customSound ? 'Replace my sound' : 'Add my sound'}
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { void uploadCustomSound(e.currentTarget.files?.[0]); e.currentTarget.value = '' }} />
          </label>
          {customSound && <button className="text-sm underline" onClick={() => void removeCustomSound()}>Remove my sound</button>}
        </div>
        <p className="text-sm text-mute">Your audio stays on this device. Audio files up to 25 MB are supported; available formats depend on your browser.</p>
        {customError && <p role="alert" className="text-sm text-bad">{customError}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">Volume adjustment</h2>
        <div className="flex flex-wrap gap-2">
          <button className={chip(auto)} aria-pressed={auto} onClick={() => { masker.unlock(); setAuto(true) }}>Auto adjust: On</button>
          <button className={chip(!auto)} aria-pressed={!auto} onClick={() => setAuto(false)}>Auto adjust: Off (manual)</button>
        </div>
        <label className="flex items-center gap-3">{auto ? 'Automatic volume' : 'Volume'}
          <input type="range" min={0} max={SAFE_MAX} step={0.01} value={vol} disabled={auto} onChange={(e) => setVol(+e.target.value)} className="h-10 flex-1 disabled:opacity-50" aria-label="Masking volume" /></label>
        {auto && <p className="text-sm text-mute">Automatic volume smoothly follows the levels set in Settings, increasing and decreasing at the same rate for good, distracting, and too-loud noise.</p>}
        <button className={chip(mute)} aria-pressed={mute} onClick={() => setMute(!mute)}>{mute ? 'Unmute' : 'Mute all'}</button>
        {auto && active && status === 'good' && sound !== 'none' && <p>Noise is good; masking volume is held at 25%.</p>}
        {auto && !active && <p className="text-mute">Auto needs the mic on to read the room.</p>}
      </section>

      <section className="flex flex-col items-center gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-xl font-extrabold">{phase === 'focus' ? 'Focus' : 'Break'}</h2>
        <p className="text-6xl font-extrabold tabular-nums" aria-live="off">{mm}</p>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Place">
          {[...PLACES, ...(PLACES.includes(place) ? [] : [place])].map((p) => <button key={p} className={chip(place === p)} onClick={() => { setPlace(p); localStorage.setItem('cs.place', p) }}>{p}</button>)}
          <input placeholder="Custom place" className="h-12 w-36 rounded-xl border-2 border-mute bg-bg px-3" aria-label="Custom place"
            onKeyDown={(e) => { const v = e.currentTarget.value.trim().toLowerCase(); if (e.key === 'Enter' && v) { setPlace(v); localStorage.setItem('cs.place', v); e.currentTarget.value = '' } }} />
        </div>
        <div className="flex gap-2">
          {run ? <button className="btn btn-primary" onClick={() => setRun(false)}>Pause</button> : <button className="btn btn-primary" onClick={begin}>Start</button>}
          <button className="btn btn-ghost" onClick={reset}>Reset</button>
          {rec.current && <button className="btn btn-ghost" onClick={finish}>Finish</button>}
        </div>
        {!run && <div className="flex gap-4 text-sm">
          <label>Focus min <input type="number" value={focusMin} onChange={(e) => setMin('focus', +e.target.value)} className="h-10 w-16 rounded-lg border-2 border-mute bg-bg px-2" /></label>
          <label>Break min <input type="number" value={breakMin} onChange={(e) => setMin('break', +e.target.value)} className="h-10 w-16 rounded-lg border-2 border-mute bg-bg px-2" /></label></div>}
        {saveErr && <p role="alert" className="text-bad">Couldn’t save to this device’s storage. It may be full or blocked in private mode.</p>}
      </section>
    </main>
  )
}
