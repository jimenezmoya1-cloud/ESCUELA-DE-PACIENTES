import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

// Catálogos numéricos para la hoja "Catálogos" del Excel.
// Mantener sincronizado con Questionnaire.tsx.
const ACCESO_LABELS: Record<number, string> = {
  1: "Sí (entrega total)",
  2: "Parcial",
  3: "No",
}

// Mapeo del select "Razón principal" del cuestionario (código numérico).
// Si el cuestionario evoluciona, agregar las nuevas filas aquí.
const RAZON_PRINCIPAL_LABELS: Record<number, string> = {
  0: "—",
  1: "Económica",
  2: "Disponibilidad/oferta",
  3: "Trámites administrativos",
  4: "Distancia/transporte",
  5: "Falta de información",
  6: "Otro",
}

const NICOTINA_LABELS: Record<number, string> = {
  1: "No fumador",
  2: "Ex-fumador (>5 años)",
  3: "Ex-fumador (1-5 años)",
  4: "Ex-fumador (<1 año)",
  5: "Fumador actual cigarrillo",
  6: "Vapeador / humo segunda mano",
}

// raw_questionnaire en DB es el resultado de Object.fromEntries(URLSearchParams).
// Todas las claves son strings (los URL params siempre son texto).
type RawAssessment = Record<string, string | undefined>

function num(s: string | undefined): number | "" {
  if (s === undefined || s === null || s === "") return ""
  const n = Number(s)
  return Number.isFinite(n) ? n : ""
}

