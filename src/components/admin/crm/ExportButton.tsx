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
    const fumadorLabels: Record<number, string> = {
      1: 'Nunca', 2: 'Dejó >1 año', 3: 'Dejó <1 año',
      4: 'Ocasional', 5: 'Diario', 6: 'Vapeador',
    }
    const accesoLabels: Record<number, string> = {
      1: 'Siempre los consigo', 2: 'A veces difícil', 3: 'Frecuentemente no',
    }
    const adherenciaLabels: Record<number, string> = {
      1: 'Nunca olvida', 2: 'A veces olvida', 3: 'No toma medicamentos',
    }

    const rows = leads.map(l => ({
      'Fecha registro': new Date(l.created_at).toLocaleDateString('es-CO'),
      Nombre: l.nombre,
      Apellido: l.apellido,
      Cédula: l.cedula,
      'Fecha nacimiento': l.fecha_nacimiento,
      Sexo: l.sexo ?? '',
      Edad: calcAge(l.fecha_nacimiento),
      Teléfono: l.telefono,
      Email: l.email ?? '',
      Departamento: l.departamento,
      Municipio: l.municipio,
      'Peso (kg)': l.peso_kg ?? '',
      'Talla (cm)': l.talla_cm ?? '',
      IMC: l.imc ?? '',
      Condiciones: l.enfermedades.join(', '),
      Medicamentos: l.medicamentos_texto ?? '',
      'Acceso medicamentos': l.acceso_medicamentos ? accesoLabels[l.acceso_medicamentos] ?? '' : '',
      Adherencia: l.adherencia_simple ? adherenciaLabels[l.adherencia_simple] ?? '' : '',
      Tabaquismo: l.fumador_nivel ? fumadorLabels[l.fumador_nivel] ?? '' : '',
      'Actividad (min/sem)': l.actividad_minutos ?? '',
      'Sueño (hrs)': l.horas_sueno ?? '',
      Score: l.score_parcial,
      Nivel: l.nivel,
      Estado: l.estado,
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
