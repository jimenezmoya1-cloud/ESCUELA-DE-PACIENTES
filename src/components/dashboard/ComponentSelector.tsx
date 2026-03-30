"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AVAILABLE_COMPONENTS } from "@/types/database"

export default function ComponentSelector({
  patientId,
  onComplete,
}: {
  patientId: string
  onComplete?: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function handleSelect(component: string) {
    setSelected((prev) => {
      if (prev.includes(component)) {
        return prev.filter((c) => c !== component)
      }
      if (prev.length >= 3) return prev
      return [...prev, component]
    })
  }

  function handleShowConfirm() {
    if (selected.length !== 3) return
    setShowConfirm(true)
  }

  async function handleSave() {
    if (selected.length !== 3) return
    setSaving(true)

    try {
      // Delete any existing selections
      await supabase
        .from("patient_components")
        .delete()
        .eq("patient_id", patientId)

      // Insert the 3 selected components
      for (let i = 0; i < selected.length; i++) {
        await supabase.from("patient_components").insert({
          patient_id: patientId,
          component_name: selected[i],
          priority_order: i + 1,
        })
      }

      // Always add "Salud Sexual" as the 4th component
      await supabase.from("patient_components").insert({
        patient_id: patientId,
        component_name: "Salud Sexual",
        priority_order: 4,
      })

      // Mark user as having selected components
      await supabase
        .from("users")
        .update({ has_selected_components: true })
        .eq("id", patientId)

      onComplete?.()
      router.refresh()
    } catch (err) {
      console.error("Error saving components:", err)
      alert("Error al guardar la selección. Intente de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-5">
          <h2 className="text-xl font-bold text-white">
            Selecciona tus 3 componentes prioritarios
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Elige en orden de prioridad los componentes en los que deseas enfocarte
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Warning message */}
          <div className="mb-5 rounded-xl border-2 border-[#1E8DCE]/20 bg-[#06559F]/5 p-4">
            <p className="text-sm font-medium text-[#06559F] leading-relaxed">
              &ldquo;Por favor revísalo en tu reporte de salud digital en la sección Componentes clave a trabajar y selecciona en orden, estos 3.&rdquo;
            </p>
          </div>

          {/* Selected order indicator */}
          <div className="mb-5 flex gap-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`flex flex-1 items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${
                  selected[n - 1]
                    ? "border-[#06559F] bg-[#06559F]/5"
                    : "border-dashed border-gray-300"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected[n - 1]
                      ? "bg-[#06559F] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {n}°
                </span>
                <span className="truncate text-xs font-medium text-neutral">
                  {selected[n - 1] || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Component grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {AVAILABLE_COMPONENTS.map((comp) => {
              const idx = selected.indexOf(comp)
              const isSelected = idx !== -1
              const isDisabled = !isSelected && selected.length >= 3

              return (
                <button
                  key={comp}
                  onClick={() => handleSelect(comp)}
                  disabled={isDisabled}
                  className={`relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? "border-[#06559F] bg-[#06559F]/5 text-[#06559F] shadow-sm"
                      : isDisabled
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 bg-white text-neutral hover:border-[#1E8DCE]/50 hover:bg-[#1E8DCE]/5"
                  }`}
                >
                  {isSelected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06559F] text-[10px] font-bold text-white">
                      {idx + 1}°
                    </span>
                  )}
                  <span className={`font-medium ${isSelected ? "" : "pl-0.5"}`}>
                    {comp}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          {!showConfirm ? (
            <button
              onClick={handleShowConfirm}
              disabled={selected.length !== 3}
              className="w-full rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selected.length < 3
                ? `Selecciona ${3 - selected.length} componente${3 - selected.length > 1 ? "s" : ""} más`
                : "Confirmar selección"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-[#06559F]/5 border border-[#06559F]/20 p-3">
                <p className="text-sm text-[#06559F]">
                  <strong>Tu ruta personalizada será:</strong>
                </p>
                <ol className="mt-2 space-y-1">
                  <li className="text-xs text-gray-600">1. Módulo introductorio</li>
                  {selected.map((c, i) => (
                    <li key={c} className="text-xs text-gray-600">
                      {i + 2}. {c}
                    </li>
                  ))}
                  <li className="text-xs text-gray-600">{selected.length + 2}. Salud Sexual</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cambiar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar ruta"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
