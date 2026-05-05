import { ContextoClinico, ComponenteScore } from './types'

export const reglaDeTresRango = (
  valor: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  if (valor <= Math.min(inMin, inMax)) return outMin
  if (valor >= Math.max(inMin, inMax)) return outMax
  const porcentajeProgreso = (valor - inMin) / (inMax - inMin)
  const resultado = outMin + porcentajeProgreso * (outMax - outMin)
  return Math.round(resultado)
}

// ============================================================
// Cálculo de puntajes alineado al documento técnico CAIMED
// (LÓGICA, ORIGEN DE DATOS Y MODELO DE ATENCIÓN — secciones 2 y 3).
// Cualquier modificación debe mantenerse coherente con ese documento.
// ============================================================
export const calcularPuntajeExacto = (
  nombreComponente: string,
  valor: number,
  contexto: ContextoClinico,
): number => {
  if (isNaN(valor)) return 0

  switch (nombreComponente) {
    case 'Empoderamiento':
      // Doc: 30-40 verde, 19-29 amarillo, <19 rojo (rango 8-40).
      if (valor < 19) return reglaDeTresRango(valor, 8, 18.99, 0, 50)
      if (valor <= 29) return reglaDeTresRango(valor, 19, 29, 51, 79)
      return reglaDeTresRango(valor, 30, 40, 80, 100)

    case 'Adherencia a medicamentos':
      // Doc: 12-23 verde (buena), 24-35 amarillo, 36-48 rojo. Escala inversa.
      if (valor <= 23) return reglaDeTresRango(valor, 12, 23, 100, 80)
      if (valor <= 35) return reglaDeTresRango(valor, 24, 35, 79, 51)
      return reglaDeTresRango(valor, 36, 48, 50, 0)

    case 'Acceso a medicamentos':
      // Doc: 1=Total verde, 2=Parcial amarillo, 3=Negación rojo.
      // Usuario 2026-05-04: Sí=100, Parcialmente=66, No=1.
      if (valor === 1) return 100
      if (valor === 2) return 66
      return 1

    case 'Peso': {
      // Doc: lógica piramidal con TARGET_BMI 21.7.
      const TARGET_BMI = 21.7
      if (valor < TARGET_BMI) {
        if (valor <= 18.4) return reglaDeTresRango(valor, 13.0, 18.4, 0, 50)
        return reglaDeTresRango(valor, 18.5, TARGET_BMI, 51, 100)
      } else {
        if (valor <= 30) return reglaDeTresRango(valor, TARGET_BMI, 30.0, 100, 50)
        return reglaDeTresRango(valor, 30.1, 45.0, 49, 0)
      }
    }

    case 'Presión arterial':
      // Doc: <120 verde, 120-129 amarillo, ≥130 rojo (sistólica).
      if (valor < 120) return reglaDeTresRango(valor, 90, 119, 100, 80)
      if (valor <= 129) return reglaDeTresRango(valor, 120, 129, 79, 51)
      return reglaDeTresRango(valor, 130, 200, 50, 0)

    case 'Glucosa':
      if (!contexto.isDM2) {
        // Doc paciente sano: <5.7 verde, 5.7-6.4 amarillo (prediabetes), ≥6.5 rojo.
        if (valor < 5.7) return reglaDeTresRango(valor, 4.0, 5.69, 100, 80)
        if (valor <= 6.4) return reglaDeTresRango(valor, 5.7, 6.4, 79, 51)
        return reglaDeTresRango(valor, 6.5, 12.0, 50, 0)
      } else {
        // Doc DM2: meta base 6.0-7.0 verde, ajustes por edad y pluripatología.
        if (contexto.isPocaExpectativa) return 100
        let limiteVerdeInf = 6.0
        let limiteVerdeSup = 7.0
        let limiteAmarilloSup = 8.0
        let limiteRojoSup = 9.0
        if (contexto.edad >= 60) {
          const SHIFT = contexto.isPluripatologico ? 1.0 : 0.5
          limiteVerdeInf += SHIFT
          limiteVerdeSup += SHIFT
          limiteAmarilloSup += SHIFT
          limiteRojoSup += SHIFT
        }
        if (valor <= limiteVerdeInf) return 100
        if (valor <= limiteVerdeSup) return reglaDeTresRango(valor, limiteVerdeInf + 0.01, limiteVerdeSup, 100, 80)
        if (valor <= limiteAmarilloSup) return reglaDeTresRango(valor, limiteVerdeSup + 0.01, limiteAmarilloSup, 79, 51)
        if (valor <= limiteRojoSup) return reglaDeTresRango(valor, limiteAmarilloSup + 0.01, limiteRojoSup, 50, 0)
        return 0
      }

    case 'Actividad física':
      // Doc: ≥120 min/sem verde, 60-119 amarillo, <60 rojo.
      // Usuario 2026-05-04: 100 puntos a 150 min (no a 300).
      if (valor >= 120) return reglaDeTresRango(valor, 120, 150, 80, 100)
      if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
      return reglaDeTresRango(valor, 0, 59, 0, 50)

    case 'Sueño':
      // Doc: 7-9 h verde, 6-7 / 9-10 amarillo, <6 ó >10 rojo.
      if (valor >= 7 && valor <= 9) return 100
      if (valor >= 6 && valor < 7) return reglaDeTresRango(valor, 6, 6.99, 51, 79)
      if (valor > 9 && valor <= 10) return reglaDeTresRango(valor, 9.01, 10, 79, 51)
      if (valor < 6) return reglaDeTresRango(valor, 3, 5.99, 0, 50)
      return reglaDeTresRango(valor, 10.01, 12, 50, 0)

    case 'Nicotina':
      // Mapeo del cuestionario:
      //   1 = no fumador, 2 = ex >5 años, 3 = ex 1-5 años, 4 = ex <1 año,
      //   5 = fumador actual cigarrillo, 6 = fumador electrónico/vapeador.
      // Usuario 2026-05-04: vapeador ahora cuenta igual que fumador actual (0).
      if (valor === 1) return 100  // No fumador
      if (valor === 2) return 75   // Ex >5 años
      if (valor === 3) return 60   // Ex 1-5 años
      if (valor === 4) return 25   // Ex <1 año
      if (valor === 5) return 0    // Fumador actual cigarrillo
      if (valor === 6) return 0    // Vapeador / cigarrillo electrónico
      return 0

    case 'Red de apoyo':
      // Doc: promedio Likert 1-7. 5.1-7 verde, 3-5 amarillo, 1-2.9 rojo.
      // El cuestionario guarda la SUMA de 12 ítems (rango 12-84). Cortes equivalentes:
      //   suma <36 (prom <3) → rojo
      //   suma 36-60 (prom 3-5) → amarillo
      //   suma >60 (prom >5) → verde
      if (valor < 36) return reglaDeTresRango(valor, 12, 35.99, 0, 50)
      if (valor <= 60) return reglaDeTresRango(valor, 36, 60, 51, 79)
      return reglaDeTresRango(valor, 60.01, 84, 80, 100)

    case 'Alimentación':
      // Doc: escala inversa 0-16. 0-3 verde, 4-9 amarillo, ≥10 rojo.
      if (valor <= 3) return reglaDeTresRango(valor, 0, 3, 100, 80)
      if (valor <= 9) return reglaDeTresRango(valor, 4, 9, 79, 51)
      return reglaDeTresRango(valor, 10, 16, 50, 0)

    case 'Colesterol':
      // Doc: lógica diferencial por SCA (sección 2A).
      // Sano:    <130 verde, 130-159 amarillo, ≥160 rojo.
      // SCA 2°:  ≤55 verde, 56-69 amarillo, ≥70 rojo.
      if (contexto.isSCA) {
        if (valor <= 55) return reglaDeTresRango(valor, 0, 55, 100, 80)
        if (valor <= 69) return reglaDeTresRango(valor, 56, 69, 79, 51)
        return reglaDeTresRango(valor, 70, 200, 50, 0)
      }
      if (valor < 130) return reglaDeTresRango(valor, 50, 129, 100, 80)
      if (valor <= 159) return reglaDeTresRango(valor, 130, 159, 79, 51)
      return reglaDeTresRango(valor, 160, 250, 50, 0)

    case 'Salud mental':
      // Doc PHQ-9: 0-4 mínima verde, 5-14 leve/moderada amarillo, ≥15 severa rojo.
      if (valor <= 4) return reglaDeTresRango(valor, 0, 4, 100, 80)
      if (valor <= 14) return reglaDeTresRango(valor, 5, 14, 79, 51)
      return reglaDeTresRango(valor, 15, 27, 50, 0)

    case 'Disfunción eréctil':
      // IIEF-5: rango 5-25. Verde 22-25, amarillo 12-21, rojo 5-11.
      if (valor <= 11) return reglaDeTresRango(valor, 5, 11, 0, 50)
      if (valor <= 21) return reglaDeTresRango(valor, 12, 21, 51, 79)
      return reglaDeTresRango(valor, 22, 25, 80, 100)

    default:
      return 0
  }
}

