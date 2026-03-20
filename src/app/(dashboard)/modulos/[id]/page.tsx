import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import ModuleContent from "@/components/dashboard/ModuleContent"
import type { Module, ContentBlock, ModuleCompletion } from "@/types/database"

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

  // Verificar que el módulo está desbloqueado para el usuario
  const { data: profile } = await supabase
    .from("users")
    .select("registered_at")
    .eq("id", user.id)
    .single()

  if (profile) {
    const regDate = new Date(profile.registered_at)
    const unlockDate = new Date(regDate)
    unlockDate.setDate(unlockDate.getDate() + module.days_to_unlock)

    if (new Date() < unlockDate) {
      redirect("/mi-camino")
    }
  }

  // Obtener bloques de contenido
  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("module_id", id)
    .order("order", { ascending: true })

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

  // Obtener envío de tarea existente
  const { data: taskSubmission } = await supabase
    .from("task_submissions")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <div>
      {/* Encabezado del módulo */}
      <div className="mb-8">
        <a
          href="/mi-camino"
          className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Mi Camino
        </a>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-secondary">Módulo {module.order}</span>
            <h1 className="mt-1 text-2xl font-bold text-neutral">{module.title}</h1>
            {module.short_description && (
              <p className="mt-2 text-tertiary">{module.short_description}</p>
            )}
          </div>
          {completion && (
            <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
              Completado
            </span>
          )}
        </div>
      </div>

      {/* Bloques de contenido */}
      <ModuleContent
        moduleId={id}
        blocks={(blocks as ContentBlock[]) ?? []}
        isCompleted={!!completion}
        existingQuizResponses={quizResponses ?? []}
        existingTaskSubmission={taskSubmission ?? null}
      />
    </div>
  )
}
