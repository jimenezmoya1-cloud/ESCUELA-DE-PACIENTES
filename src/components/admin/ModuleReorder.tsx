"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ModuleItem {
  id: string
  title: string
  order: number
  days_to_unlock: number
  is_published: boolean
  blocksCount: number
  submodulesCount: number
}

export default function ModuleReorder({
  modules: initialModules,
}: {
  modules: ModuleItem[]
}) {
  const [modules, setModules] = useState(initialModules)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function moveModule(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= modules.length) return

    const newModules = [...modules]
    const temp = newModules[index]
    newModules[index] = newModules[newIndex]
    newModules[newIndex] = temp

    // Actualizar order
    const updated = newModules.map((m, i) => ({
      ...m,
      order: i + 1,
      days_to_unlock: i * 7,
    }))

    setModules(updated)
    setSaving(true)

    // Guardar en BD
    for (const mod of updated) {
      await fetch("/api/admin/update-module-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mod.id,
          order: mod.order,
          days_to_unlock: mod.days_to_unlock,
        }),
      })
    }

    setSaving(false)
    router.refresh()
  }

  return (
    <div className="divide-y divide-tertiary/10">
      {modules.map((mod, index) => (
        <div
          key={mod.id}
          className="flex items-center gap-4 px-5 py-3 hover:bg-background/30"
        >
          {/* Flechas de reorden */}
          <div className="flex flex-col">
            <button
              onClick={() => moveModule(index, "up")}
              disabled={index === 0 || saving}
              className="p-0.5 text-tertiary/50 hover:text-secondary disabled:opacity-30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => moveModule(index, "down")}
              disabled={index === modules.length - 1 || saving}
              className="p-0.5 text-tertiary/50 hover:text-secondary disabled:opacity-30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Número de orden */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {mod.order}
          </span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral truncate">{mod.title}</p>
            <p className="text-xs text-tertiary">
              {mod.blocksCount} bloques · {mod.submodulesCount} submódulos · Desbloqueo: día {mod.days_to_unlock}
            </p>
          </div>

          {/* Estado */}
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              mod.is_published
                ? "bg-success/10 text-success"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {mod.is_published ? "Publicado" : "Borrador"}
          </span>

          {/* Editar */}
          <Link
            href={`/admin/contenido/${mod.id}`}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10"
          >
            Editar
          </Link>
        </div>
      ))}
      {modules.length === 0 && (
        <div className="px-5 py-8 text-center text-tertiary">
          No hay módulos. Cree el primer módulo.
        </div>
      )}
    </div>
  )
}
