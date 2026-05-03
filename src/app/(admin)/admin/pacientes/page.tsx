import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { calculateProgress, formatDate } from "@/lib/modules"
import UserAccessToggle from "@/components/admin/UserAccessToggle"
import NewPatientButton from "@/components/admin/NewPatientButton"
import ClinicalExportButton from "@/components/admin/ClinicalExportButton"
import ClinicalBackupPanel, { type BackupLogRow } from "@/components/admin/ClinicalBackupPanel"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

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
    <tr className={`hover:bg-background/30 ${!patient.is_active ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-neutral">{patient.name}</p>
        <p className="text-xs text-tertiary">
          {isPlaceholder ? (
            <span className="italic text-tertiary/70">Pendiente de registro</span>
          ) : (
            patient.email
          )}
        </p>
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
          <span className="text-tertiary/60">—</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-tertiary md:table-cell">
        {formatDate(patient.registered_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-tertiary">{completed}/{totalModules}</span>
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
        <Link
          href={`/admin/pacientes/${patient.id}`}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/10"
        >
          Ver detalle
        </Link>
      </td>
    </tr>
  )
}

function PatientsTable({
  title,
  badge,
  patients,
  totalModules,
  completionsByUser,
  emptyMsg,
}: {
  title: string
  badge: string
  patients: Patient[]
  totalModules: number
  completionsByUser: Map<string, number>
  emptyMsg: string
}) {
  return (
    <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-tertiary/10 px-5 py-4">
        <h2 className="font-semibold text-neutral">{title}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      </div>
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tertiary/10">
            {patients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-tertiary">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              patients.map((p) => (
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

  if (convenio && convenio !== "todos") query = query.eq("convenio_code", convenio)
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
  const conConvenio = allPatients.filter((p) => !!p.convenio_code)
  const sinConvenio = allPatients.filter((p) => !p.convenio_code)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Pacientes</h1>
          <p className="text-sm text-tertiary">{allPatients.length} pacientes encontrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewPatientButton convenios={convenios ?? []} />
          <a
            href={`/api/admin/export-patients-excel${convenio ? `?convenio=${convenio}` : ""}`}
            download="pacientes-caimed.xlsx"
            className="flex w-fit items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar progreso de Escuela
          </a>
        </div>
      </div>

      <div className="mb-6">
        <ClinicalExportButton
          convenios={convenios ?? []}
          staff={(staff ?? []) as { id: string; name: string }[]}
        />
      </div>

      <div className="mb-6">
        <ClinicalBackupPanel
          initialLogs={(backupLogs ?? []) as BackupLogRow[]}
          isAdmin={isAdmin(currentProfile)}
        />
      </div>

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-tertiary">Convenio</label>
          <select
            name="convenio"
            defaultValue={convenio ?? "todos"}
            className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          >
            <option value="todos">Todos los convenios</option>
            {convenios?.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
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
          <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90">
            Filtrar
          </button>
          <a href="/admin/pacientes" className="rounded-lg border border-tertiary/30 px-4 py-2 text-sm text-tertiary hover:bg-background">
            Limpiar
          </a>
        </div>
      </form>

      <PatientsTable
        title="Con convenio"
        badge={`${conConvenio.length}`}
        patients={conConvenio}
        totalModules={totalModules}
        completionsByUser={completionsByUser}
        emptyMsg="No hay pacientes con convenio."
      />

      <PatientsTable
        title="Sin convenio"
        badge={`${sinConvenio.length}`}
        patients={sinConvenio}
        totalModules={totalModules}
        completionsByUser={completionsByUser}
        emptyMsg="No hay pacientes sin convenio."
      />
    </div>
  )
}
