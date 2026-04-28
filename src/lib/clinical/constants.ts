import { ComponenteScore, DatosAlertas, DatosPaciente } from './types'

// NOTE: The 13 components below overlap by name with the existing
// modules.component_key system used in patient_components for personalized
// routes. They are NOT linked in v1; see spec section 11 (future work).

export const RECOMENDACIONES_PLANES: Record<string, { virtual: string; insignia: string; plus: string }> = {
  'Antecedente de hipertensión': {
    virtual: 'Guías digitales para medir la tensión como un profesional y entender tus cifras.',
    insignia: "Taller 'El Código de tus Arterias' y consulta de Medicina General Preventiva para perfeccionar tu técnica de medición.",
    plus: 'Valoración por médico especialista para protección renal/cardiaca avanzada y diseño de esquema de alta precisión.',
  },
  'Antecedente de diabetes': {
    virtual: 'Herramientas visuales para identificar qué alimentos disparan tu azúcar.',
    insignia: "Taller 'Mejorando tu Glucosa' y examen físico detallado en consulta de Medicina General.",
    plus: 'Manejo por especialista experto en metabolismo para casos complejos y optimización de tratamiento.',
  },
  Peso: {
    virtual: 'Estrategias interactivas para mejorar tu composición corporal real.',
    insignia: "Taller 'Más allá de la Báscula' y evaluación médica general metabólica con tecnología de punta.",
    plus: 'Intervención médica especializada para abordar barreras hormonales y seguimiento prioritario.',
  },
  'Exposición actual de nicotina': {
    virtual: 'Recursos motivacionales para manejar la ansiedad por fumar.',
    insignia: "Taller 'Rompiendo Cadenas' y acompañamiento médico general para fijar tu 'Día D'.",
    plus: 'Protocolo médico especializado de cesación tabáquica con vigilancia estrecha.',
  },
  'Actividad física': {
    virtual: 'Rutinas para dejar el sedentarismo adaptadas a tu energía.',
    insignia: "Taller 'Movimiento Inteligente' y prescripción médica de ejercicio en consulta general.",
    plus: 'Diseño de rutina de alta eficiencia por especialista para pacientes con limitaciones físicas.',
  },
  Sueño: {
    virtual: 'Estrategias de higiene del sueño para un descanso reparador.',
    insignia: "Taller 'Arquitectos del Descanso' y evaluación médica de tu higiene del sueño.",
    plus: 'Abordaje especializado de trastornos del sueño complejos vinculados a riesgo metabólico.',
  },
  'Empoderamiento en salud': {
    virtual: 'Preparación para llegar a tus citas médicas sabiendo qué preguntar.',
    insignia: "Taller 'El Paciente Experto' y simulacro médico para que seas el dueño de tu salud.",
    plus: 'Resolución especializada de dudas complejas para una toma de decisiones informada.',
  },
  'Adherencia a medicamentos': {
    virtual: 'Trucos digitales para no olvidar dosis ni duplicarlas.',
    insignia: "Taller 'Rutinas que Salvan' y organización médica de tu esquema en consulta.",
    plus: 'Conciliación médica por especialista para asegurar la máxima eficacia de cada fármaco.',
  },
  '¿Desconoces tu condición?': {
    virtual: 'Estrategias para crear hábitos y recordatorios efectivos.',
    insignia: 'Taller de gestión del tiempo y salud, identificando disparadores de olvido con tu médico.',
    plus: 'Seguimiento estrecho y simplificación del esquema terapéutico.',
  },
  'Acceso a medicamentos': {
    virtual: 'Guías para navegar los trámites de tu EPS sin demoras.',
    insignia: "Taller 'Navegando el Sistema' y asesoría en consulta para superar barreras administrativas.",
    plus: 'Análisis médico especializado del riesgo clínico por interrupciones.',
  },
}

export const SCORES_INICIALES: ComponenteScore[] = [
  { nombre: 'Glucosa', puntaje: 0, valor: 0 },
  { nombre: 'Presión arterial', puntaje: 0, valor: 0 },
  { nombre: 'Empoderamiento', puntaje: 0, valor: 0 },
  { nombre: 'Red de apoyo', puntaje: 0, valor: 0 },
  { nombre: 'Sueño', puntaje: 0, valor: 0 },
  { nombre: 'Actividad física', puntaje: 0, valor: 0 },
  { nombre: 'Alimentación', puntaje: 0, valor: 0 },
  { nombre: 'Peso', puntaje: 0, valor: 0 },
  { nombre: 'Colesterol', puntaje: 0, valor: 0 },
  { nombre: 'Nicotina', puntaje: 0, valor: 0 },
  { nombre: 'Salud mental', puntaje: 0, valor: 0 },
  { nombre: 'Adherencia a medicamentos', puntaje: 0, valor: 0 },
  { nombre: 'Acceso a medicamentos', puntaje: 0, valor: 0 },
]

export const DATOS_INICIALES_PACIENTE: DatosPaciente = {
  nombre: '',
  fechaNacimiento: '',
  documento: '',
  scoreGlobal: 0,
  metaScore: 0,
  nivel: 'Rojo',
  fechaReporte: new Date().toLocaleDateString('es-CO'),
  evaluacionInicial: '-',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  tipoDocumento: 'CC',
  sexo: '',
  telefono: '',
  correo: '',
  regimenAfiliacion: '',
  aseguradora: '',
  prepagada: 'No',
  planComplementario: 'No',
  genero: '',
  paisNacimiento: 'Colombia',
  paisResidencia: 'Colombia',
  departamentoResidencia: '',
  municipioResidencia: '',
  direccionResidencia: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaParentesco: '',
  contactoEmergenciaTelefono: '',
}

export const ALERTAS_INICIALES: DatosAlertas = {
  criticas: [],
  orientadoras: [],
}
