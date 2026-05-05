import Link from "next/link"
import { getAdminAlerts } from "@/lib/scheduling/admin-alerts"

export default async function DashboardAlerts() {
  const alerts = await getAdminAlerts()
  const items: { kind: "danger" | "warning"; message: React.ReactNode }[] = []

  if (alerts.orphanedCount > 0) {
    items.push({
      kind: "danger",
      message: (
        <>
          <strong>{alerts.orphanedCount} cita(s) huérfana(s)</strong> requieren reasignación manual (clínico desactivado).{" "}
          <Link href="/admin/citas/tabla?estado=scheduled" className="underline font-medium">
            Ver tabla de citas
          </Link>
        </>
      ),
    })
  }

  if (alerts.patientsWithCreditsAndNoSlots > 0) {
    items.push({
      kind: "warning",
      message: (
        <>
          <strong>{alerts.patientsWithCreditsAndNoSlots} paciente(s) con créditos</strong> sin disponibilidad en los próximos 30 días. Considera abrir más horarios.
        </>
      ),
    })
  }

  if (items.length === 0) return null

  return (
    <section className="space-y-2 mb-6">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl border px-4 py-3 text-sm ${
            item.kind === "danger"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {item.message}
        </div>
      ))}
    </section>
  )
}
