// All mic/Web Audio logic lives here, not in components.
export class MicMeter {
  private ctx?: AudioContext; private stream?: MediaStream; private analyser?: AnalyserNode; private buf?: Float32Array<ArrayBuffer>
  private ring = new Float32Array(0); private w = 0; private filled = 0

  /** Must be called from a user tap (iOS needs a gesture to resume AudioContext). */
  async start() {
    // Processing off: noise suppression / AGC would hide the very noise we want to measure.
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false } })
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    await this.ctx.resume()
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 2048
    src.connect(this.analyser); this.buf = new Float32Array(2048)
    // Rolling 6 s buffer (in memory only) feeding the classifier.
    this.ring = new Float32Array(Math.floor(this.ctx.sampleRate * 6))
    const proc = this.ctx.createScriptProcessor(4096, 1, 1), mute = this.ctx.createGain(); mute.gain.value = 0
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0)
      for (let i = 0; i < d.length; i++) { this.ring[this.w] = d[i]; this.w = (this.w + 1) % this.ring.length }
      this.filled = Math.min(this.ring.length, this.filled + d.length)
    }
    src.connect(proc); proc.connect(mute).connect(this.ctx.destination)
  }
  /** Root-mean-square of the current waveform window (0..1). */
  rms() {
    if (!this.analyser || !this.buf) return 0
    this.analyser.getFloatTimeDomainData(this.buf)
    let s = 0; for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i]
    return Math.sqrt(s / this.buf.length)
  }
  /** Last `sec` seconds as 16 kHz mono (linear-interpolation resample from the device rate). */
  grab(sec: number): Float32Array | null {
    if (!this.ctx) return null
    const rate = this.ctx.sampleRate, n = Math.min(Math.floor(sec * rate), this.filled)
    if (n < rate * 2) return null
    const L = this.ring.length, start = (this.w - n + L) % L, outN = Math.floor((n / rate) * 16000), out = new Float32Array(outN)
    for (let i = 0; i < outN; i++) {
      const pos = (i * rate) / 16000, i0 = Math.floor(pos), f = pos - i0
      out[i] = this.ring[(start + i0) % L] * (1 - f) + this.ring[(start + i0 + 1) % L] * f
    }
    return out
  }
  stop() { this.stream?.getTracks().forEach((t) => t.stop()); this.ctx?.close(); this.stream = this.ctx = this.analyser = undefined; this.filled = 0 }
}
