"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Submodule, SectionContentType, SectionContent } from "@/types/database"

export default function SubmoduleEditor({
  moduleId,
  submodules: initialSubmodules,
}: {
  moduleId: string
  submodules: Submodule[]
}) {
  const [submodules, setSubmodules] = useState(initialSubmodules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditFormData | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newData, setNewData] = useState<EditFormData>(getEmptyForm())
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  function getEmptyForm(): EditFormData {
    return {
      title: "",
      description: "",
      estimated_minutes: "",
      content_type: "text" as SectionContentType,
      content_text: "",
      content_video_url: "",
      content_html: "",
    }
  }

  async function handleAdd() {
    if (!newData.title.trim()) return
    setSaving(true)

    const nextOrder = submodules.length > 0
      ? Math.max(...submodules.map((s) => s.sort_order)) + 1
      : 1

    const content = buildContent(newData)

    const { data, error } = await supabase
      .from("submodules")
      .insert({
        module_id: moduleId,
        title: newData.title.trim(),
        description: newData.description.trim() || null,
        estimated_minutes: newData.estimated_minutes ? parseInt(newData.estimated_minutes) : null,
        content_type: newData.content_type,
        content: content,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (!error && data) {
      setSubmodules((prev) => [...prev, data])
      setNewData(getEmptyForm())
      setAddingNew(false)
    }
    setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sección? Esta acción no se puede deshacer.")) return

    await supabase.from("submodules").delete().eq("id", id)
    setSubmodules((prev) => prev.filter((s) => s.id !== id))
    router.refresh()
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= submodules.length) return

    const newList = [...submodules]
    const temp = newList[index]
    newList[index] = newList[newIndex]
    newList[newIndex] = temp

    const updated = newList.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSubmodules(updated)

    for (const sub of updated) {
      await supabase
        .from("submodules")
        .update({ sort_order: sub.sort_order })
        .eq("id", sub.id)
    }
    router.refresh()
  }

  async function handleSaveEdit() {
    if (!editingId || !editData || !editData.title.trim()) return

    const content = buildContent(editData)

    await supabase
      .from("submodules")
      .update({
        title: editData.title.trim(),
        description: editData.description.trim() || null,
        estimated_minutes: editData.estimated_minutes ? parseInt(editData.estimated_minutes) : null,
        content_type: editData.content_type,
        content: content,
      })
      .eq("id", editingId)

    setSubmodules((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? {
              ...s,
              title: editData.title.trim(),
              description: editData.description.trim() || null,
              estimated_minutes: editData.estimated_minutes ? parseInt(editData.estimated_minutes) : null,
              content_type: editData.content_type as SectionContentType,
              content: content,
            }
          : s
      )
    )
    setEditingId(null)
    setEditData(null)
    router.refresh()
  }

  function startEdit(sub: Submodule) {
    setEditingId(sub.id)
    setEditData({
      title: sub.title,
      description: sub.description || "",
      estimated_minutes: sub.estimated_minutes?.toString() || "",
      content_type: sub.content_type || "text",
      content_text: (sub.content as SectionContent)?.text || "",
      content_video_url: (sub.content as SectionContent)?.video_url || "",
      content_html: (sub.content as SectionContent)?.html || "",
    })
  }

  function buildContent(data: EditFormData): SectionContent {
    const content: SectionContent = {}
    if (data.content_type === "text" || data.content_type === "mixed") {
      content.text = data.content_text
    }
    if (data.content_type === "video" || data.content_type === "mixed") {
      content.video_url = data.content_video_url
    }
    if (data.content_type === "html" || data.content_type === "mixed") {
      content.html = data.content_html
    }
    return content
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-neutral">
        Secciones del módulo ({submodules.length})
      </h2>

      {/* List of submodules */}
      <div className="space-y-2 mb-4">
        {submodules.map((sub, index) => (
          <div
            key={sub.id}
            className="rounded-lg border border-tertiary/20 p-3"
          >
            {editingId === sub.id && editData ? (
              <SectionForm
                data={editData}
                onChange={setEditData}
                onSave={handleSaveEdit}
                onCancel={() => { setEditingId(null); setEditData(null) }}
                saving={saving}
                saveLabel="Guardar cambios"
              />
            ) : (
              <div className="flex items-center gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-0.5 text-tertiary hover:text-secondary disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === submodules.length - 1}
                    className="p-0.5 text-tertiary hover:text-secondary disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Order number */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>

                {/* Content preview */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral text-sm truncate">{sub.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sub.description && (
                      <p className="text-xs text-tertiary truncate">{sub.description}</p>
                    )}
                    {sub.estimated_minutes && (
                      <span className="shrink-0 rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                        {sub.estimated_minutes} min
                      </span>
                    )}
                    {sub.content_type && (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
                        {sub.content_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(sub)}
                    className="rounded px-2 py-1 text-xs text-secondary hover:bg-secondary/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="rounded px-2 py-1 text-xs text-error hover:bg-error/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {submodules.length === 0 && (
          <p className="text-sm text-tertiary text-center py-3">
            No hay secciones. Agregue secciones para este módulo.
          </p>
        )}
      </div>

      {/* Add new section */}
      {addingNew ? (
        <div className="rounded-lg border-2 border-dashed border-secondary/30 p-4">
          <p className="text-sm font-medium text-neutral mb-3">Nueva sección</p>
          <SectionForm
            data={newData}
            onChange={setNewData}
            onSave={handleAdd}
            onCancel={() => { setAddingNew(false); setNewData(getEmptyForm()) }}
            saving={saving}
            saveLabel="Agregar sección"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="w-full rounded-lg border-2 border-dashed border-tertiary/20 px-4 py-3 text-sm font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary"
        >
          + Agregar sección
        </button>
      )}
    </div>
  )
}

interface EditFormData {
  title: string
  description: string
  estimated_minutes: string
  content_type: SectionContentType
  content_text: string
  content_video_url: string
  content_html: string
}

function SectionForm({
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  saveLabel,
}: {
  data: EditFormData
  onChange: (data: EditFormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-tertiary">Título *</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Título de la sección"
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-tertiary">Duración estimada (minutos)</label>
          <input
            type="number"
            value={data.estimated_minutes}
            onChange={(e) => onChange({ ...data, estimated_minutes: e.target.value })}
            placeholder="Ej: 5"
            min="1"
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-tertiary">Descripción corta</label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Se muestra al paciente antes de expandir la sección"
          className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-tertiary">Tipo de contenido</label>
        <select
          value={data.content_type}
          onChange={(e) => onChange({ ...data, content_type: e.target.value as SectionContentType })}
          className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
        >
          <option value="text">Texto</option>
          <option value="video">Video</option>
          <option value="html">HTML</option>
          <option value="mixed">Mixto (texto + video + HTML)</option>
        </select>
      </div>

      {/* Content fields based on type */}
      {(data.content_type === "text" || data.content_type === "mixed") && (
        <div>
          <label className="mb-1 block text-xs text-tertiary">Contenido de texto</label>
          <textarea
            value={data.content_text}
            onChange={(e) => onChange({ ...data, content_text: e.target.value })}
            rows={4}
            placeholder="Texto del contenido de esta sección..."
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          />
        </div>
      )}

      {(data.content_type === "video" || data.content_type === "mixed") && (
        <div>
          <label className="mb-1 block text-xs text-tertiary">URL del video (YouTube, Vimeo)</label>
          <input
            type="url"
            value={data.content_video_url}
            onChange={(e) => onChange({ ...data, content_video_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          />
        </div>
      )}

      {(data.content_type === "html" || data.content_type === "mixed") && (
        <div>
          <label className="mb-1 block text-xs text-tertiary">Contenido HTML</label>
          <textarea
            value={data.content_html}
            onChange={(e) => onChange({ ...data, content_html: e.target.value })}
            rows={6}
            placeholder="<h2>Título</h2><p>Contenido...</p>"
            className="w-full rounded-lg border border-tertiary/30 px-3 py-2 font-mono text-sm text-neutral focus:border-secondary focus:outline-none"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !data.title.trim()}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-tertiary transition-colors hover:bg-background hover:text-neutral"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
