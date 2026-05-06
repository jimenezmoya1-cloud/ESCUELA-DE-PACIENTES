export const CONDICIONES_EXPRESS = [
  'Hipertensión arterial',
  'Diabetes tipo 2',
  'Colesterol o triglicéridos altos',
  'Infarto o angina previa',
  'Enfermedad renal',
  'EPOC o asma',
  'Hipotiroidismo',
  'Depresión o ansiedad',
] as const

export const OPCIONES_TABAQUISMO = [
  { valor: 1, label: 'Nunca he fumado' },
  { valor: 2, label: 'Dejé de fumar hace más de 1 año' },
  { valor: 3, label: 'Dejé de fumar hace menos de 1 año' },
  { valor: 4, label: 'Fumo ocasionalmente' },
  { valor: 5, label: 'Fumo todos los días' },
  { valor: 6, label: 'Uso vapeador o cigarrillo electrónico' },
] as const

export const OPCIONES_ACCESO = [
  { valor: 1, label: 'No, siempre los consigo' },
  { valor: 2, label: 'A veces es difícil' },
  { valor: 3, label: 'Frecuentemente no los consigo' },
] as const

export const INSIGHTS_MAP: Record<string, { finding: string; help: string }> = {
  Peso: {
    finding: 'Tu índice de masa corporal está fuera del rango ideal.',
    help: 'En nuestro programa, un médico evalúa tu composición corporal y diseña un plan adaptado a ti.',
  },
  Nicotina: {
    finding: 'El tabaco afecta directamente tu salud cardiovascular.',
    help: 'Nuestro equipo médico te acompaña con un protocolo de cesación personalizado.',
  },
  'Actividad física': {
    finding: 'Tu nivel de actividad física está por debajo de lo recomendado.',
    help: 'En nuestro programa, un médico diseña una rutina adaptada a tu energía y condiciones.',
  },
  Sueño: {
    finding: 'Tu calidad de sueño podría estar afectando tu salud cardiovascular.',
    help: 'Un médico evalúa tu higiene del sueño y te da estrategias para mejorar tu descanso.',
  },
  'Acceso a medicamentos': {
    finding: 'Las dificultades para conseguir medicamentos aumentan tu riesgo.',
    help: 'Te ayudamos a navegar las barreras administrativas para asegurar tu tratamiento.',
  },
  'Desconoce condición': {
    finding: 'Es importante conocer bien tu estado de salud.',
    help: 'Una evaluación completa te da claridad sobre tu condición y cómo cuidarte mejor.',
  },
}

export const CHEQUEO_STEPS = [
  'Medidas básicas',
  'Antecedentes de salud',
  'Medicamentos',
  'Tabaquismo',
  'Actividad física',
  'Sueño',
] as const
