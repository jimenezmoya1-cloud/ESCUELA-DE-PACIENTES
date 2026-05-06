'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Phone, Share2 } from 'lucide-react'
import Link from 'next/link'

interface ConfirmationCardProps {
  nombre: string
  score: number
  accountCreated: boolean
}

export default function ConfirmationCard({
  nombre,
  score,
  accountCreated,
}: ConfirmationCardProps) {
  const shareText = encodeURIComponent(
    `Hice mi chequeo cardiovascular gratuito en CAIMED. ¡Hazlo tú también! ${typeof window !== 'undefined' ? window.location.origin : ''}/chequeo`,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-[#22C55E]" aria-hidden="true" />

        <h2 className="text-xl font-semibold text-[#212B52]">
          ¡Listo! Tu resultado ha sido guardado.
        </h2>

        <div className="rounded-lg bg-[#F0F4FA] px-4 py-3">
          <p className="text-sm text-[#6A778F]">
            {nombre}, tu score parcial es
          </p>
          <p className="text-2xl font-semibold text-[#06559F]">{score}</p>
        </div>

        <div className="mt-2 space-y-2">
          <p className="text-sm text-[#6A778F]">
            Llama sin compromiso y entérate más de nuestro programa.
          </p>
          <a
            href="tel:601-390-1987"
            className="inline-flex items-center gap-2 text-base font-medium text-[#06559F] hover:underline"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            601-390-1987
          </a>
        </div>

        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#06559F] px-4 py-2 text-sm font-medium text-[#06559F] transition-colors hover:bg-[#F0F4FA]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir por WhatsApp
        </a>

        {accountCreated && (
          <div className="mt-4 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/5 p-4">
            <p className="text-sm text-[#212B52]">
              Ya puedes iniciar sesión para ver tu perfil de salud.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-block rounded-lg bg-[#06559F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#054A87]"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
