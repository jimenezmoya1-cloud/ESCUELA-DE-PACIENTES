"use client"

interface EKGLineProps {
  className?: string
  color?: string
  opacity?: number
}

export default function EKGLine({
  className = "",
  color = "#06559F",
  opacity = 0.2,
}: EKGLineProps) {
  return (
    <svg
      viewBox="0 0 1200 60"
      fill="none"
      className={`w-full ${className}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points="0,30 200,30 240,30 260,10 280,50 300,5 320,55 340,30 380,30 600,30 640,30 660,10 680,50 700,5 720,55 740,30 780,30 1000,30 1040,30 1060,10 1080,50 1100,5 1120,55 1140,30 1200,30"
        stroke={color}
        strokeWidth="2"
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        className="animate-ekg-draw"
      />
    </svg>
  )
}
