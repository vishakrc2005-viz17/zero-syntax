export default function Onboarding({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-4xl font-extrabold">CalmStudy</h1>
      <p className="text-xl">Know how noisy your study space is, and what helps you focus.</p>
      <p className="rounded-2xl bg-card p-5 text-lg">
        CalmStudy listens only to measure noise. Audio is never recorded or uploaded.
      </p>
      <p className="text-mute">Only numbers are kept, and only on this device.</p>
      <button className="btn btn-primary" onClick={onContinue}>Continue to calibration</button>
    </main>
  )
}
