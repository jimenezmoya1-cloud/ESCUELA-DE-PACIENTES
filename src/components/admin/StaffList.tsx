"use client"

import { useTransition } from "react"
import { toggleStaffActive } from "@/app/(admin)/admin/personal/actions"
import DeactivateClinicianButton from "@/components/admin/DeactivateClinicianButton"

type StaffMember = {
  id: string
  name: string
  email: string
  role: "admin" | "clinico"
  profession: "medico" | "enfermero" | "otro" | null
  specialty: string | null
  medical_registration: string | null
  is_active: boolean
}

export default function StaffList({ staff }: { staff: StaffMember[] }) {
  const [pending, startTransition] = useTransition()

  function handleToggle(id: string, nextValue: boolean) {
    startTransition(async () => {
      await toggleStaffActive(id, nextValue)
    })
  }

  if (staff.length === 0) {
    return <p className="text-tertiary">No hay personal registrado todavía.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-tertiary/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-background text-left text-xs uppercase tracking-wide text-tertiary">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Profesión</th>
            <th className="px-4 py-3">Registro</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tertiary/10">
          {staff.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3 capitalize">{s.role}</td>
              <td className="px-4 py-3 capitalize">
                {s.profession ?? "—"}
                {s.specialty ? ` · ${s.specialty}` : ""}
              </td>
              <td className="px-4 py-3">{s.medical_registration ?? "—"}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3">
                {/* Active clínicos: only deactivate via DeactivateClinicianButton (which fires
                    notifications). The plain toggle would skip post-deactivation notify. */}
                {s.role === "clinico" && s.is_active ? (
                  // Active clinico: hide the toggle pill — DeactivateClinicianButton (added in Plan 5)
                  // is the only path. We still show a static "Activo" label so the column isn't blank.
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Activo
                  </span>
                ) : (
                  // All other cases (inactive users, admins, etc.): keep the toggle for activate/deactivate
                  <button
                    onClick={() => handleToggle(s.id, !s.is_active)}
                    disabled={pending}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      s.is_active
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-tertiary/10 text-tertiary hover:bg-tertiary/20"
                    }`}
                  >
                    {s.is_active ? "Activo" : "Inactivo"}
                  </button>
                )}
              </td>
              <td className="px-4 py-3">
                {s.role === "clinico" && s.is_active && (
                  <DeactivateClinicianButton clinicianId={s.id} clinicianName={s.name} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
