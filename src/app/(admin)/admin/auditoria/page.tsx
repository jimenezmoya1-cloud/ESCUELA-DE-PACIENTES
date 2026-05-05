import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { createAdminClient } from "@/lib/supabase/admin"
import AuditLogTable from "@/components/admin/AuditLogTable"

export const dynamic = "force-dynamic"

interface SearchParams {
  action?: string
  target_type?: string
  page?: string
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const limit = 50
  const offset = (page - 1) * limit

  const admin = createAdminClient()
  let query = admin
    .from("audit_log")
    .select("*, actor:users!actor_id(name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (sp.action) query = query.eq("action", sp.action)
  if (sp.target_type) query = query.eq("target_type", sp.target_type)

  const { data, count } = await query

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    actor_id: r.actor_id,
    actor_name: r.actor?.name ?? (r.actor_id ? "(usuario eliminado)" : "(sistema)"),
    actor_email: r.actor?.email ?? null,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    metadata: r.metadata,
    created_at: r.created_at,
  }))

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Auditoría</h1>
        <p className="text-sm text-tertiary">
          Registro de acciones críticas del sistema. Solo lectura.
        </p>
      </header>

      <AuditLogTable rows={rows} totalCount={count ?? 0} page={page} pageSize={limit} />
    </div>
  )
}