export const calcularEdad = (fechaStr: string): number => {
  if (!fechaStr) return 0
  const parts = fechaStr.split('/')
  if (parts.length !== 3) return 0
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  let year = parseInt(parts[2], 10)
  if (year < 100) year += year < 30 ? 2000 : 1900
  const birth = new Date(year, month, day)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export const getColorBg = (score: number): string =>
  score >= 80
    ? 'bg-green-100 text-green-800'
    : score > 50
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800'

export const getColorNivel = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score > 50) return '#eab308'
  return '#ef4444'
}

export const getEstilosCajaNivel = (score: number) => {
  if (score >= 80)
    return {
      container: 'bg-green-50 border-green-100',
      circle: 'bg-green-100',
      textNumber: 'text-green-600',
      textScore: 'text-green-600',
    }
  if (score > 50)
    return {
      container: 'bg-yellow-50 border-yellow-100',
      circle: 'bg-yellow-100',
      textNumber: 'text-yellow-600',
      textScore: 'text-yellow-600',
    }
  return {
    container: 'bg-red-50 border-red-100',
    circle: 'bg-red-100',
    textNumber: 'text-red-600',
    textScore: 'text-red-600',
  }
}

const COMPONENTES_CRITICOS = ['Peso', 'Glucosa', 'Presión arterial', 'Colesterol']

