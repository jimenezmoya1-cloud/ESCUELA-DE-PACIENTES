import { calcularPuntajeExacto } from '@/lib/clinical/scoring'
import type { ContextoClinico } from '@/lib/clinical/types'
import type { ChequeoFormData, ChequeoScore } from './types'

export function calcularScoreParcial(data: ChequeoFormData): ChequeoScore {
  const pesoKg = parseFloat(data.pesoKg)
  const tallaCm = parseFloat(data.tallaCm)
  const tallaM = tallaCm / 100
  const imc = pesoKg && tallaM ? Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10 : 0

  const isDM2 = data.enfermedades.includes('Diabetes tipo 2')
  const isSCA = data.enfermedades.includes('Infarto o angina previa')
  const isPluripatologico = data.enfermedades.filter(e => e !== 'Ninguna').length >= 3

  const contexto: ContextoClinico = {
    isSCA,
    isDM2,
    isPluripatologico,
    isPocaExpectativa: false,
    edad: 0,
    takesMeds: data.tomaMedicamentos === true,
    iiefAplica: false,
  }

  const desconoceValor = data.enfermedades.filter(e => e !== 'Ninguna').length > 0 ? 0 : 2

  // Chequeo options use different semantics than scoring.ts expects:
  //   Chequeo 2 "Dejé >1 año" → scoring 3 (ex 1-5 años, conservative estimate)
  //   Chequeo 3 "Dejé <1 año" → scoring 4 (ex <1 año)
  //   Chequeo 4 "Fumo ocasionalmente" → scoring 5 (fumador actual)
  const chequeoToScoringNicotina: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5, 5: 5, 6: 6 }
  const nicotinaValor = chequeoToScoringNicotina[data.fumadorNivel ?? 1] ?? 1

  const componentes = [
    { nombre: 'Peso', valor: imc, puntaje: calcularPuntajeExacto('Peso', imc, contexto) },
    { nombre: 'Nicotina', valor: nicotinaValor, puntaje: calcularPuntajeExacto('Nicotina', nicotinaValor, contexto) },
    { nombre: 'Actividad física', valor: data.actividadMinutos ?? 0, puntaje: calcularPuntajeExacto('Actividad física', data.actividadMinutos ?? 0, contexto) },
    { nombre: 'Sueño', valor: data.horasSueno ?? 7, puntaje: calcularPuntajeExacto('Sueño', data.horasSueno ?? 7, contexto) },
    { nombre: 'Acceso a medicamentos', valor: data.accesoMedicamentos ?? 1, puntaje: calcularPuntajeExacto('Acceso a medicamentos', data.accesoMedicamentos ?? 1, contexto) },
    { nombre: 'Desconoce condición', valor: desconoceValor, puntaje: calcularPuntajeExacto('Desconoce condición', desconoceValor, contexto) },
  ]

  const scoreParcial = Math.round(
    componentes.reduce((sum, c) => sum + c.puntaje, 0) / componentes.length
  )

  const nivel = scoreParcial >= 80 ? 'Verde' : scoreParcial > 50 ? 'Amarillo' : 'Rojo'

  return { componentes, scoreParcial, nivel }
}

export function getWorstComponents(
  componentes: { nombre: string; puntaje: number }[],
  count = 3,
): { nombre: string; puntaje: number }[] {
  return [...componentes]
    .sort((a, b) => a.puntaje - b.puntaje)
    .slice(0, count)
    .filter(c => c.puntaje < 80)
}
