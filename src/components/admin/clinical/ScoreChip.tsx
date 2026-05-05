"use client"

interface Props {
  label: string
  displayValue: string | null
  score: number | null
}

export default function ScoreChip({ label, displayValue, score }: Props) {
  const isReady = score !== null && displayValue !== null
  const colorClass = !isReady
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : score >= 80
      ? "border-green-300 bg-green-50 text-green-800"
      : score > 50
        ? "border-yellow-300 bg-yellow-50 text-yellow-800"
        : "border-red-300 bg-red-50 text-red-800"

  return (
    <div
      className={`max-w-[200px] px-4 py-3 rounded-xl border-2 ${colorClass}`}
      aria-label={`${label}: ${displayValue ?? 'sin valor'}, CAIMED ${score ?? '–'}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-sm font-black mt-0.5">{displayValue ?? '—'}</p>
      <div className="border-t border-current/20 my-1.5" />
      <p className="text-xs font-bold opacity-70">CAIMED</p>
      <p className="text-lg font-black leading-tight">{score ?? '—'}</p>
    </div>
  )
}
