import { Status } from '../audio/calibration'
const MAP = {
  good: ['Good', 'bg-good'], distracting: ['Distracting', 'bg-warn'], loud: ['Too loud', 'bg-bad'],
} as const
export default function StatusBadge({ status }: { status: Status }) {
  const [label, bg] = MAP[status]
  return <span role="status" className={`${bg} text-bg rounded-full px-5 py-2 text-lg font-extrabold`}>{label}</span>
}
