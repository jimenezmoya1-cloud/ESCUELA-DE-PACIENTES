import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import ModuleReorder from "@/components/admin/ModuleReorder"

export default async function ContenidoPage() {
  const supabase = await createClient()

  const { data: modules } = await supabase
    .from("modules")
    .select("*, content_blocks(id)")
    .order("order", { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral">Gestión de Contenido</h1>
        <Link
          href="/admin/contenido/nuevo"
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
        >
          + Nuevo módulo
        </Link>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-tertiary/10 px-5 py-4">
          <h2 className="font-semibold text-neutral">
            Módulos ({modules?.length ?? 0})
          </h2>
        </div>

        <ModuleReorder
          modules={(modules ?? []).map((m) => ({
            id: m.id,
            title: m.title,
            order: m.order,
            days_to_unlock: m.days_to_unlock,
            is_published: m.is_published,
            blocksCount: (m.content_blocks as { id: string }[])?.length ?? 0,
          }))}
        />
      </div>
    </div>
  )
}
