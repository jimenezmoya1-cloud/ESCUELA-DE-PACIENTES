"use client"

import Lottie from "lottie-react"
import fireAnimation from "../../../public/lottie/fire.json"

interface FireLottieProps {
  progress: number
  baseSize: number
  className?: string
}

export function FireLottie({ progress, baseSize, className = "" }: FireLottieProps) {
  const scale = Math.max(0.0625, 1 - progress)
  const size = Math.round(baseSize * scale)

  if (progress >= 1) {
    return <div className={`inline-block ${className}`} style={{ width: baseSize * 0.2, height: baseSize * 0.2 }} aria-label="Fuego apagado" />
  }

  return (
    <div className={`inline-block transition-all duration-700 ${className}`} style={{ width: size, height: size }}>
      <Lottie animationData={fireAnimation} loop autoplay />
    </div>
  )
}
