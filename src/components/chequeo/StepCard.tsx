'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface StepCardProps {
  stepKey: number
  direction: 'forward' | 'back'
  children: React.ReactNode
}

const variants = {
  enter: (direction: 'forward' | 'back') => ({
    x: direction === 'forward' ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'back') => ({
    x: direction === 'forward' ? -80 : 80,
    opacity: 0,
  }),
}

export default function StepCard({ stepKey, direction, children }: StepCardProps) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mx-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
