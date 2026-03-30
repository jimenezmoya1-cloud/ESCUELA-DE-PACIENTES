"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Submodule } from "@/types/database"

export default function SubmoduleEditor({
  moduleId,
  submodules: initialSubmodules,
}: {
  moduleId: string
  submodules: Submodule[]
}) {
  const [submodules, setSubmodules] = useState(initialSubmodules)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)

    const nextOrder = submodules.length > 0
      ? Math.max(...submodules.map((s) => s.sort_order)) + 1
      : 1

    const { data, error } = await supabase
      .from("submodules")
      .insert({
        module_id: moduleId,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (!error && data) {
      setSubmodules((prev) => [...prev, data])
      setNewTitle("")
      setNewDescription("")
    }
    setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este submódulo?")) return

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

    // Update sort_order
    const updated = newList.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSubmodules(updated)

    // Persist
    for (const sub of updated) {
      await supabase
        .from("submodules")
        .update({ sort_order: sub.sort_order })
        .eq("id", sub.id)
    }
    router.refresh()
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return

    await supabase
      .from("submodules")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", editingId)

    setSubmodules((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, title: editTitle.trim(), description: editDescription.trim() || null }
          : s
      )
    )
    setEditingId(null)
    router.refresh()
  }

  function startEdit(sub: Submodule) {
    setEditingId(sub.id)
    setEditTitle(sub.title)
    setEditDescription(sub.description || "")
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-neutral">
        Submódulos / Secciones ({submodules.length})
      </h2>

      {/* List of submodules */}
      <div className="space-y-2 mb-4">
        {submodules.map((sub, index) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 rounded-lg border border-tertiary/20 p-3"
          >
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

            {/* Content */}
            {editingId === sub.id ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full rounded-lg border border-tertiary/30 px-3 py-1.5 text-xs text-neutral focus:border-secondary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="rounded bg-secondary px-3 py-1 text-xs text-white hover:bg-secondary/90"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded px-3 py-1 text-xs text-tertiary hover:text-neutral"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral text-sm truncate">{sub.title}</p>
                {sub.description && (
                  <p className="text-xs text-tertiary truncate">{sub.description}</p>
                )}
              </div>
            )}

            {/* Actions */}
            {editingId !== sub.id && (
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
            )}
          </div>
        ))}
        {submodules.length === 0 && (
          <p className="text-sm text-tertiary text-center py-3">
            No hay submódulos. Agregue secciones para este módulo.
          </p>
        )}
      </div>

      {/* Add new submodule */}
      <div className="space-y-2 rounded-lg border-2 border-dashed border-tertiary/20 p-4">
        <p className="text-xs font-medium text-tertiary mb-2">Agregar nuevo submódulo</p>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Título del submódulo"
          className="w-full rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          className="w-full rounded-lg border border-tertiary/30 px-3 py-1.5 text-xs text-neutral focus:border-secondary focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newTitle.trim()}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
        >
          {saving ? "Agregando..." : "+ Agregar submódulo"}
        </button>
      </div>
    </div>
  )
}
