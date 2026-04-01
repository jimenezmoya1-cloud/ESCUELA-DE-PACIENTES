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
export const AVAILABLE_COMPONENTS = [
  'Empoderamiento en salud',
  'Red de apoyo',
  'Acceso a medicamentos',
  'Actividad física',
  'Alimentación',
  'Salud mental',
  'Sueño',
  'Presión arterial',
  'Glucosa',
  'Colesterol',
  'Nicotina',
] as const

// Fixed order for remaining modules (after priorities + optional salud sexual)
export const REMAINING_MODULES_ORDER = [
  'Empoderamiento en salud',
  'Red de apoyo',
  'Acceso a medicamentos',
  'Actividad física',
  'Alimentación',
  'Salud mental',
  'Sueño',
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
  'Acceso a medicamentos': 'adherencia',
  'Actividad física': 'actividad_fisica',
  'Alimentación': 'alimentacion',
  'Salud mental': 'salud_mental',
  'Sueño': 'sueno',
  'Presión arterial': 'presion_arterial',
  'Glucosa': 'glucosa',
  'Colesterol': 'colesterol',
  'Nicotina': 'nicotina',
  'Salud Sexual': 'salud_sexual',
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
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type AchievementCategory = 'modules' | 'quizzes' | 'tasks' | 'streaks' | 'special'

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  points: number
  requirement_type: string
  requirement_value: number
  tier: AchievementTier
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

export interface PointsLog {
  id: string
  user_id: string
  points: number
  reason: string
  reference_id: string | null
  created_at: string
}

export interface UserRewardsProfile {
  total_points: number
  current_streak: number
  best_streak: number
  modules_completed: number
  quizzes_completed: number
  quizzes_perfect: number
  tasks_submitted: number
  achievements_unlocked: UserAchievement[]
  all_achievements: Achievement[]
  discount_tier: 'none' | '25' | '30'
}
