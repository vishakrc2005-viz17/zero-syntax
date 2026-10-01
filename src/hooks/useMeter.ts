import { useCallback, useEffect, useRef, useState } from 'react'
import { MicMeter } from '../audio/meter'
import { Calibration, rmsToDb } from '../audio/calibration'

const TICK_MS = 100
// Exponential moving average with ~1 s time constant: alpha = 1 - e^(-dt/tau).
const ALPHA = 1 - Math.exp(-TICK_MS / 1000)

export type MicError = 'denied' | 'unsupported' | 'other' | null

export function useMeter(cal: Calibration) {
  const meter = useRef<MicMeter | null>(null)
  const calRef = useRef(cal); calRef.current = cal
  const rmsRef = useRef(0) // raw RMS, read by the calibration screen
  const [active, setActive] = useState(false)
  const [db, setDb] = useState(0)
  const [error, setError] = useState<MicError>(null)
  const timer = useRef<number>()

  const stop = useCallback(() => {
    clearInterval(timer.current); meter.current?.stop(); meter.current = null; setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) return setError('unsupported')
    try {
      const m = new MicMeter(); await m.start(); meter.current = m
      let smooth: number | null = null
      timer.current = window.setInterval(() => {
        const rms = m.rms(); rmsRef.current = rms
        const now = rmsToDb(rms, calRef.current)
        smooth = smooth === null ? now : smooth + ALPHA * (now - smooth) // smooth in dB domain
        setDb(Math.max(0, smooth))
      }, TICK_MS)
      setActive(true)
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'other')
    }
  }, [])

  useEffect(() => stop, [stop])
  return { active, db, error, start, stop, rmsRef, meter }
}
