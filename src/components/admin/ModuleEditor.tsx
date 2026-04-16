"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Module, ContentBlock, ContentBlockType } from "@/types/database"

export default function ModuleEditor({
  module,
  blocks: initialBlocks,
}: {
  module: Module | null
  blocks: ContentBlock[]
}) {
  const isNew = !module
  const [title, setTitle] = useState(module?.title ?? "")
  const [componentKey, setComponentKey] = useState(module?.component_key ?? "")
  const [shortDescription, setShortDescription] = useState(module?.short_description ?? "")
  const [longDescription, setLongDescription] = useState(module?.long_description ?? "")
  const [isPublished, setIsPublished] = useState(module?.is_published ?? true)
  const [blocks, setBlocks] = useState(initialBlocks)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)

    try {
      if (isNew) {
        // Obtener el próximo order
        const { data: maxOrder } = await supabase
          .from("modules")
          .select("order")
          .order("order", { ascending: false })
          .limit(1)
          .single()

        const nextOrder = (maxOrder?.order ?? 0) + 1

        const { data: newModule, error } = await supabase
          .from("modules")
          .insert({
            title,
            component_key: componentKey.trim() || null,
            short_description: shortDescription || null,
            long_description: longDescription || null,
            order: nextOrder,
            days_to_unlock: (nextOrder - 1) * 7,
            is_published: isPublished,
          })
          .select()
          .single()

        if (error || !newModule) {
          alert("Error al crear el módulo")
          return
        }

        // Guardar bloques
        for (let i = 0; i < blocks.length; i++) {
          await supabase.from("content_blocks").insert({
            module_id: newModule.id,
            type: blocks[i].type,
            content: blocks[i].content,
            order: i + 1,
          })
        }

        router.push(`/admin/contenido/${newModule.id}`)
      } else {
        // Actualizar módulo existente
        await supabase
          .from("modules")
          .update({
            title,
            component_key: componentKey.trim() || null,
            short_description: shortDescription || null,
            long_description: longDescription || null,
            is_published: isPublished,
          })
          .eq("id", module.id)

        // Eliminar bloques existentes y recrear
        await supabase
          .from("content_blocks")
          .delete()
          .eq("module_id", module.id)

        for (let i = 0; i < blocks.length; i++) {
          await supabase.from("content_blocks").insert({
            module_id: module.id,
            type: blocks[i].type,
            content: blocks[i].content,
            order: i + 1,
          })
        }
      }

      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!module) return
    if (!confirm("¿Está seguro de eliminar este módulo? Esta acción no se puede deshacer.")) return

    setDeleting(true)
    await supabase.from("modules").delete().eq("id", module.id)
    router.push("/admin/contenido")
  }

  function addBlock(type: ContentBlockType) {
    const defaultContent: Record<ContentBlockType, Record<string, unknown>> = {
      video: { url: "", provider: "youtube" },
      text: { html: "" },
      pdf: { url: "", filename: "" },
      quiz: { questions: [] },
      task: { title: "", instructions: "" },
    }

    setBlocks((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        module_id: module?.id ?? "",
        type,
        content: defaultContent[type],
        order: prev.length + 1,
        created_at: new Date().toISOString(),
      },
    ])
  }

  function updateBlock(index: number, content: Record<string, unknown>) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, content } : b))
    )
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[newIndex]
    newBlocks[newIndex] = temp
    setBlocks(newBlocks)
  }

  return (
    <div className="space-y-6">
      {/* Datos del módulo */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral">Información del módulo</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-tertiary/30 px-4 py-2.5 text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">
              Component Key{" "}
              <span className="font-normal text-tertiary/60">(identificador único, ej: <code className="text-xs">control_peso</code>)</span>
            </label>
            <input
              type="text"
              value={componentKey}
              onChange={(e) => setComponentKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="ej: control_peso, el_incendio"
              className="w-full rounded-lg border border-tertiary/30 px-4 py-2.5 font-mono text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Descripción corta</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full rounded-lg border border-tertiary/30 px-4 py-2.5 text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Descripción larga</label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-tertiary/30 px-4 py-2.5 text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-tertiary/30 text-secondary focus:ring-secondary"
            />
            <label htmlFor="published" className="text-sm text-neutral">
              Publicado (visible para pacientes)
            </label>
          </div>
        </div>
      </div>

      {/* Bloques de contenido */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral">
          Bloques de contenido ({blocks.length})
        </h2>

        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="rounded-lg border border-tertiary/20 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    <button
                      onClick={() => moveBlock(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 text-tertiary hover:text-secondary disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveBlock(index, "down")}
                      disabled={index === blocks.length - 1}
                      className="p-0.5 text-tertiary hover:text-secondary disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase text-primary">
                    {block.type}
                  </span>
                </div>
                <button
                  onClick={() => removeBlock(index)}
                  className="text-xs text-error hover:underline"
                >
                  Eliminar
                </button>
              </div>

              <BlockEditor
                type={block.type}
                content={block.content as Record<string, unknown>}
                onChange={(content) => updateBlock(index, content)}
              />
            </div>
          ))}
        </div>

        {/* Agregar bloque */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => addBlock("video")} className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary">
            + Video
          </button>
          <button onClick={() => addBlock("text")} className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary">
            + Texto
          </button>
          <button onClick={() => addBlock("pdf")} className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary">
            + PDF
          </button>
          <button onClick={() => addBlock("quiz")} className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary">
            + Quiz
          </button>
          <button onClick={() => addBlock("task")} className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary">
            + Tarea
          </button>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
          >
            {deleting ? "Eliminando..." : "Eliminar módulo"}
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : isNew ? "Crear módulo" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}

function BlockEditor({
  type,
  content,
  onChange,
}: {
  type: string
  content: Record<string, unknown>
  onChange: (content: Record<string, unknown>) => void
}) {
  switch (type) {
    case "video":
      return (
        <div>
          <label className="mb-1 block text-xs text-tertiary">URL del video (YouTube o Vimeo)</label>
          <input
            type="url"
            value={(content.url as string) ?? ""}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
          />
        </div>
      )

    case "text":
      return (
        <div>
          <label className="mb-1 block text-xs text-tertiary">Contenido HTML</label>
          <textarea
            value={(content.html as string) ?? ""}
            onChange={(e) => onChange({ ...content, html: e.target.value })}
            rows={8}
            placeholder="<h2>Título</h2><p>Contenido...</p>"
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 font-mono text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
          />
          <p className="mt-1 text-xs text-tertiary">
            Puede usar HTML: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, etc.
          </p>
        </div>
      )

    case "pdf":
      return (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-tertiary">URL del PDF</label>
            <input
              type="url"
              value={(content.url as string) ?? ""}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-tertiary">Nombre del archivo</label>
            <input
              type="text"
              value={(content.filename as string) ?? ""}
              onChange={(e) => onChange({ ...content, filename: e.target.value })}
              placeholder="guia-alimentacion.pdf"
              className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
        </div>
      )

    case "quiz":
      return <QuizEditor content={content} onChange={onChange} />

    case "task":
      return (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-tertiary">Título de la tarea</label>
            <input
              type="text"
              value={(content.title as string) ?? ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-tertiary">Instrucciones</label>
            <textarea
              value={(content.instructions as string) ?? ""}
              onChange={(e) => onChange({ ...content, instructions: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
        </div>
      )

    default:
      return <p className="text-sm text-tertiary">Tipo no soportado: {type}</p>
  }
}

interface QuizQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_options: string[]
  type: "single" | "multiple"
}

function QuizEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>
  onChange: (content: Record<string, unknown>) => void
}) {
  const questions = (content.questions as QuizQuestion[]) ?? []

  function addQuestion() {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      text: "",
      options: [
        { id: `o-${Date.now()}-1`, text: "" },
        { id: `o-${Date.now()}-2`, text: "" },
      ],
      correct_options: [],
      type: "single",
    }
    onChange({ ...content, questions: [...questions, newQ] })
  }

  function updateQuestion(index: number, updated: QuizQuestion) {
    const newQuestions = [...questions]
    newQuestions[index] = updated
    onChange({ ...content, questions: newQuestions })
  }

  function removeQuestion(index: number) {
    onChange({ ...content, questions: questions.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded border border-tertiary/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-tertiary">Pregunta {qi + 1}</span>
            <div className="flex items-center gap-2">
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestion(qi, { ...q, type: e.target.value as "single" | "multiple", correct_options: [] })
                }
                className="rounded border border-tertiary/30 px-2 py-1 text-xs text-neutral"
              >
                <option value="single">Selección única</option>
                <option value="multiple">Selección múltiple</option>
              </select>
              <button
                onClick={() => removeQuestion(qi)}
                className="text-xs text-error hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>

          <input
            type="text"
            value={q.text}
            onChange={(e) => updateQuestion(qi, { ...q, text: e.target.value })}
            placeholder="Texto de la pregunta"
            className="mb-2 w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          />

          <div className="space-y-1">
            {q.options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type={q.type === "single" ? "radio" : "checkbox"}
                  name={`correct-${q.id}`}
                  checked={q.correct_options.includes(opt.id)}
                  onChange={(e) => {
                    let newCorrect: string[]
                    if (q.type === "single") {
                      newCorrect = e.target.checked ? [opt.id] : []
                    } else {
                      newCorrect = e.target.checked
                        ? [...q.correct_options, opt.id]
                        : q.correct_options.filter((id) => id !== opt.id)
                    }
                    updateQuestion(qi, { ...q, correct_options: newCorrect })
                  }}
                  className="h-3.5 w-3.5"
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = [...q.options]
                    newOptions[oi] = { ...opt, text: e.target.value }
                    updateQuestion(qi, { ...q, options: newOptions })
                  }}
                  placeholder={`Opción ${oi + 1}`}
                  className="flex-1 rounded border border-tertiary/30 px-2 py-1 text-sm text-neutral focus:border-secondary focus:outline-none"
                />
                {q.options.length > 2 && (
                  <button
                    onClick={() => {
                      const newOptions = q.options.filter((_, i) => i !== oi)
                      updateQuestion(qi, {
                        ...q,
                        options: newOptions,
                        correct_options: q.correct_options.filter((id) => id !== opt.id),
                      })
                    }}
                    className="text-xs text-error"
                  >
                    ✗
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              const newOpt = { id: `o-${Date.now()}`, text: "" }
              updateQuestion(qi, { ...q, options: [...q.options, newOpt] })
            }}
            className="mt-1 text-xs text-secondary hover:underline"
          >
            + Agregar opción
          </button>
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="rounded-lg border border-dashed border-tertiary/30 px-3 py-2 text-xs font-medium text-tertiary hover:border-secondary hover:text-secondary"
      >
        + Agregar pregunta
      </button>
    </div>
  )
}
