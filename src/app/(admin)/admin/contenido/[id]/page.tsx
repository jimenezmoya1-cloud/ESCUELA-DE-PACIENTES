import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import ModuleEditor from "@/components/admin/ModuleEditor"

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // "nuevo" es un caso especial para crear
  if (id === "nuevo") {
    return (
      <div>
        <a
          href="/admin/contenido"
          className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a contenido
        </a>
        <h1 className="mb-6 text-2xl font-bold text-neutral">Nuevo Módulo</h1>
        <ModuleEditor module={null} blocks={[]} />
      </div>
    )
  }

  const { data: module } = await supabase
    .from("modules")
    .select("*")
    .eq("id", id)
    .single()

  if (!module) notFound()

  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("module_id", id)
    .order("order", { ascending: true })

  return (
    <div>
      <a
        href="/admin/contenido"
        className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a contenido
      </a>
      <h1 className="mb-6 text-2xl font-bold text-neutral">Editar: {module.title}</h1>
      <ModuleEditor module={module} blocks={blocks ?? []} />
    </div>
  )
}
