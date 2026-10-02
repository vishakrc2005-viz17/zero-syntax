import { Settings as S } from '../audio/calibration'

export default function SettingsPage({ settings, onDelete, onChange, onRecalibrate, onBack }:
  { settings: S; onDelete?: () => void; onChange: (s: S) => void; onRecalibrate: () => void; onBack: () => void }) {
  const num = (k: 'goodMax' | 'distractMax', label: string) => (
    <label className="flex items-center justify-between gap-4 text-lg">
      {label}
      <input type="number" min={20} max={100} value={settings[k]} className="h-14 w-24 rounded-xl border-2 border-mute bg-card px-3 text-right"
        onChange={(e) => onChange({ ...settings, [k]: Number(e.target.value) })} />
    </label>
  )
  const volume = (k: 'autoGoodPercent' | 'autoDistractingPercent' | 'autoLoudPercent', label: string) => (
    <label className="flex items-center justify-between gap-4 text-lg">
      {label}
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={100} step={1} value={settings[k]} className="h-14 w-24 rounded-xl border-2 border-mute bg-card px-3 text-right"
          onChange={(e) => onChange({ ...settings, [k]: Math.max(0, Math.min(100, Number(e.target.value))) })} />
        <span>%</span>
      </div>
    </label>
  )
  return (
    <main className="flex min-h-screen flex-col gap-5 p-4 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-md sm:p-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">Settings</h1>
      <section className="flex flex-col gap-4 rounded-2xl bg-card/80 backdrop-blur-sm p-5 border border-accent/20">
        <h2 className="text-xl font-extrabold text-accent">Noise thresholds (dB)</h2>
        {num('goodMax', 'Good up to')}
        {num('distractMax', 'Distracting up to')}
        <p className="text-sm text-mute">Above the second value counts as too loud.</p>
      </section>
      <section className="flex flex-col gap-4 rounded-2xl bg-card/80 backdrop-blur-sm p-5 border border-accent/20">
        <h2 className="text-xl font-extrabold text-accent">Automatic masking volume (%)</h2>
        {volume('autoGoodPercent', 'Noise is good')}
        {volume('autoDistractingPercent', 'Noise is distracting')}
        {volume('autoLoudPercent', 'Noise is too loud')}
        <p className="text-sm text-mute">Set the target volume for each noise level. Changes ramp smoothly in either direction and remain within the app’s safe volume limit.</p>
      </section>
      <section className="flex flex-col gap-4 rounded-2xl bg-card/80 backdrop-blur-sm p-5 border border-accent/20">
        <h2 className="text-xl font-extrabold text-accent">Focus Mode</h2>
        <label className="flex items-center justify-between gap-4 text-lg cursor-pointer">
          <span>Block notifications</span>
          <input type="checkbox" checked={settings.blockNotifications || false} className="h-6 w-6 cursor-pointer rounded accent-accent"
            onChange={(e) => onChange({ ...settings, blockNotifications: e.target.checked })} />
        </label>
        <p className="text-sm text-mute">Automatically silence notifications and popups while studying to minimize distractions.</p>
      </section>
      <button className="btn btn-ghost" onClick={onRecalibrate}>Re-run calibration</button>
      <button className="btn btn-ghost !border-bad !text-bad" onClick={() => confirm('Delete all sessions, noise logs and settings from this device?') && onDelete?.()}>Delete all data</button>
      <button className="btn btn-primary" onClick={onBack}>Back</button>
    </main>
  )
}
