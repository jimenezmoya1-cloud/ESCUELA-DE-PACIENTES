import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { calculateProgress, formatDate } from "@/lib/modules"
import UserAccessToggle from "@/components/admin/UserAccessToggle"
import NewPatientButton from "@/components/admin/NewPatientButton"
import ClinicalExportButton from "@/components/admin/ClinicalExportButton"
import ClinicalBackupPanel, { type BackupLogRow } from "@/components/admin/ClinicalBackupPanel"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { FileHeart, FileText, ChevronRight, Download } from "lucide-react"

interface Patient {
  id: string
  name: string
  email: string
  cedula: string | null
  convenio_code: string | null
  registered_at: string
  is_active: boolean | null
}

function PatientRow({
  patient,
  totalModules,
  completed,
}: {
  patient: Patient
  totalModules: number
  completed: number
}) {
  const progress = calculateProgress(totalModules, completed)
  const isPlaceholder = patient.email.endsWith("@caimed.local")
  return (
    <tr className={`group transition-colors hover:bg-background/40 ${!patient.is_active ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <Link href={`/admin/pacientes/${patient.id}`} className="block">
          <p className="font-medium text-neutral group-hover:text-primary">{patient.name}</p>
          <p className="text-xs text-tertiary">
            {isPlaceholder ? (
              <span className="italic text-tertiary/70">Pendiente de registro</span>
            ) : (
              patient.email
            )}
          </p>
        </Link>
      </td>
      <td className="hidden px-4 py-3 font-mono text-xs text-tertiary xl:table-cell">
        {patient.cedula ?? "—"}
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        {patient.convenio_code ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
            {patient.convenio_code}
          </span>
        ) : (
          <span className="text-xs text-tertiary/60 italic">Sin convenio</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-tertiary md:table-cell">
        {formatDate(patient.registered_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-tertiary tabular-nums">{completed}/{totalModules}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <UserAccessToggle
          userId={patient.id}
          initialActive={patient.is_active ?? true}
          patientName={patient.name}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/pacientes/${patient.id}/historia-clinica?mode=new`}
            title="Nueva evaluación de salud"
            className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success hover:text-white"
          >
            <FileHeart className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Nueva</span>
          </Link>
          <Link
            href={`/admin/pacientes/${patient.id}/historia-clinica`}
            title="Ver evaluaciones"
            className="inline-flex items-center gap-1 rounded-lg bg-secondary/10 px-2 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary hover:text-white"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Evaluaciones</span>
          </Link>
          <Link
            href={`/admin/pacientes/${patient.id}`}
            title="Ver detalle"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-background hover:text-neutral"
          >
            <span className="hidden xl:inline">Detalle</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ convenio?: string; cedula?: string }>
}) {
  const { convenio, cedula } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("users")
    .select("id, name, email, cedula, convenio_code, registered_at, is_active")
    .eq("role", "patient")
    .order("registered_at", { ascending: false })

  if (convenio && convenio !== "todos") {
    if (convenio === "sin") query = query.is("convenio_code", null)
    else query = query.eq("convenio_code", convenio)
  }
  if (cedula?.trim()) query = query.ilike("cedula", `%${cedula.trim()}%`)

  const currentProfile = await getCurrentProfile()

  const [
    { data: patients },
    { data: modules },
    { data: allCompletions },
    { data: convenios },
    { data: staff },
    { data: backupLogs },
  ] = await Promise.all([
    query,
    supabase.from("modules").select("id").eq("is_published", true),
    supabase.from("module_completions").select("user_id"),
    supabase.from("convenios").select("code, name").eq("is_active", true).order("code"),
    supabase
      .from("users")
      .select("id, name")
      .in("role", ["admin", "clinico"])
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("backup_logs")
      .select("id, triggered_at, triggered_by, status, file_url, rows_exported, error_message, duration_ms")
      .order("triggered_at", { ascending: false })
      .limit(10),
  ])

  const totalModules = modules?.length ?? 0
  const completionsByUser = new Map<string, number>()
  allCompletions?.forEach((c) => {
    completionsByUser.set(c.user_id, (completionsByUser.get(c.user_id) ?? 0) + 1)
  })

  const allPatients = (patients ?? []) as Patient[]
  const conConvenio = allPatients.filter((p) => !!p.convenio_code).length
  const sinConvenio = allPatients.filter((p) => !p.convenio_code).length

  return (
    <div>
      {/* Header + acciones primarias */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Pacientes</h1>
          <p className="text-sm text-tertiary">
            {allPatients.length} encontrados · {conConvenio} con convenio · {sinConvenio} sin convenio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewPatientButton convenios={convenios ?? []} />
          <a
            href={`/api/admin/export-patients-excel${convenio ? `?convenio=${convenio}` : ""}`}
            download="pacientes-caimed.xlsx"
            className="flex w-fit items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </a>
        </div>
      </div>

      {/* Filtros sticky */}
      <form
        method="GET"
        className="sticky top-0 z-10 mb-6 -mx-1 flex flex-wrap items-end gap-3 rounded-xl border border-tertiary/10 bg-white/80 p-4 shadow-sm backdrop-blur-md"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-tertiary">Convenio</label>
          <select
            name="convenio"
            defaultValue={convenio ?? "todos"}
            className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          >
            <option value="todos">Todos los convenios</option>
            <option value="sin">Sin convenio</option>
            {convenios?.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-tertiary">Buscar por cédula</label>
          <input
            type="text"
            name="cedula"
            defaultValue={cedula ?? ""}
            placeholder="Número de cédula..."
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90">
            Filtrar
          </button>
          <a href="/admin/pacientes" className="rounded-lg border border-tertiary/30 px-4 py-2 text-sm text-tertiary transition-colors hover:bg-background">
            Limpiar
          </a>
        </div>
      </form>

      {/* Herramientas administrativas colapsables */}
      <details className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-neutral hover:text-primary">
          Herramientas administrativas
        </summary>
        <div className="mt-4 space-y-4">
          <ClinicalExportButton
            convenios={convenios ?? []}
            staff={(staff ?? []) as { id: string; name: string }[]}
          />
          <ClinicalBackupPanel
            initialLogs={(backupLogs ?? []) as BackupLogRow[]}
            isAdmin={isAdmin(currentProfile)}
          />
        </div>
      </details>

      {/* Tabla unificada */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-tertiary/10 bg-background/50">
                <th className="px-4 py-3 font-medium text-tertiary">Nombre</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary xl:table-cell">Cédula</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary lg:table-cell">Convenio</th>
                <th className="hidden px-4 py-3 font-medium text-tertiary md:table-cell">Registro</th>
                <th className="px-4 py-3 font-medium text-tertiary">Progreso</th>
                <th className="px-4 py-3 font-medium text-tertiary">Acceso</th>
                <th className="px-4 py-3 text-right font-medium text-tertiary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/10">
              {allPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-tertiary">No hay pacientes que coincidan con los filtros.</p>
                    {(convenio || cedula) && (
                      <a href="/admin/pacientes" className="mt-2 inline-block text-sm text-primary hover:underline">
                        Limpiar filtros
                      </a>
                    )}
                  </td>
                </tr>
              ) : (
                allPatients.map((p) => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    totalModules={totalModules}
                    completed={completionsByUser.get(p.id) ?? 0}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
