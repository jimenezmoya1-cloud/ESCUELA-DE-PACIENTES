import { createClient } from "@/lib/supabase/server"
import ConvenioManager from "@/components/admin/ConvenioManager"

export default async function ConveniosPage() {
  const supabase = await createClient()

  const { data: convenios } = await supabase
    .from("convenios")
    .select("*")
    .order("created_at", { ascending: true })

  // Métricas por convenio
  const { data: patientsByConvenio } = await supabase
    .from("users")
    .select("convenio_code")
    .eq("role", "patient")

  const countByConvenio = new Map<string, number>()
  patientsByConvenio?.forEach((p) => {
    const code = p.convenio_code ?? "sin_convenio"
    countByConvenio.set(code, (countByConvenio.get(code) ?? 0) + 1)
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Convenios</h1>
          <p className="text-sm text-tertiary">Gestione los convenios empresariales y sus métricas</p>
        </div>
      </div>

      {/* Cards por convenio */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {convenios?.map((conv) => (
          <div key={conv.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {conv.code}
                </span>
                <p className="mt-2 font-semibold text-neutral">{conv.name}</p>
              </div>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                conv.is_active ? "bg-success/10 text-success" : "bg-tertiary/10 text-tertiary"
              }`}>
                {conv.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-4 border-t border-tertiary/10 pt-3">
              <p className="text-2xl font-bold text-secondary">
                {countByConvenio.get(conv.code) ?? 0}
              </p>
              <p className="text-xs text-tertiary">pacientes registrados</p>
            </div>
          </div>
        ))}
      </div>

      {/* Crear / gestionar convenios */}
      <ConvenioManager convenios={convenios ?? []} />
    </div>
  )
}
