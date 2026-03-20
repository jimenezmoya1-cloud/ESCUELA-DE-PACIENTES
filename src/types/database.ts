export type UserRole = 'patient' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  access_code_used: string | null
  registered_at: string
  last_login_at: string | null
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

// Tipos derivados para la UI
export type ModuleStatus = 'completed' | 'current' | 'locked_next' | 'locked_future'

export interface ModuleWithStatus extends Module {
  status: ModuleStatus
  unlock_date: Date
  completed_at?: string
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
