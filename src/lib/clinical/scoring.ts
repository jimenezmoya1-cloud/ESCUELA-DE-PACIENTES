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

export const calcularPuntajeExacto = (
  nombreComponente: string,
  valor: number,
  contexto: ContextoClinico,
): number => {
  if (isNaN(valor)) return 0

  switch (nombreComponente) {
    case 'Empoderamiento':
      return reglaDeTresRango(valor, 8, 40, 0, 100)

    case 'Adherencia a medicamentos':
      if (valor <= 23) return reglaDeTresRango(valor, 12, 23, 100, 80)
      if (valor <= 35) return reglaDeTresRango(valor, 24, 35, 79, 51)
      return reglaDeTresRango(valor, 36, 48, 50, 0)

    case 'Acceso a medicamentos':
      if (valor === 1) return 100
      if (valor === 2) return 65
      return 25

    case 'Peso': {
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
      if (valor < 120) return reglaDeTresRango(valor, 90, 119, 100, 80)
      if (valor <= 129) return reglaDeTresRango(valor, 120, 129, 79, 51)
      return reglaDeTresRango(valor, 130, 160, 50, 0)

    case 'Glucosa':
      if (!contexto.isDM2) {
        if (valor < 5.7) return reglaDeTresRango(valor, 4.0, 5.6, 100, 80)
        if (valor <= 7.9) return reglaDeTresRango(valor, 5.7, 7.9, 79, 51)
        return reglaDeTresRango(valor, 8.0, 12.0, 50, 0)
      } else {
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
      if (valor >= 120) return reglaDeTresRango(valor, 120, 300, 80, 100)
      if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
      return reglaDeTresRango(valor, 0, 59, 0, 50)

    case 'Sueño':
      if (valor >= 7 && valor <= 9) return 100
      if (valor >= 6 && valor < 7) return reglaDeTresRango(valor, 6, 6.9, 51, 79)
      if (valor > 9 && valor <= 10) return reglaDeTresRango(valor, 9.1, 10, 79, 51)
      if (valor < 6) return reglaDeTresRango(valor, 3, 5.9, 0, 50)
      return reglaDeTresRango(valor, 10.1, 12, 50, 0)

    case 'Nicotina':
      if (valor === 1) return 100
      if (valor === 2) return 75
      if (valor === 3) return 60
      if (valor === 4) return 25
      if (valor === 5) return 0
      if (valor === 6) return 60
      return 0

    case 'Red de apoyo':
      return reglaDeTresRango(valor, 12, 84, 0, 100)

    case 'Alimentación':
      return reglaDeTresRango(valor, 0, 14, 0, 100)

    case 'Colesterol':
      if (valor < 100) return 100
      if (valor <= 129) return reglaDeTresRango(valor, 100, 129, 79, 51)
      return reglaDeTresRango(valor, 130, 160, 50, 0)

    case 'Salud mental':
      if (valor <= 4) return 100
      if (valor <= 9) return reglaDeTresRango(valor, 5, 9, 79, 51)
      return reglaDeTresRango(valor, 10, 27, 50, 0)

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
  const recomputed = componentes.map((c) => {
    const valorNum = typeof c.valor === 'number' ? c.valor : parseFloat(String(c.valor).replace(',', '.')) || 0
    return { ...c, puntaje: calcularPuntajeExacto(c.nombre, valorNum, contexto) }
  })
  const scoreGlobal = calcularScoreGlobal(recomputed)
  const nivel = determinarNivel(scoreGlobal)
  const metaScore = calcularMetaScore(scoreGlobal)
  return { components: recomputed, scoreGlobal, nivel, metaScore }
}
