import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import ModuleContent from "@/components/dashboard/ModuleContent"
import type { ContentBlock } from "@/types/database"

export default async function ModulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Obtener módulo
  const { data: module } = await supabase
    .from("modules")
    .select("*")
    .eq("id", id)
    .single()

  if (!module) notFound()

  // Check if module is unlocked for this patient
  // Module 1 is always unlocked
  const isModule1 = module.order === 1

  if (!isModule1) {
    const { data: unlock } = await supabase
      .from("patient_module_unlocks")
      .select("*")
      .eq("patient_id", user.id)
      .eq("module_id", id)
      .single()

    if (!unlock) {
      redirect("/mi-camino")
    }
  }

  // Obtener bloques de contenido
  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("module_id", id)
    .order("order", { ascending: true })

  // Get submodules
  const { data: submodules } = await supabase
    .from("submodules")
    .select("*")
    .eq("module_id", id)
    .order("sort_order", { ascending: true })

  // Get submodule completions
  const { data: submoduleCompletions } = await supabase
    .from("submodule_completions")
    .select("*")
    .eq("user_id", user.id)
    .in("submodule_id", (submodules ?? []).map((s) => s.id))

  // Verificar si ya fue completado
  const { data: completion } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", id)
    .single()

  // Obtener respuestas de quiz existentes
  const { data: quizResponses } = await supabase
    .from("quiz_responses")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", id)

  // Get module PDFs
  const { data: modulePdfs } = await supabase
    .from("module_pdfs")
    .select("*")
    .eq("module_id", id)
    .order("created_at", { ascending: true })

  // Calculate progress
  const totalSubs = submodules?.length ?? 0
  const completedSubs = submoduleCompletions?.length ?? 0
  const progressPercent = totalSubs > 0
    ? Math.round((completedSubs / totalSubs) * 100)
    : (completion ? 100 : 0)

  return (
    <div>
      {/* Encabezado del módulo */}
      <div className="mb-8">
        <a
          href="/mi-camino"
          className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-[#06559F]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Mi Camino
        </a>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-[#1E8DCE]">Módulo {module.order}</span>
            <h1 className="mt-1 text-3xl font-bold text-[#212B52]">{module.title}</h1>
            {module.short_description && (
              <p className="mt-2 text-base text-tertiary">{module.short_description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Progress ring */}
            {totalSubs > 0 && (
              <div className="relative inline-flex items-center justify-center" style={{ width: 56, height: 56 }}>
                <svg width={56} height={56} className="-rotate-90">
                  <circle cx={28} cy={28} r={23} fill="none" stroke="#E5E7EB" strokeWidth={5} />
                  <circle
                    cx={28} cy={28} r={23} fill="none"
                    stroke={progressPercent === 100 ? "#58AE33" : "#06559F"}
                    strokeWidth={5}
                    strokeDasharray={2 * Math.PI * 23}
                    strokeDashoffset={2 * Math.PI * 23 - (progressPercent / 100) * 2 * Math.PI * 23}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${progressPercent === 100 ? "text-[#58AE33]" : "text-[#06559F]"}`}>
                  {progressPercent}%
                </span>
              </div>
            )}
            {completion && (
              <span className="shrink-0 rounded-full bg-[#58AE33]/10 px-3 py-1 text-sm font-medium text-[#58AE33]">
                Completado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Submodules progress bar */}
      {totalSubs > 0 && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-[#212B52]">Progreso del módulo</span>
            <span className="text-tertiary">{completedSubs}/{totalSubs} secciones</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? "linear-gradient(90deg, #58AE33, #067F36)"
                  : "linear-gradient(90deg, #06559F, #1E8DCE)"
              }}
            />
          </div>
        </div>
      )}

      {/* Bloques de contenido */}
      <ModuleContent
        moduleId={id}
        blocks={(blocks as ContentBlock[]) ?? []}
        isCompleted={!!completion}
        existingQuizResponses={quizResponses ?? []}
        submodules={submodules ?? []}
        submoduleCompletions={submoduleCompletions ?? []}
        modulePdfs={modulePdfs ?? []}
      />
    </div>
  )
}
