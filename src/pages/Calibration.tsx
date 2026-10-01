import { useEffect, useRef, useState } from 'react'
import { Calibration as Cal, fitCalibration } from '../audio/calibration'
import { useMeter } from '../hooks/useMeter'
import MicError from '../components/MicError'

type Phase = 'intro' | 'quiet' | 'ref' | 'done'
const SECONDS = 10

export default function CalibrationPage({ onSave, onSkip }: { onSave: (c: Cal) => void; onSkip: () => void }) {
  const { error, start, stop, rmsRef } = useMeter({ a: 95, b: 1, done: false })
  const [phase, setPhase] = useState<Phase>('intro')
  const [left, setLeft] = useState(SECONDS)
  const quiet = useRef(0)

  // Average power (mean of rms²) over the window is steadier than averaging rms.
  const collect = (then: (rms: number) => void) => {
    let n = 0, sum = 0, t = 0
    setLeft(SECONDS)
    const id = window.setInterval(() => {
      sum += rmsRef.current ** 2; n++; t += 0.1
      setLeft(Math.max(0, Math.ceil(SECONDS - t)))
      if (t >= SECONDS) { clearInterval(id); then(Math.sqrt(sum / n)) }
    }, 100)
  }

  const begin = async () => {
    await start()
    setPhase('quiet')
    collect((r) => { quiet.current = r; setPhase('ref') })
  }
  const measureRef = () => { setPhase('quiet'); collect((r) => { stop(); setPhase('done'); onSave(fitCalibration(quiet.current, r)) }) }
  useEffect(() => () => stop(), [stop])

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <h1 className="text-3xl font-extrabold">Calibrate your mic</h1>
      <MicError error={error} />
      {phase === 'intro' && <>
        <p className="text-lg">Two quick steps make the dB reading fit your device. First, 10 seconds of quiet. Then 10 seconds of normal speech, about an arm’s length from your phone.</p>
        <button className="btn btn-primary" onClick={begin}>Start: stay quiet</button>
      </>}
      {phase === 'quiet' && <p className="text-xl" aria-live="polite">Listening… {left}s</p>}
      {phase === 'ref' && <>
        <p className="text-lg">Step 2: tap start, then speak at a normal volume for 10 seconds.</p>
        <button className="btn btn-primary" onClick={measureRef}>Start: speak normally</button>
      </>}
      {phase === 'done' && <p className="text-xl">Calibrated. You can re-run this any time in Settings.</p>}
      {phase !== 'done' && <button className="btn btn-ghost" onClick={() => { stop(); onSkip() }}>Skip for now</button>}
    </main>
  )
}
