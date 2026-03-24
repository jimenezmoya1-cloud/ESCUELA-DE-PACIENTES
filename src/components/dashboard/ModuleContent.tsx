"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { ContentBlock, QuizResponse, TaskSubmission, QuizContent, QuizQuestion, VideoContent, TextContent, PdfContent, TaskContent, Achievement } from "@/types/database"
import { onModuleComplete, onQuizComplete, onTaskSubmit } from "@/lib/rewards-actions"
import CelebrationAnimation from "@/components/rewards/CelebrationAnimation"
import { AchievementUnlockToast } from "@/components/rewards/AchievementBadge"

export default function ModuleContent({
  moduleId,
  blocks,
  isCompleted: initialCompleted,
  existingQuizResponses,
  existingTaskSubmission,
}: {
  moduleId: string
  blocks: ContentBlock[]
  isCompleted: boolean
  existingQuizResponses: QuizResponse[]
  existingTaskSubmission: TaskSubmission | null
}) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [completing, setCompleting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleComplete() {
    setCompleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("module_completions").insert({
      user_id: user.id,
      module_id: moduleId,
    })

    // Otorgar puntos y verificar logros
    await onModuleComplete(user.id, moduleId)

    setIsCompleted(true)
    setCompleting(false)
    setShowCelebration(true)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <CelebrationAnimation show={showCelebration} onComplete={() => setShowCelebration(false)} />
      {newAchievement && (
        <AchievementUnlockToast
          achievement={newAchievement}
          onClose={() => setNewAchievement(null)}
        />
      )}

      {blocks.map((block) => (
        <ContentBlockRenderer
          key={block.id}
          block={block}
          moduleId={moduleId}
          existingQuizResponses={existingQuizResponses}
          existingTaskSubmission={existingTaskSubmission}
        />
      ))}

      {/* Botón de completado */}
      <div className="border-t border-tertiary/10 pt-8">
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 p-4 text-success">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Módulo completado — +100 puntos</span>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full rounded-xl bg-success px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-success/90 hover:shadow-xl disabled:opacity-50"
          >
            {completing ? "Guardando..." : "Marcar como completado"}
          </button>
        )}
      </div>
    </div>
  )
}

function ContentBlockRenderer({
  block,
  moduleId,
  existingQuizResponses,
  existingTaskSubmission,
}: {
  block: ContentBlock
  moduleId: string
  existingQuizResponses: QuizResponse[]
  existingTaskSubmission: TaskSubmission | null
}) {
  switch (block.type) {
    case "video":
      return <VideoBlock content={block.content as unknown as VideoContent} />
    case "text":
      return <TextBlock content={block.content as unknown as TextContent} />
    case "pdf":
      return <PdfBlock content={block.content as unknown as PdfContent} />
    case "quiz":
      return (
        <QuizBlock
          content={block.content as unknown as QuizContent}
          moduleId={moduleId}
          existingResponses={existingQuizResponses}
        />
      )
    case "task":
      return (
        <TaskBlock
          content={block.content as unknown as TaskContent}
          moduleId={moduleId}
          existingSubmission={existingTaskSubmission}
        />
      )
    default:
      return null
  }
}

function VideoBlock({ content }: { content: VideoContent }) {
  const embedUrl = getEmbedUrl(content.url)

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="Video del módulo"
        />
      </div>
    </div>
  )
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}

function TextBlock({ content }: { content: TextContent }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
      <div
        className="prose prose-neutral max-w-none prose-headings:text-neutral prose-p:text-neutral/80 prose-a:text-secondary prose-strong:text-neutral"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
    </div>
  )
}

function PdfBlock({ content }: { content: PdfContent }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-error/10">
          <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium text-neutral">{content.filename || "Documento PDF"}</p>
          <p className="text-sm text-tertiary">Archivo PDF para descargar</p>
        </div>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
        >
          Descargar
        </a>
      </div>
    </div>
  )
}

