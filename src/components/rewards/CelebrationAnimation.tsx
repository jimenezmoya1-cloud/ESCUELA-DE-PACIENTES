"use client"

import { useEffect, useState, useCallback } from "react"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  velocityX: number
  velocityY: number
  opacity: number
  shape: 'circle' | 'square' | 'triangle'
}

const COLORS = ['#22c55e', '#1A62DD', '#eab308', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899']

export default function CelebrationAnimation({
  show,
  onComplete,
}: {
  show: boolean
  onComplete?: () => void
}) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(false)

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 40,
        size: 4 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 12,
        velocityY: -8 - Math.random() * 8,
        opacity: 1,
        shape: (['circle', 'square', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      })
    }
    return newParticles
  }, [])

  useEffect(() => {
    if (!show) return

    setVisible(true)
    setParticles(createParticles())

    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.velocityX * 0.3,
          y: p.y + p.velocityY * 0.3,
          velocityY: p.velocityY + 0.3,
          rotation: p.rotation + p.velocityX * 2,
          opacity: Math.max(0, p.opacity - 0.012),
        }))
        if (updated.every(p => p.opacity <= 0)) {
          clearInterval(interval)
          setVisible(false)
          onComplete?.()
          return []
        }
        return updated
      })
    }, 30)

    return () => clearInterval(interval)
  }, [show, createParticles, onComplete])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            transition: 'none',
          }}
        >
          {p.shape === 'circle' && (
            <div className="h-full w-full rounded-full" style={{ backgroundColor: p.color }} />
          )}
          {p.shape === 'square' && (
            <div className="h-full w-full rounded-sm" style={{ backgroundColor: p.color }} />
          )}
          {p.shape === 'triangle' && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${p.size / 2}px solid transparent`,
                borderRight: `${p.size / 2}px solid transparent`,
                borderBottom: `${p.size}px solid ${p.color}`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Animación más pequeña para badges individuales
export function BadgeUnlockGlow({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/30" />
  )
}
