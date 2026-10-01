import { MicError as E } from '../hooks/useMeter'
const MSG = {
  denied: 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.',
  unsupported: 'This browser can’t access the microphone. Try Chrome, Edge, Safari or Firefox over HTTPS.',
  other: 'Couldn’t start the microphone. Check that no other app is using it, then try again.',
} as const
export default function MicError({ error }: { error: E }) {
  return error ? <p role="alert" className="rounded-xl border-2 border-bad p-4 text-bad">{MSG[error]}</p> : null
}