function bool01(s: string | undefined): 0 | 1 {
  return s === "true" ? 1 : 0
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ""
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString("es-CO")
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()
  const isStaff = profile?.is_active && (profile.role === "admin" || profile.role === "clinico")
  if (!isStaff) return NextResponse.json({ error: "Solo personal clínico" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const convenioFilter = searchParams.get("convenio")
  const doctorFilter = searchParams.get("doctor")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  // 1. Pacientes que cumplen el filtro de convenio
  let patientQuery = supabase
    .from("users")
    .select("id, convenio_code")
    .eq("role", "patient")

  if (convenioFilter && convenioFilter !== "todos") {
    patientQuery = patientQuery.eq("convenio_code", convenioFilter)
  }

  const { data: patients } = await patientQuery
  if (!patients || patients.length === 0) {
    return new NextResponse(XLSX.write(buildEmptyWorkbook(), { type: "buffer", bookType: "xlsx" }), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="caimed-evaluaciones-${todayStamp()}.xlsx"`,
      },
    })
  }

  const patientIds = patients.map((p) => p.id)

  // 2. Evaluaciones que cumplen el rango de fechas + médico responsable
  let assessmentQuery = supabase
    .from("patient_assessments")
    .select("id, user_id, created_by, created_at, raw_questionnaire")
    .in("user_id", patientIds)
    .order("created_at", { ascending: false })

  if (doctorFilter && doctorFilter !== "todos") {
    assessmentQuery = assessmentQuery.eq("created_by", doctorFilter)
  }
  if (startDate) assessmentQuery = assessmentQuery.gte("created_at", startDate)
  if (endDate) assessmentQuery = assessmentQuery.lte("created_at", endDate)

  const { data: assessments } = await assessmentQuery
  if (!assessments) {
    return NextResponse.json({ error: "Error consultando evaluaciones" }, { status: 500 })
  }

  // 3. Perfiles clínicos de los pacientes con evaluaciones
  const userIdsWithAssessment = Array.from(new Set(assessments.map((a) => a.user_id)))
  const { data: profiles } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .in("user_id", userIdsWithAssessment)
  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]))

  // 4. Staff (admin + clinico) para resolver "Profesional responsable"
  const staffIds = Array.from(new Set(assessments.map((a) => a.created_by).filter(Boolean) as string[]))
  let staffById = new Map<string, string>()
  if (staffIds.length > 0) {
    const { data: staff } = await supabase
      .from("users")
      .select("id, name")
      .in("id", staffIds)
    staffById = new Map((staff ?? []).map((s) => [s.id, s.name]))
  }

  // 5. Construir filas
  const HEADERS = [
    "Fecha y hora de registro",
    "Profesional responsable",
    "Primer nombre", "Segundo nombre", "Primer apellido", "Segundo apellido",
    "Tipo de documento", "Documento",
    "Fecha de nacimiento", "Teléfono", "Correo", "Género",
    "País de nacimiento", "País de residencia",
    "Departamento", "Municipio", "Dirección",
    "Contacto de emergencia",
    "EPS", "Régimen",
    "MSPSS (Red de apoyo)", "HES (Empoderamiento)",
    "Antecedentes",
    "Toma medicamentos", "Acceso medicamentos", "Razón principal",
    "ARMS (Adherencia)",
    "PA sistólica", "PA diastólica", "FC", "FR", "SatO2",
    "Talla (cm)", "Peso (kg)",
    "Fecha perfil lipídico", "Colesterol total", "LDL", "HDL", "Triglicéridos",
    "Fecha HbA1c", "Valor HbA1c",
    "Tabaquismo", "Nicotina (1-5)",
    "Min actividad física/sem", "Horas sueño/noche",
    "PHQ-9 (Salud mental)", "Alimentación (MEDAS)",
  ]

  const rows: (string | number)[][] = [HEADERS]

  for (const a of assessments) {
    const cp = profileById.get(a.user_id) ?? ({} as Record<string, string | null>)
    const raw = (a.raw_questionnaire ?? {}) as RawAssessment

    const profesional = a.created_by
      ? staffById.get(a.created_by) ?? "(usuario eliminado)"
      : "Auto-diligenciado"

    // Datos personales: priorizar el perfil clínico (más estable). Fallback a raw.
    const primerNombre = cp.primer_nombre ?? raw.primer_nombre ?? ""
    const segundoNombre = cp.segundo_nombre ?? raw.segundo_nombre ?? ""
    const primerApellido = cp.primer_apellido ?? raw.primer_apellido ?? ""
    const segundoApellido = cp.segundo_apellido ?? raw.segundo_apellido ?? ""
    const tipoDoc = cp.tipo_documento ?? raw.tipo_doc ?? ""
    const documento = cp.documento ?? raw.doc ?? ""
    const fechaNac = cp.fecha_nacimiento
      ? formatDate(cp.fecha_nacimiento)
      : raw.fecha_nac ?? ""
    const telefono = cp.telefono ?? raw.telefono ?? ""
    const correo = cp.correo ?? raw.correo ?? ""
    const genero = cp.genero ?? raw.genero ?? raw.sexo ?? ""
    const paisNac = cp.pais_nacimiento ?? raw.pais_nacimiento ?? ""
    const paisRes = cp.pais_residencia ?? raw.pais_residencia ?? ""
    const depto = cp.departamento_residencia ?? raw.depto ?? ""
    const municipio = cp.municipio_residencia ?? raw.municipio ?? ""
    const direccion = cp.direccion_residencia ?? raw.direccion ?? ""
    const eps = cp.aseguradora ?? raw.eps ?? ""
    const regimen = cp.regimen_afiliacion ?? raw.regimen ?? ""
    const emergenciaNombre = cp.contacto_emergencia_nombre ?? raw.emergencia_nombre ?? ""
    const emergenciaParentesco = cp.contacto_emergencia_parentesco ?? raw.emergencia_parentesco ?? ""
    const emergenciaTelefono = cp.contacto_emergencia_telefono ?? raw.emergencia_telefono ?? ""
    const emergencia = [emergenciaNombre, emergenciaParentesco, emergenciaTelefono].filter(Boolean).join(" · ")

    const accesoNum = num(raw.acceso)
    const razonNum = num(raw.med_access_reason)

    rows.push([
      formatDateTime(a.created_at),
      profesional,
      primerNombre, segundoNombre, primerApellido, segundoApellido,
      tipoDoc, documento,
      fechaNac, telefono, correo, genero,
      paisNac, paisRes,
      depto, municipio, direccion,
      emergencia,
      eps, regimen,
      num(raw.red_apoyo),       // MSPSS suma
      num(raw.empoderamiento),  // HES suma
      raw.antecedentes ?? "",
      bool01(raw.takesMeds),
      accesoNum,
      razonNum,
      num(raw.adherencia),      // ARMS suma (con item 12 invertido)
      num(raw.presion_arterial),// sistólica
      num(raw.pad),
      num(raw.hr),
      num(raw.rr),
      num(raw.spo2),
      num(raw.talla),
      num(raw.peso_kg),
      raw.lipid_date ? formatDate(raw.lipid_date) : "",
      num(raw.colesterol_total),
      num(raw.colesterol),      // LDL (entra al algoritmo)
      num(raw.hdl),
      num(raw.triglicéridos),
      raw.hba1c_date ? formatDate(raw.hba1c_date) : "",
      num(raw.glucosa),         // HbA1c %
      bool01(raw.smoked),
      num(raw.nicotina),        // 1-5 ya derivado
      num(raw.actividad),       // min/sem
      num(raw.sueno),           // horas/noche
      num(raw.salud_mental),    // PHQ-9 suma
      num(raw.alimentacion),    // MEDAS suma
    ])
  }

  // 6. Hoja de catálogos
  const catalogRows: (string | number)[][] = [
    ["Columna", "Código", "Significado"],
    ["Toma medicamentos", 0, "No"],
    ["Toma medicamentos", 1, "Sí"],
    ["Tabaquismo", 0, "No"],
    ["Tabaquismo", 1, "Sí"],
  ]
  for (const [code, label] of Object.entries(ACCESO_LABELS)) {
    catalogRows.push(["Acceso medicamentos", Number(code), label])
  }
  for (const [code, label] of Object.entries(RAZON_PRINCIPAL_LABELS)) {
    catalogRows.push(["Razón principal", Number(code), label])
  }
  for (const [code, label] of Object.entries(NICOTINA_LABELS)) {
    catalogRows.push(["Nicotina", Number(code), label])
  }

  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, sheet, "Evaluaciones")
  const catalogSheet = XLSX.utils.aoa_to_sheet(catalogRows)
  XLSX.utils.book_append_sheet(wb, catalogSheet, "Catálogos")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="caimed-evaluaciones-${todayStamp()}.xlsx"`,
    },
  })
}

function buildEmptyWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([["Sin evaluaciones para los filtros aplicados"]])
  XLSX.utils.book_append_sheet(wb, sheet, "Evaluaciones")
  return wb
}
