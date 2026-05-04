export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
  takesMeds: boolean
}

export interface CreatorSignature {
  full_name: string
  profession: "medico" | "enfermero" | "otro" | null
  specialty: string | null
  medical_registration: string | null
  professional_id_card: string | null
  created_at: string
}

export interface ComponenteScore {
  nombre: string
  puntaje: number
  valor: number | string
}

export interface DatosPaciente {
  nombre: string
  fechaNacimiento: string
  documento: string
  scoreGlobal: number
  metaScore: number
  nivel: string
  fechaReporte: string
  evaluacionInicial: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  tipoDocumento: string
  sexo: string
  telefono: string
  correo: string
  regimenAfiliacion: string
  aseguradora: string
  prepagada: string
  planComplementario: string
  genero: string
  paisNacimiento: string
  paisResidencia: string
  departamentoResidencia: string
  municipioResidencia: string
  direccionResidencia: string
  contactoEmergenciaNombre: string
  contactoEmergenciaParentesco: string
  contactoEmergenciaTelefono: string
}

export interface AlertaItem {
  id: number
  marcador: string
  accion: string
}

export interface DatosAlertas {
  criticas: AlertaItem[]
  orientadoras: AlertaItem[]
}