export const calcularScoreGlobal = (componentes: ComponenteScore[]): number => {
  let sumaPonderada = 0
  let sumaPesos = 0
  componentes.forEach((comp) => {
    let peso = 1
    if (COMPONENTES_CRITICOS.includes(comp.nombre)) {
      if (comp.puntaje <= 50) peso = 5
      else if (comp.puntaje < 80) peso = 3
    }
    sumaPonderada += comp.puntaje * peso
    sumaPesos += peso
  })
  return sumaPesos > 0 ? Math.round(sumaPonderada / sumaPesos) : 0
}

export const determinarNivel = (scoreGlobal: number): 'Verde' | 'Amarillo' | 'Rojo' => {
  if (scoreGlobal >= 80) return 'Verde'
  if (scoreGlobal > 50) return 'Amarillo'
  return 'Rojo'
}

export const calcularMetaScore = (scoreGlobal: number): number => Math.min(scoreGlobal + 12, 100)

export const recomputeAssessment = (
  componentes: ComponenteScore[],
  contexto: ContextoClinico,
): { components: ComponenteScore[]; scoreGlobal: number; nivel: 'Verde' | 'Amarillo' | 'Rojo'; metaScore: number } => {
  // Filtro defensivo: omitir componentes que no aplican al paciente para no diluir
  // el score global. El upstream (QuestionnaireWrapper) ya filtra al guardar; este
  // es defense-in-depth para evaluaciones legacy y otras call sites.
  //   - Si !takesMeds: omitir Acceso + Adherencia.
  //   - Si !iiefAplica: omitir Disfunción eréctil.
  const filtered = componentes.filter((c) => {
    if (!contexto.takesMeds && (c.nombre === 'Acceso a medicamentos' || c.nombre === 'Adherencia a medicamentos')) return false
    if (!contexto.iiefAplica && c.nombre === 'Disfunción eréctil') return false
    return true
  })
  const recomputed = filtered.map((c) => {
    const valorNum = typeof c.valor === 'number' ? c.valor : parseFloat(String(c.valor).replace(',', '.')) || 0
    return { ...c, puntaje: calcularPuntajeExacto(c.nombre, valorNum, contexto) }
  })
  const scoreGlobal = calcularScoreGlobal(recomputed)
  const nivel = determinarNivel(scoreGlobal)
  const metaScore = calcularMetaScore(scoreGlobal)
  return { components: recomputed, scoreGlobal, nivel, metaScore }
}

export interface ChipResult {
  label: string
  displayValue: string
  score: number
}

const computeIMC = (weightStr: string, heightStr: string): number | null => {
  // El cuestionario captura altura en METROS (input "¿Cuánto mides? (m)").
  // No dividimos por 100 — el valor ya viene en metros.
  const w = parseFloat(weightStr)
  const hM = parseFloat(heightStr)
  if (!w || !hM) return null
  return Math.round((w / (hM * hM)) * 10) / 10
}

const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

/**
 * Calcula el chip de score para un componente dado, derivando el valor crudo
 * desde formData. Reusa calcularPuntajeExacto para garantizar consistencia
 * con el reporte final.
 *
 * Devuelve null si los inputs aún no están completos (chip muestra estado neutral).
 *
 * NOTA sobre contexto: el chip recibe el contexto disponible en captura
 * (takesMeds, iiefAplica) pero NO conoce isSCA/isDM2 (esos los marca el
 * médico en ClinicalHistoryClient). El chip muestra el valor con isSCA=false
 * isDM2=false, lo que puede diferir del puntaje final visible en el reporte
 * para Colesterol y Glucosa cuando el contexto SCA/DM2 cambia las metas.
 */
