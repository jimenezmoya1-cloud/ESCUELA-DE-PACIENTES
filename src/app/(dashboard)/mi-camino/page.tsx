import { createClient } from "@/lib/supabase/server"
import { getModulesWithStatus } from "@/lib/modules"
import ModuleRoadmap from "@/components/dashboard/ModuleRoadmap"

export default async function MiCaminoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("users")
    .select("registered_at")
    .eq("id", user!.id)
    .single()

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order", { ascending: true })

  const { data: completions } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", user!.id)

  const modulesWithStatus = getModulesWithStatus(
    modules ?? [],
    completions ?? [],
    profile?.registered_at ?? new Date().toISOString()
  )

  // Encontrar la siguiente tarea pendiente
  const currentModule = modulesWithStatus.find((m) => m.status === "current")

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral">Mi Camino</h1>
        <p className="mt-1 text-sm text-tertiary">
          Su programa de salud cardiovascular en 14 módulos
        </p>
      </div>

      <ModuleRoadmap modules={modulesWithStatus} />

      {/* Card fija: Siguiente tarea */}
      {currentModule && (
        <div className="fixed bottom-20 left-4 right-4 z-20 lg:bottom-6 lg:left-auto lg:right-8 lg:w-80">
          <a
            href={`/modulos/${currentModule.id}`}
            className="flex items-center gap-3 rounded-xl bg-primary p-4 text-white shadow-lg transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70">Siguiente lección</p>
              <p className="truncate text-sm font-medium">{currentModule.title}</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}
