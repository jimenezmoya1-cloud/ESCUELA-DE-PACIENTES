import * as XLSX from "xlsx"
import type { SupabaseClient } from "@supabase/supabase-js"

// ============================================================================
// Builder compartido del Excel clínico (47 columnas + hoja de Catálogos).
// Lo usan tanto el endpoint manual de descarga como el endpoint de backup
// automático a Drive — así garantizamos que produzcan exactamente lo mismo.
// ============================================================================

const ACCESO_LABELS: Record<number, string> = {
  1: "Sí (entrega total)",
  2: "Parcial",
  3: "No",
}

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

export interface ClinicalExcelFilters {
  convenio?: string | null
  doctor?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface ClinicalExcelResult {
  buffer: Buffer
  rowsExported: number
}

export async function buildClinicalExcel(
  supabase: SupabaseClient,
  filters: ClinicalExcelFilters,
): Promise<ClinicalExcelResult> {
  // 1. Pacientes que cumplen filtro de convenio
  let patientQuery = supabase
    .from("users")
    .select("id, convenio_code")
    .eq("role", "patient")

  if (filters.convenio && filters.convenio !== "todos") {
    patientQuery = patientQuery.eq("convenio_code", filters.convenio)
  }

  const { data: patients } = await patientQuery
  if (!patients || patients.length === 0) {
    return {
      buffer: XLSX.write(buildEmptyWorkbook(), { type: "buffer", bookType: "xlsx" }) as Buffer,
      rowsExported: 0,
    }
  }

  const patientIds = patients.map((p) => p.id)

  // 2. Evaluaciones que cumplen filtros de fecha + médico
  let assessmentQuery = supabase
    .from("patient_assessments")
    .select("id, user_id, created_by, created_at, raw_questionnaire")
    .in("user_id", patientIds)
    .order("created_at", { ascending: false })

  if (filters.doctor && filters.doctor !== "todos") {
    assessmentQuery = assessmentQuery.eq("created_by", filters.doctor)
  }
  if (filters.startDate) assessmentQuery = assessmentQuery.gte("created_at", filters.startDate)
  if (filters.endDate) assessmentQuery = assessmentQuery.lte("created_at", filters.endDate)

  const { data: assessments } = await assessmentQuery
  if (!assessments) throw new Error("Error consultando evaluaciones")

  // 3. Perfiles clínicos
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

  // 5. Filas
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
      num(raw.red_apoyo),
      num(raw.empoderamiento),
      raw.antecedentes ?? "",
      bool01(raw.takesMeds),
      num(raw.acceso),
      num(raw.med_access_reason),
      num(raw.adherencia),
      num(raw.presion_arterial),
      num(raw.pad),
      num(raw.hr),
      num(raw.rr),
      num(raw.spo2),
      num(raw.talla),
      num(raw.peso_kg),
      raw.lipid_date ? formatDate(raw.lipid_date) : "",
      num(raw.colesterol_total),
      num(raw.colesterol),
      num(raw.hdl),
      num(raw.triglicéridos),
      raw.hba1c_date ? formatDate(raw.hba1c_date) : "",
      num(raw.glucosa),
      bool01(raw.smoked),
      num(raw.nicotina),
      num(raw.actividad),
      num(raw.sueno),
      num(raw.salud_mental),
      num(raw.alimentacion),
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

  return {
    buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer,
    rowsExported: assessments.length,
  }
}

export function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildEmptyWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([["Sin evaluaciones para los filtros aplicados"]])
  XLSX.utils.book_append_sheet(wb, sheet, "Evaluaciones")
  return wb
}
