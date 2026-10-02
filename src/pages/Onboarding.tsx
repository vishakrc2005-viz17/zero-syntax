export default function Onboarding({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center sm:mx-auto sm:max-w-md sm:p-6">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-5xl font-black tracking-tight text-[#FFF6DC]">CalmStudy</h1>
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-[#76C0EC] opacity-80">
          <span className="h-2 w-2 rounded-full bg-[#76C0EC] animate-pulse" />
          loading
        </div>
      </div>
      <p className="text-xl text-[#FFF6DC]">Know how noisy your study space is, and what helps you focus.</p>
      <p className="rounded-2xl bg-card p-5 text-lg text-[#FFF6DC]">
        CalmStudy listens only to measure noise. Audio is never recorded or uploaded.
      </p>
      <p className="text-mute">Only numbers are kept, and only on this device.</p>
      <button className="btn btn-primary w-full" onClick={onContinue}>Continue to calibration</button>
    </main>
  )
}