function QuizBlock({
  content,
  moduleId,
  existingResponses,
}: {
  content: QuizContent
  moduleId: string
  existingResponses: QuizResponse[]
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitted, setSubmitted] = useState(existingResponses.length > 0)
  const [results, setResults] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    existingResponses.forEach((r) => {
      map[r.question_id] = r.is_correct ?? false
    })
    return map
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  async function handleSubmitQuiz() {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newResults: Record<string, boolean> = {}

    for (const question of content.questions) {
      const userAnswer = answers[question.id] ?? []
      const isCorrect =
        userAnswer.length === question.correct_options.length &&
        userAnswer.every((a) => question.correct_options.includes(a))

      newResults[question.id] = isCorrect

      await supabase.from("quiz_responses").insert({
        user_id: user.id,
        module_id: moduleId,
        question_id: question.id,
        answer: userAnswer,
        is_correct: isCorrect,
      })
    }

    setResults(newResults)
    setSubmitted(true)
    setSubmitting(false)

    // Otorgar puntos
    const allCorrect = Object.values(newResults).every(Boolean)
    await onQuizComplete(user.id, moduleId, allCorrect)
  }

  const totalQuestions = content.questions.length
  const correctAnswers = Object.values(results).filter(Boolean).length

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-neutral">Evaluación</h3>

      <div className="space-y-6">
        {content.questions.map((q, qi) => (
          <QuestionItem
            key={q.id}
            question={q}
            index={qi}
            selectedAnswers={answers[q.id] ?? []}
            onChange={(selected) =>
              setAnswers((prev) => ({ ...prev, [q.id]: selected }))
            }
            submitted={submitted}
            isCorrect={results[q.id]}
          />
        ))}
      </div>

      {submitted ? (
        <div className="mt-6 rounded-lg bg-background p-4 text-center">
          <p className="text-lg font-semibold text-neutral">
            Resultado: {correctAnswers}/{totalQuestions}
          </p>
          <p className="text-sm text-tertiary">
            {correctAnswers === totalQuestions
              ? "¡Excelente! Todas las respuestas son correctas."
              : "Revise las respuestas marcadas para aprender más."}
          </p>
        </div>
      ) : (
        <button
          onClick={handleSubmitQuiz}
          disabled={submitting || Object.keys(answers).length < totalQuestions}
          className="mt-6 w-full rounded-lg bg-secondary px-4 py-3 font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Enviar respuestas"}
        </button>
      )}
    </div>
  )
}

function QuestionItem({
  question,
  index,
  selectedAnswers,
  onChange,
  submitted,
  isCorrect,
}: {
  question: QuizQuestion
  index: number
  selectedAnswers: string[]
  onChange: (selected: string[]) => void
  submitted: boolean
  isCorrect?: boolean
}) {
  const isMultiple = question.type === "multiple"

  function handleSelect(optionId: string) {
    if (submitted) return

    if (isMultiple) {
      const newSelected = selectedAnswers.includes(optionId)
        ? selectedAnswers.filter((id) => id !== optionId)
        : [...selectedAnswers, optionId]
      onChange(newSelected)
    } else {
      onChange([optionId])
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        submitted
          ? isCorrect
            ? "border-success/30 bg-success/5"
            : "border-error/30 bg-error/5"
          : "border-tertiary/20"
      }`}
    >
      <p className="mb-3 font-medium text-neutral">
        {index + 1}. {question.text}
      </p>
      <div className="space-y-2">
        {question.options.map((opt) => {
          const isSelected = selectedAnswers.includes(opt.id)
          const isCorrectOption = question.correct_options.includes(opt.id)

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={submitted}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                submitted
                  ? isCorrectOption
                    ? "border-success/50 bg-success/10 text-success"
                    : isSelected
                      ? "border-error/50 bg-error/10 text-error"
                      : "border-tertiary/20 text-tertiary"
                  : isSelected
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-tertiary/20 text-neutral hover:border-secondary/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-${isMultiple ? "sm" : "full"} border ${
                  isSelected ? "border-current bg-current" : "border-current/30"
                }`}
              >
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {opt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TaskBlock({
  content,
  moduleId,
  existingSubmission,
}: {
  content: TaskContent
  moduleId: string
  existingSubmission: TaskSubmission | null
}) {
  const [text, setText] = useState(existingSubmission?.content ?? "")
  const [submitted, setSubmitted] = useState(!!existingSubmission)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("task_submissions").insert({
      user_id: user.id,
      module_id: moduleId,
      content: text.trim(),
    })

    // Otorgar puntos
    await onTaskSubmit(user.id, moduleId)

    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
      <h3 className="mb-2 text-lg font-semibold text-neutral">
        {content.title || "Tarea"}
      </h3>
      {content.instructions && (
        <p className="mb-4 text-sm text-tertiary">{content.instructions}</p>
      )}

      {submitted ? (
        <div className="rounded-lg bg-success/5 border border-success/20 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-success">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Tarea enviada
          </div>
          <p className="whitespace-pre-wrap text-sm text-neutral/70">{text}</p>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Escriba su respuesta aquí..."
            className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="mt-3 rounded-lg bg-secondary px-6 py-2.5 font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar tarea"}
          </button>
        </>
      )}
    </div>
  )
}
