"use client"

export default function CircularProgress({
  percent,
  size = 44,
  strokeWidth = 4,
  isCompleted = false,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  isCompleted?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const center = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isCompleted ? "#58AE33" : "#E5E7EB"}
          strokeWidth={strokeWidth}
          opacity={isCompleted ? 0.2 : 1}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isCompleted ? "#58AE33" : "#06559F"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isCompleted ? (
          <svg className="h-5 w-5 text-[#58AE33]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-[10px] font-bold text-[#06559F]">
            {percent}%
          </span>
        )}
      </div>
    </div>
  )
}
