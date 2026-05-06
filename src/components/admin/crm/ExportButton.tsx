'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Lead } from '@/types/database'

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export default function ExportButton({ leads }: { leads: Lead[] }) {
  const handleExport = () => {
    const rows = leads.map(l => ({
      Nombre: `${l.nombre} ${l.apellido}`,
      Cédula: l.cedula,
      Edad: calcAge(l.fecha_nacimiento),
      Teléfono: l.telefono,
      Email: l.email ?? '',
      Score: l.score_parcial,
      Nivel: l.nivel,
      Condiciones: l.enfermedades.join(', '),
      Estado: l.estado,
      'Fecha registro': new Date(l.created_at).toLocaleDateString('es-CO'),
      'Último contacto': l.ultimo_contacto_at ? new Date(l.ultimo_contacto_at).toLocaleDateString('es-CO') : '',
      Intentos: l.intentos_contacto,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `caimed-leads-${date}.xlsx`)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Download className="h-4 w-4" />
      Exportar
    </button>
  )
}
