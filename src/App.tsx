import { useState } from 'react'
import { Calibration, loadCal, loadSettings, saveCal, saveSettings } from './audio/calibration'
import { db } from './db/db'
import Onboarding from './pages/Onboarding'
import CalibrationPage from './pages/Calibration'
import Home from './pages/Home'
import SettingsPage from './pages/Settings'
import Session from './pages/Session'
import History from './pages/History'
import Insights from './pages/Insights'
import Results from './pages/Results'
import Schedule from './pages/Schedule'

type Tab = 'home' | 'schedule' | 'history' | 'insights' | 'results' | 'settings'
const TABS: [Tab, string][] = [['home', 'Home'], ['schedule', 'Schedule'], ['history', 'History'], ['insights', 'Insights'], ['results', 'Results'], ['settings', 'Settings']]

export default function App() {
  const [settings, setSettings] = useState(loadSettings), [cal, setCal] = useState(loadCal)
  const [calibrating, setCalibrating] = useState(false), [tab, setTab] = useState<Tab>('home'), [sid, setSid] = useState<number | null>(null)
  const upd = (s: typeof settings) => { setSettings(s); saveSettings(s) }

  if (!settings.onboarded) return <Onboarding onContinue={() => { upd({ ...settings, onboarded: true }); setCalibrating(true) }} />
  if (calibrating) return <CalibrationPage onSkip={() => setCalibrating(false)} onSave={(c: Calibration) => { setCal(c); saveCal(c); setTimeout(() => setCalibrating(false), 1500) }} />
  return (
    <>
      {sid !== null && <Session id={sid} onClose={() => { setSid(null); setTab('history') }} />}
      {/* Home stays mounted (just hidden) so the mic, timer and sound keep running while you browse. */}
      <div hidden={sid !== null || tab !== 'home'}><Home cal={cal} settings={settings} onFinish={setSid} /></div>
      {sid === null && tab === 'history' && <History onOpen={setSid} />}
      {sid === null && tab === 'schedule' && <Schedule />}
      {sid === null && tab === 'insights' && <Insights />}
      {sid === null && tab === 'results' && <Results />}
      {sid === null && tab === 'settings' && <SettingsPage settings={settings} onChange={upd} onRecalibrate={() => setCalibrating(true)} onBack={() => setTab('home')}
        onDelete={async () => { await db.delete(); localStorage.clear(); location.reload() }} />}
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t-2 border-mute/30 bg-card pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        {TABS.map(([k, l]) => <button key={k} onClick={() => { setSid(null); setTab(k) }} aria-current={tab === k && sid === null} className={`min-h-[56px] min-w-0 flex-1 text-xs font-bold sm:text-sm ${tab === k && sid === null ? 'text-accent underline' : 'text-mute'}`}>{l}</button>)}
      </nav>
    </>
  )
}
