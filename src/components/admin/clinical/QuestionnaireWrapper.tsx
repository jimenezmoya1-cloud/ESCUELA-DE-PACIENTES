"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import Questionnaire from "./Questionnaire"
import { saveAssessment, upsertClinicalProfile } from "@/lib/clinical/actions"
import type { ComponenteScore, AlertaItem } from "@/lib/clinical/types"

interface Props {
  userId: string
}

// Map Questionnaire's URL param keys -> ComponenteScore.nombre values used by scoring.
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
}

export default function QuestionnaireWrapper({ userId }: Props) {
  const router = useRouter()
  const submittingRef = useRef(false)

  return (
    <Questionnaire
      onComplete={async (urlString) => {
        if (submittingRef.current) return
        submittingRef.current = true
        try {
          const url = new URL(urlString)
          const params = url.searchParams

          const nombre = params.get("nombre") ?? ""
          const [primer_nombre = "", segundo_nombre = "", primer_apellido = "", segundo_apellido = ""] = nombre.split(" ")

          const dobRaw = params.get("fecha_nac") // dd/mm/yyyy or yyyy-mm-dd
          let fecha_nacimiento: string | null = null
          if (dobRaw) {
            if (dobRaw.includes("/")) {
              const [d, m, y] = dobRaw.split("/")
              if (d && m && y) fecha_nacimiento = `${y.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
            } else {
              fecha_nacimiento = dobRaw
            }
          }

          await upsertClinicalProfile(userId, {
            primer_nombre: primer_nombre || null,
            segundo_nombre: segundo_nombre || null,
            primer_apellido: primer_apellido || null,
            segundo_apellido: segundo_apellido || null,
            documento: params.get("doc") || null,
            fecha_nacimiento,
          })

          const takesMeds = params.get("takesMeds") !== "false"
          const components: ComponenteScore[] = Object.entries(URL_TO_COMPONENTE)
            .filter(([key]) => takesMeds || (key !== "adherencia" && key !== "acceso"))
            .map(([key, nombreComp]) => {
              const raw = params.get(key)
              const valorNum = raw ? parseFloat(raw) : 0
              return { nombre: nombreComp, valor: isNaN(valorNum) ? 0 : valorNum, puntaje: 0 }
            })

          // Pad with placeholders for any missing components from SCORES_INICIALES order
          // (saveAssessment recomputes puntaje server-side, so ordering is fine)

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
          alert(`No se pudo guardar la evaluación: ${(err as Error).message}`)
        }
      }}
    />
  )
}
