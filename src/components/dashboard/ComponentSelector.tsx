"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AVAILABLE_COMPONENTS } from "@/types/database"

type Gender = 'male' | 'female'

export default function ComponentSelector({
  patientId,
  onComplete,
}: {
  patientId: string
  onComplete?: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [gender, setGender] = useState<Gender | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [takesMedication, setTakesMedication] = useState<boolean | null>(null)
  const [wantsSaludSexual, setWantsSaludSexual] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function handleSelect(component: string) {
    setSelected((prev) => {
      if (prev.includes(component)) return prev.filter((c) => c !== component)
      if (prev.length >= 3) return prev
      return [...prev, component]
    })
  }

  function canGoToStep2() {
    return gender !== null
  }

  function canGoToStep3() {
    return selected.length === 3 && takesMedication !== null
  }

  function canSave() {
    if (gender === 'male') return wantsSaludSexual !== null
    return true // female: no salud sexual question needed
  }

  async function handleSave() {
    if (!canGoToStep2() || !canGoToStep3() || !canSave()) return
    setSaving(true)

    try {
      // Delete existing selections first
      const { error: deleteError } = await supabase
        .from("patient_components")
        .delete()
        .eq("patient_id", patientId)
      if (deleteError) throw deleteError

      // Batch insert 3 priority components
      const { error: insertError } = await supabase
        .from("patient_components")
        .insert(
          selected.map((comp, i) => ({
            patient_id: patientId,
            component_name: comp,
            priority_order: i + 1,
          }))
        )
      if (insertError) throw insertError

      // Update user profile with all preferences atomically
      const { error: updateError } = await supabase
        .from("users")
        .update({
          has_selected_components: true,
          gender,
          takes_chronic_medication: takesMedication,
          wants_salud_sexual: gender === 'male' ? (wantsSaludSexual ?? false) : false,
        })
        .eq("id", patientId)
      if (updateError) throw updateError

      onComplete?.()
      router.refresh()
    } catch (err) {
      console.error("Error saving components:", err)
      alert("Error al guardar la selección. Intente de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  // ─── Shared header ─────────────────────────────────────────────────────────
  const stepLabels = ['Tu perfil', 'Prioridades', 'Últimas preguntas']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl my-auto shrink-0">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-5">
          <h2 className="text-xl font-bold text-white">Personaliza tu ruta de salud</h2>
          {/* Step indicators */}
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === s
                      ? "bg-white text-[#06559F]"
                      : step > s
                        ? "bg-white/40 text-white"
                        : "bg-white/20 text-white/60"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-xs ${step === s ? "text-white font-medium" : "text-white/60"}`}>
                  {stepLabels[s - 1]}
                </span>
                {s < 3 && <div className="mx-1 h-px w-4 bg-white/30" />}
              </div>
            ))}
          </div>
        </div>

        {/* ─── STEP 1: Género ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="px-6 py-6">
            <h3 className="text-base font-semibold text-neutral mb-1">¿Cuál es tu sexo biológico?</h3>
            <p className="text-sm text-tertiary mb-5">
              Esta información nos ayuda a personalizar tu programa de salud.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {([['male', 'Hombre', '♂'], ['female', 'Mujer', '♀']] as const).map(([value, label, icon]) => (
                <button
                  key={value}
                  onClick={() => setGender(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition-all ${
                    gender === value
                      ? "border-[#06559F] bg-[#06559F]/5 shadow-sm"
                      : "border-gray-200 hover:border-[#1E8DCE]/50 hover:bg-[#1E8DCE]/5"
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  <span className={`text-sm font-semibold ${gender === value ? "text-[#06559F]" : "text-neutral"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!canGoToStep2()}
                className="w-full rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Prioridades ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="px-6 py-5">
            <div className="mb-4 rounded-xl border-2 border-[#1E8DCE]/20 bg-[#06559F]/5 p-3.5">
              <p className="text-sm font-medium text-[#06559F] leading-relaxed">
                &ldquo;Revisa tu reporte de salud digital en la sección <em>Componentes clave a trabajar</em> y selecciona en orden tus 3 prioridades.&rdquo;
              </p>
            </div>

            {/* Selected order indicator */}
            <div className="mb-4 flex gap-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`flex flex-1 items-center gap-1.5 rounded-xl border-2 px-2.5 py-2 transition-all ${
                    selected[n - 1]
                      ? "border-[#06559F] bg-[#06559F]/5"
                      : "border-dashed border-gray-300"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      selected[n - 1] ? "bg-[#06559F] text-white" : "bg-gray-100 text-gray-400"
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
            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
              {AVAILABLE_COMPONENTS.map((comp) => {
                const idx = selected.indexOf(comp)
                const isSelected = idx !== -1
                const isDisabled = !isSelected && selected.length >= 3

                return (
                  <button
                    key={comp}
                    onClick={() => handleSelect(comp)}
                    disabled={isDisabled}
                    className={`relative flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all ${
                      isSelected
                        ? "border-[#06559F] bg-[#06559F]/5 text-[#06559F] shadow-sm"
                        : isDisabled
                          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          : "border-gray-200 bg-white text-neutral hover:border-[#1E8DCE]/50 hover:bg-[#1E8DCE]/5"
                    }`}
                  >
                    {isSelected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#06559F] text-[9px] font-bold text-white">
                        {idx + 1}°
                      </span>
                    )}
                    <span className={`text-xs font-medium ${isSelected ? "" : "pl-0.5"}`}>{comp}</span>
                  </button>
                )
              })}
            </div>

            {/* Medication question */}
            <div className="mt-4 rounded-xl border-2 border-[#1E8DCE]/20 bg-[#1E8DCE]/5 p-4">
              <p className="text-sm font-medium text-[#06559F] mb-3">
                ¿En este momento toma algún medicamento de forma crónica?
              </p>
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setTakesMedication(val)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      takesMedication === val
                        ? "border-[#06559F] bg-[#06559F] text-white"
                        : "border-gray-300 bg-white text-gray-600 hover:border-[#1E8DCE]"
                    }`}
                  >
                    {val ? "Sí" : "No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canGoToStep3()}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selected.length < 3
                  ? `Selecciona ${3 - selected.length} más`
                  : takesMedication === null
                    ? "Responde la pregunta de medicamentos"
                    : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Salud sexual + confirmar ───────────────────────────────── */}
        {step === 3 && (
          <div className="px-6 py-5">

            {/* Salud Sexual — solo para hombres */}
            {gender === 'male' && (
              <div className="mb-5 rounded-xl border-2 border-[#1E8DCE]/20 bg-[#1E8DCE]/5 p-4">
                <p className="text-sm font-medium text-[#06559F] mb-1">
                  ¿Deseas incluir el módulo de <strong>Salud Sexual Masculina</strong> en tu ruta?
                </p>
                <p className="text-xs text-tertiary mb-3">
                  Este módulo aborda temas de salud sexual específicos para hombres.
                </p>
                <div className="flex gap-3">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => setWantsSaludSexual(val)}
                      className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        wantsSaludSexual === val
                          ? "border-[#06559F] bg-[#06559F] text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-[#1E8DCE]"
                      }`}
                    >
                      {val ? "Sí" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview de ruta */}
            <div className="rounded-xl bg-[#06559F]/5 border border-[#06559F]/20 p-4 mb-5">
              <p className="text-sm font-semibold text-[#06559F] mb-2">Tu ruta personalizada incluirá:</p>
              <ol className="space-y-1">
                {[
                  "Inicio de ciclo: Tu mapa de salud",
                  "El incendio que vamos a apagar",
                  ...selected.map((s, i) => `Prioridad ${i + 1}: ${s}`),
                  ...(takesMedication ? ["Acceso y adherencia a medicamentos"] : []),
                  ...(gender === 'male' && wantsSaludSexual ? ["Salud Sexual Masculina"] : []),
                  "...módulos restantes...",
                  "Cierre de ciclo",
                ].map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#06559F]/20 text-[9px] font-bold text-[#06559F]">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Atrás
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave()}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Guardando..."
                  : gender === 'male' && wantsSaludSexual === null
                    ? "Responde la pregunta de Salud Sexual"
                    : "Guardar ruta de salud"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