export const computeChipScore = (
  componentName: string,
  formData: Record<string, unknown>,
  contexto: ContextoClinico,
): ChipResult | null => {
  switch (componentName) {
    case 'Red de apoyo': {
      const mspss = formData.mspss as number[]
      if (!mspss || mspss.some(v => v === 0)) return null
      const suma = sumArr(mspss)
      const promedio = Math.round((suma / 12) * 10) / 10
      return {
        label: 'Promedio',
        displayValue: promedio.toFixed(1),
        score: calcularPuntajeExacto('Red de apoyo', suma, contexto),
      }
    }
    case 'Empoderamiento': {
      const hes = formData.hes as number[]
      if (!hes || hes.some(v => v === 0)) return null
      const suma = sumArr(hes)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Empoderamiento', suma, contexto),
      }
    }
    case 'Adherencia a medicamentos': {
      const arms = formData.arms as number[]
      if (!arms || arms.some(v => v === 0)) return null
      const suma = sumArr(arms)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Adherencia a medicamentos', suma, contexto),
      }
    }
    case 'Acceso a medicamentos': {
      const v = formData.medAccess as number
      if (!v) return null
      const labels: Record<number, string> = { 1: 'Sí', 2: 'Parcial', 3: 'No' }
      return {
        label: 'Respuesta',
        displayValue: labels[v] ?? '—',
        score: calcularPuntajeExacto('Acceso a medicamentos', v, contexto),
      }
    }
    case 'Presión arterial': {
      const vs = formData.vitalSigns as { pas?: string } | undefined
      const pas = parseFloat(vs?.pas ?? '')
      if (!pas) return null
      return {
        label: 'PAS',
        displayValue: `${pas} mmHg`,
        score: calcularPuntajeExacto('Presión arterial', pas, contexto),
      }
    }
    case 'Peso': {
      const imc = computeIMC(formData.weight as string, formData.height as string)
      if (imc === null) return null
      return {
        label: 'IMC',
        displayValue: imc.toFixed(1),
        score: calcularPuntajeExacto('Peso', imc, contexto),
      }
    }
    case 'Colesterol': {
      const p = formData.paraclinics as { ldl?: string } | undefined
      const ldl = parseFloat(p?.ldl ?? '')
      if (!ldl) return null
      return {
        label: 'LDL',
        displayValue: `${ldl} mg/dL`,
        score: calcularPuntajeExacto('Colesterol', ldl, contexto),
      }
    }
    case 'Glucosa': {
      const p = formData.paraclinics as { hba1c?: string } | undefined
      const hba1c = parseFloat(p?.hba1c ?? '')
      if (!hba1c) return null
      return {
        label: 'HbA1c',
        displayValue: `${hba1c.toFixed(1)} %`,
        score: calcularPuntajeExacto('Glucosa', hba1c, contexto),
      }
    }
    case 'Disfunción eréctil': {
      const iief = formData.iief as number[]
      if (!iief || iief.some(v => v === 0)) return null
      const suma = sumArr(iief)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Disfunción eréctil', suma, contexto),
      }
    }
    case 'Nicotina': {
      const smoked = formData.smoked as boolean | null
      if (smoked === null) return null
      const labels: Record<number, string> = {
        1: 'No fumador', 2: 'Ex >5 años', 3: 'Ex 1-5 años',
        4: 'Ex <1 año', 5: 'Fumador actual', 6: 'Vapeador',
      }
      let nicotina = 1
      if (smoked) {
        const s = formData.smokeStatus as number[]
        if (!s || s.length === 0) return null
        if (s.includes(6) || s.includes(5)) nicotina = 5
        else if (s.includes(4)) nicotina = 4
        else if (s.includes(3)) nicotina = 3
        else if (s.includes(2)) nicotina = 2
      }
      return {
        label: 'Categoría',
        displayValue: labels[nicotina],
        score: calcularPuntajeExacto('Nicotina', nicotina, contexto),
      }
    }
    case 'Actividad física': {
      const raw = formData.activity as string
      if (!raw) return null
      const v = parseFloat(raw)
      if (isNaN(v)) return null
      return {
        label: 'Actividad',
        displayValue: `${v} min/sem`,
        score: calcularPuntajeExacto('Actividad física', v, contexto),
      }
    }
    case 'Sueño': {
      const raw = formData.sleep as string
      if (!raw) return null
      const v = parseFloat(raw)
      if (isNaN(v)) return null
      return {
        label: 'Sueño',
        displayValue: `${v.toFixed(1)} horas`,
        score: calcularPuntajeExacto('Sueño', v, contexto),
      }
    }
    case 'Salud mental': {
      const phq = formData.phq9 as number[]
      if (!phq) return null
      const suma = sumArr(phq)
      return {
        label: 'Suma PHQ-9',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Salud mental', suma, contexto),
      }
    }
    case 'Alimentación': {
      const medas = formData.medas as number[]
      if (!medas || medas.some(v => v < 0)) return null
      const suma = sumArr(medas)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Alimentación', suma, contexto),
      }
    }
    default:
      return null
  }
}
