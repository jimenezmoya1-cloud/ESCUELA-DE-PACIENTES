import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/modules"
import CreateCodeForm from "@/components/admin/CreateCodeForm"

export default async function CodigosPage() {
  const supabase = await createClient()

  const [{ data: codes }, { data: convenios }] = await Promise.all([
    supabase
      .from("access_codes")
      .select("*, users:used_by_user_id(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("convenios")
      .select("code, name")
      .eq("is_active", true)
      .order("code"),
  ])

  const usedCount = codes?.filter((c) => c.is_used).length ?? 0
  const totalCount = codes?.length ?? 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Códigos de Acceso</h1>
          <p className="text-sm text-tertiary">Formato: CONVENIO + CÉDULA → ej. BMG11875625</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {usedCount}/{totalCount} usados
        </span>
      </div>

      <CreateCodeForm convenios={convenios ?? []} />

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-tertiary/10 px-5 py-4">
          <h2 className="font-semibold text-neutral">Todos los códigos</h2>
          <a
            href="/api/admin/export-codes"
            download="codigos-caimed.csv"
            className="rounded-lg bg-background px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-tertiary/10"
          >
            Exportar CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-tertiary/10 bg-background/50">
                <th className="px-4 py-3 font-medium text-tertiary">Código</th>
                <th className="px-4 py-3 font-medium text-tertiary">Convenio</th>
                <th className="px-4 py-3 font-medium text-tertiary">Estado</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary sm:table-cell">Paciente</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary md:table-cell">Fecha de uso</th>
                <th className="px-4 py-3 font-medium text-tertiary">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/10">
              {codes?.map((code) => (
                <tr key={code.id} className="hover:bg-background/30">
                  <td className="px-4 py-3 font-mono text-sm font-bold text-neutral">
                    {code.code}
                  </td>
                  <td className="px-4 py-3">
                    {code.convenio_code ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                        {code.convenio_code}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      code.is_used ? "bg-tertiary/10 text-tertiary" : "bg-success/10 text-success"
                    }`}>
                      {code.is_used ? "Usado" : "Disponible"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-tertiary sm:table-cell">
                    {(code.users as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-tertiary md:table-cell">
                    {code.used_at ? formatDate(code.used_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-tertiary">
                    {formatDate(code.created_at)}
                  </td>
                </tr>
              ))}
              {(!codes || codes.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-tertiary">
                    No hay códigos aún. Cree el primero arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
