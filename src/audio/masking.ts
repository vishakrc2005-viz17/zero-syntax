// Generated masking sounds (no audio files). Starts only after a user tap.
export type Sound = 'none' | 'white' | 'pink' | 'brown' | 'rain' | 'custom'
export const SAFE_MAX = 0.5 // hard ceiling on gain so the app can never get painfully loud

export class Masker {
  private ctx?: AudioContext; private master?: GainNode; private src?: AudioBufferSourceNode
  private customAudio?: HTMLAudioElement; private customNode?: MediaElementAudioSourceNode
  private customUrl: string | null = null; private customFailed = false
  private extra: AudioNode[] = []; kind: Sound = 'none'

  unlock() { // call from a tap handler (iOS)
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination)
    }
    this.ctx.resume()
  }
  setCustomSound(url: string | null) {
    if (url === this.customUrl) return
    this.customUrl = url
    this.customFailed = false
    if (this.customAudio) {
      this.customAudio.pause()
      this.customAudio.src = url || ''
      if (url) this.customAudio.load()
    }
  }
  private noise(kind: Sound): AudioBuffer {
    const c = this.ctx!, b = c.createBuffer(1, c.sampleRate * 6, c.sampleRate), d = b.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, last = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'pink') { // Paul Kellet's economy filter: approximates a -3 dB/octave slope
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
      } else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 } // leaky integrator: -6 dB/octave
      else d[i] = w * 0.5
    }
    return b
  }
  play(kind: Sound, onError?: (error: unknown) => void) {
    if (!this.ctx || (kind === this.kind && (kind !== 'custom' || !this.customAudio?.paused))) return
    this.src?.stop(); this.extra.forEach((n) => n.disconnect()); this.extra = []; this.src = undefined; this.kind = kind
    this.customAudio?.pause()
    if (kind === 'none') return
    if (kind === 'custom') {
      if (!this.customUrl || this.customFailed) return
      if (!this.customAudio) {
        this.customAudio = new Audio(this.customUrl)
        this.customAudio.loop = true
        this.customAudio.preload = 'auto'
        this.customNode = this.ctx.createMediaElementSource(this.customAudio)
        this.customNode.connect(this.master!)
      }
      void this.customAudio.play().catch((error: unknown) => {
        this.customFailed = true
        onError?.(error)
      })
      return
    }
    const c = this.ctx, s = c.createBufferSource()
    s.buffer = this.noise(kind === 'rain' ? 'white' : kind); s.loop = true
    if (kind === 'rain') { // rain = white noise band-limited + slow random-ish swell
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
      const g = c.createGain(); const lfo = c.createOscillator(); const lg = c.createGain()
      lfo.frequency.value = 0.3; lg.gain.value = 0.15; g.gain.value = 0.85; lfo.connect(lg).connect(g.gain); lfo.start()
      s.connect(hp).connect(lp).connect(g).connect(this.master!); this.extra = [hp, lp, g, lfo, lg]
    } else s.connect(this.master!)
    s.start(); this.src = s
  }
  /** 1–2 s ramp so changes never jump. */
  setVolume(v: number) {
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(Math.min(SAFE_MAX, Math.max(0, v)), this.ctx.currentTime, 0.5)
  }

  dispose() {
    this.src?.stop()
    this.customAudio?.pause()
    this.customNode?.disconnect()
    this.extra.forEach((n) => n.disconnect())
    void this.ctx?.close()
  }
}
