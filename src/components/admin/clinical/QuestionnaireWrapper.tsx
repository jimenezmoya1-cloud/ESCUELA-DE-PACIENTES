"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import Questionnaire, { type ExistingProfile } from "./Questionnaire"
import { saveAssessment, upsertClinicalProfile } from "@/lib/clinical/actions"
import type { ComponenteScore, AlertaItem } from "@/lib/clinical/types"
import type { Lead } from "@/types/database"

interface Props {
  userId: string
  profile?: ExistingProfile | null
  editMode?: boolean
  leadData?: Lead | null
}

const URL_TO_COMPONENTE: Record<string, string> = {
  peso: "Peso",
  presion_arterial: "Presión arterial",
  glucosa: "Glucosa",
  nicotina: "Nicotina",
  actividad: "Actividad física",
  sueno: "Sueño",
  empoderamiento: "Empoderamiento",
  adherencia: "Adherencia a medicamentos",
  acceso: "Acceso a medicamentos",
  red_apoyo: "Red de apoyo",
  alimentacion: "Alimentación",
  colesterol: "Colesterol",
  salud_mental: "Salud mental",
  disfuncion_erectil: "Disfunción eréctil",
}

function buildProfile(params: URLSearchParams) {
  const nombre = params.get("nombre") ?? ""
  const [primer_nombre = "", segundo_nombre = "", primer_apellido = "", segundo_apellido = ""] = nombre.split(" ")

  const dobRaw = params.get("fecha_nac")
  let fecha_nacimiento: string | null = null
  if (dobRaw) {
    if (dobRaw.includes("/")) {
      const [d, m, y] = dobRaw.split("/")
      if (d && m && y) fecha_nacimiento = `${y.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    } else {
      fecha_nacimiento = dobRaw
    }
  }

  const get = (k: string) => params.get(k) || null

  return {
    primer_nombre: primer_nombre || null,
    segundo_nombre: segundo_nombre || null,
    primer_apellido: primer_apellido || null,
    segundo_apellido: segundo_apellido || null,
    tipo_documento: get("tipo_doc"),
    documento: get("doc"),
    fecha_nacimiento,
    sexo: get("sexo"),
    telefono: get("telefono"),
    correo: get("correo"),
    regimen_afiliacion: get("regimen"),
    aseguradora: get("eps"),
    prepagada: get("prepagada"),
    plan_complementario: get("plan_complementario"),
    pais_nacimiento: get("pais_nacimiento"),
    pais_residencia: get("pais_residencia"),
    departamento_residencia: get("depto"),
    municipio_residencia: get("municipio"),
    direccion_residencia: get("direccion"),
    contacto_emergencia_nombre: get("emergencia_nombre"),
    contacto_emergencia_parentesco: get("emergencia_parentesco"),
    contacto_emergencia_telefono: get("emergencia_telefono"),
  }
}

export default function QuestionnaireWrapper({ userId, profile, editMode, leadData }: Props) {
  const router = useRouter()
  const submittingRef = useRef(false)

  return (
    <Questionnaire
      existingProfile={profile ?? null}
      skipPersonalData={!editMode && !!profile}
      editMode={editMode}
      leadData={leadData}
      onComplete={async (urlString) => {
        if (submittingRef.current) return
        submittingRef.current = true
        try {
          const url = new URL(urlString)
          const params = url.searchParams

          await upsertClinicalProfile(userId, buildProfile(params))

          if (editMode) {
            router.push(`/admin/pacientes/${userId}/historia-clinica`)
            router.refresh()
            return
          }

          const takesMeds = params.get("takesMeds") !== "false"
          const iiefAplica = params.get("iief_aplica") === "true"
          const components: ComponenteScore[] = Object.entries(URL_TO_COMPONENTE)
            .filter(([key]) => {
              if (!takesMeds && (key === "adherencia" || key === "acceso")) return false
              if (!iiefAplica && key === "disfuncion_erectil") return false
              return true
            })
            .map(([key, nombreComp]) => {
              const raw = params.get(key)
              const valorNum = raw ? parseFloat(raw) : 0
              return { nombre: nombreComp, valor: isNaN(valorNum) ? 0 : valorNum, puntaje: 0 }
            })

          await saveAssessment({
            user_id: userId,
            components,
            is_sca: params.get("sca") === "true",
            is_dm2: params.get("dm2") === "true",
            is_pluripatologico: false,
            is_poca_expectativa: false,
            alertas_criticas: [] as AlertaItem[],
            alertas_orientadoras: [] as AlertaItem[],
            raw_questionnaire: Object.fromEntries(params.entries()),
          })

          router.push(`/admin/pacientes/${userId}/historia-clinica`)
          router.refresh()
        } catch (err) {
          submittingRef.current = false
          alert(`No se pudo guardar: ${(err as Error).message}`)
        }
      }}
    />
  )
}
