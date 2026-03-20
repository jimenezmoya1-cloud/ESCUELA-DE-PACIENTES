import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { calculateProgress, formatDate } from "@/lib/modules"

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data: patients } = await supabase
    .from("users")
    .select("*")
    .eq("role", "patient")
    .order("registered_at", { ascending: false })

  const { data: modules } = await supabase
    .from("modules")
    .select("id")
    .eq("is_published", true)

  const totalModules = modules?.length ?? 0

  // Obtener completaciones por paciente
  const { data: allCompletions } = await supabase
    .from("module_completions")
    .select("user_id")

  const completionsByUser = new Map<string, number>()
  allCompletions?.forEach((c) => {
    completionsByUser.set(c.user_id, (completionsByUser.get(c.user_id) ?? 0) + 1)
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral">Pacientes</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {patients?.length ?? 0} registrados
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-tertiary/10 bg-background/50">
                <th className="px-4 py-3 font-medium text-tertiary">Nombre</th>
                <th className="px-4 py-3 font-medium text-tertiary">Email</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary md:table-cell">Código</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary sm:table-cell">Registro</th>
                <th className="px-4 py-3 font-medium text-tertiary">Progreso</th>
                <th className="px-4 py-3 font-medium text-tertiary"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/10">
              {patients?.map((patient) => {
                const completed = completionsByUser.get(patient.id) ?? 0
                const progress = calculateProgress(totalModules, completed)
                return (
                  <tr key={patient.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-neutral">{patient.name}</td>
                    <td className="px-4 py-3 text-tertiary">{patient.email}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-tertiary md:table-cell">
                      {patient.access_code_used ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-tertiary sm:table-cell">
                      {formatDate(patient.registered_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-tertiary">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pacientes/${patient.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!patients || patients.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-tertiary">
                    No hay pacientes registrados aún.
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
