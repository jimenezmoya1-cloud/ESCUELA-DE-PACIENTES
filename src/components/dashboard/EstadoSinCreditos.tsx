"use client"

import { useState, useTransition } from "react"
import { requestManualPaymentMessage } from "@/app/(dashboard)/agendar/actions"
import type { Plan } from "@/lib/payments/types"

interface Props {
  priceSingleCop: number     // pesos enteros
  pricePack3Cop: number
}

export default function EstadoSinCreditos({ priceSingleCop, pricePack3Cop }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function requestPayment(plan: Plan) {
    setFeedback(null)
    startTransition(async () => {
      const res = await requestManualPaymentMessage(plan)
      if (res.ok) {
        setFeedback({
          kind: "ok",
          msg: "Tu solicitud fue enviada. El administrador te enviará los datos por mensaje pronto.",
        })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">
          Para reservar una cita necesitas comprar al menos una evaluación. Elige el plan que mejor se adapte a ti.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Plan single */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral">1 evaluación de salud</h3>
            <p className="mt-1 text-sm text-tertiary">Una cita con tu clínico asignado.</p>
          </div>
          <div className="text-3xl font-bold text-primary">{fmt(priceSingleCop)}</div>
          <button
            type="button"
            disabled={pending}
            onClick={() => requestPayment("single")}
            className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Enviando solicitud..." : "Solicitar pago"}
          </button>
        </div>

        {/* Plan pack3 — destacado */}
        <div className="rounded-2xl border-2 border-primary bg-white p-6 space-y-4 relative">
          <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
            30% off
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral">3 evaluaciones de salud</h3>
            <p className="mt-1 text-sm text-tertiary">Inicial, intermedia y final — sigue tu progreso.</p>
          </div>
          <div className="text-3xl font-bold text-primary">{fmt(pricePack3Cop)}</div>
          <p className="text-xs text-tertiary">
            Ahorras {fmt(priceSingleCop * 3 - pricePack3Cop)} vs. comprar individual.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => requestPayment("pack3")}
            className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Enviando solicitud..." : "Solicitar pago"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.kind === "ok"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="rounded-xl bg-background p-4 text-xs text-tertiary">
        <strong>¿Cómo funciona el pago?</strong> Por ahora solo aceptamos pago manual por transferencia.
        Cuando hagas click en "Solicitar pago", el administrador recibirá un mensaje y te enviará los datos
        bancarios por la sección de "Mensajes". Una vez confirmado, tendrás los créditos disponibles para agendar.
      </div>
    </div>
  )
}
