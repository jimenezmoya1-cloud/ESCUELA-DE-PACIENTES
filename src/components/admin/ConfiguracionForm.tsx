"use client"

import { useState, useTransition } from "react"
import type { SchedulingConfig } from "@/lib/payments/config"
import { centsToCop } from "@/lib/payments/config"
import { updateSchedulingConfig } from "@/app/(admin)/admin/configuracion/actions"

export default function ConfiguracionForm({ initial }: { initial: SchedulingConfig }) {
  const [teamsUrl, setTeamsUrl] = useState(initial.teamsMeetingUrl)
  const [priceSingle, setPriceSingle] = useState<string>(String(centsToCop(initial.priceSingleCop)))
  const [pricePack3, setPricePack3] = useState<string>(String(centsToCop(initial.pricePack3Cop)))
  const [wompiEnv, setWompiEnv] = useState<SchedulingConfig["wompiEnvironment"]>(initial.wompiEnvironment)
  const [wompiKey, setWompiKey] = useState(initial.wompiPublicKey)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const res = await updateSchedulingConfig({
        teamsMeetingUrl: teamsUrl,
        priceSingleCop: Number(priceSingle) || 0,
        pricePack3Cop: Number(pricePack3) || 0,
        wompiEnvironment: wompiEnv,
        wompiPublicKey: wompiKey,
      })
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Configuración guardada" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-neutral">Microsoft Teams</h2>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Link de la reunión</span>
          <input
            type="url"
            value={teamsUrl}
            onChange={(e) => setTeamsUrl(e.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <span className="mt-1 block text-xs text-tertiary">
            Este link se reutiliza para todas las evaluaciones de salud. Se desbloquea al paciente 24h antes de su cita.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-neutral">Precios (COP)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral">1 evaluación de salud</span>
            <div className="mt-1 flex rounded-lg border border-tertiary/20 focus-within:border-primary">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={priceSingle}
                onChange={(e) => setPriceSingle(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral">Paquete de 3 evaluaciones de salud</span>
            <div className="mt-1 flex rounded-lg border border-tertiary/20 focus-within:border-primary">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={pricePack3}
                onChange={(e) => setPricePack3(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4 opacity-70">
        <h2 className="text-lg font-medium text-neutral">Wompi (se activa en Plan 6)</h2>
        <p className="text-xs text-tertiary">
          Estos campos se llenan cuando tengas las credenciales de Wompi. Por ahora se pueden dejar vacíos.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral">Environment</span>
            <select
              value={wompiEnv}
              onChange={(e) => setWompiEnv(e.target.value as SchedulingConfig["wompiEnvironment"])}
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="sandbox">sandbox</option>
              <option value="production">production</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral">Public key</span>
            <input
              type="text"
              value={wompiKey}
              onChange={(e) => setWompiKey(e.target.value)}
              placeholder="pub_prod_..."
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {feedback && (
          <span className={`text-sm ${feedback.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  )
}
