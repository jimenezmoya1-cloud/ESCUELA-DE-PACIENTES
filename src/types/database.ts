export type UserRole = 'patient' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  access_code_used: string | null
  registered_at: string
  last_login_at: string | null
  has_selected_components: boolean
  wants_salud_sexual: boolean
  gender: 'male' | 'female' | null
  takes_chronic_medication: boolean | null
}

export interface AccessCode {
  id: string
  code: string
  is_used: boolean
  used_by_user_id: string | null
  used_at: string | null
  created_at: string
}

export interface Module {
  id: string
  title: string
  short_description: string | null
  long_description: string | null
  order: number
  days_to_unlock: number
  is_published: boolean
  component_key: string | null
  created_at: string
  updated_at: string
}

export type ContentBlockType = 'video' | 'text' | 'pdf' | 'quiz' | 'task'

export interface ContentBlock {
  id: string
  module_id: string
  type: ContentBlockType
  content: Record<string, unknown>
  order: number
  created_at: string
}

export interface ModuleCompletion {
  id: string
  user_id: string
  module_id: string
  completed_at: string
}

export interface QuizResponse {
  id: string
  user_id: string
  module_id: string
  question_id: string
  answer: Record<string, unknown>
  is_correct: boolean | null
  answered_at: string
}

export interface TaskSubmission {
  id: string
  user_id: string
  module_id: string
  content: string
  submitted_at: string
}

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  body: string
  sent_at: string
  read_at: string | null
}

export interface Session {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
}

// ====== NEW TYPES ======

// Patient Component Selection
export interface PatientComponent {
  id: string
  patient_id: string
  component_name: string
  priority_order: number
  created_at: string
}

// Available components for patient priority selection (excludes fixed modules)
// NOTE: 'Acceso y adherencia a medicamentos' is NOT here — it's auto-included via the chronic medication question
// NOTE: 'Salud Sexual Masculina' is NOT here — it's auto-included via the gender+salud sexual question
export const AVAILABLE_COMPONENTS = [
  'Actividad física',
  'Red de apoyo',
  'Salud mental',
  'Glucosa',
  'Empoderamiento en salud',
  'Control del peso',
  'Alimentación',
  'Salud de sueño',
  'Presión arterial',
  'Colesterol',
  'Nicotina',
] as const

// Fixed order for remaining modules (after priorities)
// adherencia: conditional on takes_chronic_medication
// salud_sexual: conditional on gender===male && wants_salud_sexual
export const REMAINING_MODULES_ORDER = [
  'Empoderamiento en salud',
  'Red de apoyo',
  'Acceso y adherencia a medicamentos',
  'Salud Sexual Masculina',
  'Actividad física',
  'Alimentación',
  'Salud mental',
  'Salud de sueño',
  'Presión arterial',
  'Glucosa',
  'Colesterol',
  'Nicotina',
] as const

export type ComponentName = typeof AVAILABLE_COMPONENTS[number]

// Map component names to module component_keys
export const COMPONENT_TO_MODULE_KEY: Record<string, string> = {
  'Empoderamiento en salud': 'empoderamiento_salud',
  'Red de apoyo': 'red_de_apoyo',
  'Acceso y adherencia a medicamentos': 'adherencia',
  'Actividad física': 'actividad_fisica',
  'Alimentación': 'alimentacion',
  'Salud mental': 'salud_mental',
  'Salud de sueño': 'sueno',
  'Presión arterial': 'presion_arterial',
  'Glucosa': 'glucosa',
  'Colesterol': 'colesterol',
  'Nicotina': 'nicotina',
  'Control del peso': 'control_peso',
  'Salud Sexual': 'salud_sexual',
  'Salud Sexual Masculina': 'salud_sexual',
}

// Submodules (Sections within modules)
export type SectionContentType = 'text' | 'video' | 'html' | 'mixed'

export interface Submodule {
  id: string
  module_id: string
  title: string
  description: string | null
  estimated_minutes: number | null
  content_type: SectionContentType | null
  content: SectionContent | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SectionContent {
  text?: string
  video_url?: string
  html?: string
}

export interface SubmoduleCompletion {
  id: string
  user_id: string
  submodule_id: string
  completed_at: string
}

// Patient Module Unlocks
export interface PatientModuleUnlock {
  id: string
  patient_id: string
  module_id: string
  unlocked_at: string
}

// Module PDFs
export interface ModulePdf {
  id: string
  module_id: string
  submodule_id: string | null
  filename: string
  storage_path: string
  file_size: number | null
  created_at: string
}

// ====== DERIVED TYPES ======

export type ModuleStatus = 'completed' | 'current' | 'locked_next' | 'locked_future'

export interface ModuleWithStatus extends Module {
  status: ModuleStatus
  unlock_date: Date | null
  completed_at?: string
  progress_percent: number
  submodules_total: number
  submodules_completed: number
}

// Tipos para contenido de bloques
export interface VideoContent {
  url: string
  provider: 'youtube' | 'vimeo'
}

export interface TextContent {
  html: string
}

export interface PdfContent {
  url: string
  filename: string
}

export interface QuizQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_options: string[]
  type: 'single' | 'multiple'
}

export interface QuizContent {
  questions: QuizQuestion[]
}

export interface TaskContent {
  title: string
  instructions: string
}

// Blog comunitario
export type BlogPostStatus = 'pending' | 'approved' | 'rejected'

export interface BlogPost {
  id: string
  patient_id: string
  patient_name?: string
  content: string
  status: BlogPostStatus
  rejection_reason: string | null
  moderator_response: string | null
  responded_by: string | null
  responded_at: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

// App configuration
export interface AppConfig {
  id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

// Sistema de Recompensas
export type AchievementCategory = 'module' | 'special' | 'streak'
export type AchievementRequirementType =
  | 'module_complete'
  | 'modules_count'
  | 'streak_days'
  | 'first_login'
  | 'all_modules'

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  requirement_type: AchievementRequirementType
  requirement_value: number
  module_key: string | null
  sort_order: number
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  notified: boolean
  achievement?: Achievement
}

export interface UserCertificate {
  id: string
  user_id: string
  issued_at: string
  certificate_number: string
}
