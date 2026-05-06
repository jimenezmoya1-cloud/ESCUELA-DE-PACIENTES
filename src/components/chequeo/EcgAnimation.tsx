'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface EcgAnimationProps {
  onComplete: () => void
}

const messages = [
  'Analizando tus datos...',
  'Calculando tu score...',
  '¡Listo!',
]

export default function EcgAnimation({ onComplete }: EcgAnimationProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const handleComplete = useCallback(() => {
    onCompleteRef.current()
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setMessageIndex(1), 1500)
    const t2 = setTimeout(() => setMessageIndex(2), 3000)
    const t3 = setTimeout(() => handleComplete(), 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [handleComplete])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      <svg
        viewBox="0 0 300 80"
        className="w-full max-w-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <motion.path
          d="M 0 40 L 40 40 L 55 40 L 65 20 L 75 60 L 85 10 L 95 70 L 105 30 L 115 40 L 140 40 L 155 40 L 165 25 L 175 55 L 185 15 L 195 65 L 205 35 L 215 40 L 260 40 L 300 40"
          stroke="#06559F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </svg>

      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-lg font-medium text-[#212B52]"
      >
        {messages[messageIndex]}
      </motion.p>
    </div>
  )
}
