"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function GenerateCodesForm() {
  const [quantity, setQuantity] = useState(5)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<string[]>([])
  const router = useRouter()

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setGenerated([])

    try {
      const res = await fetch("/api/admin/generate-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      })

      if (res.ok) {
        const data = await res.json()
        setGenerated(data.codes)
        router.refresh()
      }
    } catch {
      // Error silencioso
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-neutral">Generar nuevos códigos</h2>
      <form onSubmit={handleGenerate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-sm text-tertiary">Cantidad</label>
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-32 rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-secondary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar códigos"}
        </button>
      </form>

      {generated.length > 0 && (
        <div className="mt-4 rounded-lg bg-success/5 border border-success/20 p-4">
          <p className="mb-2 text-sm font-medium text-success">
            {generated.length} códigos generados:
          </p>
          <div className="flex flex-wrap gap-2">
            {generated.map((code) => (
              <span
                key={code}
                className="rounded bg-white px-2 py-1 font-mono text-xs text-neutral shadow-sm"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
