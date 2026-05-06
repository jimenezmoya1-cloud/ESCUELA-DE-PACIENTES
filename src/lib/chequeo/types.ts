export interface ChequeoFormData {
  pesoKg: string
  tallaCm: string
  enfermedades: string[]
  otraEnfermedad: string
  tomaMedicamentos: boolean | null
  medicamentosTexto: string
  accesoMedicamentos: number | null
  fumadorNivel: number | null
  actividadMinutos: number | null
  horasSueno: number | null
}

export interface ChequeoScore {
  componentes: { nombre: string; valor: number; puntaje: number }[]
  scoreParcial: number
  nivel: 'Verde' | 'Amarillo' | 'Rojo'
}

export interface ChequeoRegistration {
  nombre: string
  apellido: string
  cedula: string
  fechaNacimiento: string
  telefono: string
  email: string
  sexo: string
  departamento: string
  municipio: string
  accountType: 'full' | 'magic-link'
  password: string
  consent: boolean
}
