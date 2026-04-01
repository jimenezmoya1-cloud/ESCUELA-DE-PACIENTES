"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { BlogPost } from "@/types/database"

type TabType = "pending" | "approved" | "rejected"

export default function BlogModerationClient({
  posts: initialPosts,
  enVivoUrl: initialEnVivoUrl,
}: {
  posts: BlogPost[]
  enVivoUrl: string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [enVivoUrl, setEnVivoUrl] = useState(initialEnVivoUrl)
  const [savingUrl, setSavingUrl] = useState(false)
  const [editingUrl, setEditingUrl] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const pendingPosts = posts.filter((p) => p.status === "pending")
  const approvedPosts = posts.filter((p) => p.status === "approved")
  const rejectedPosts = posts.filter((p) => p.status === "rejected")

  async function handleApprove(postId: string) {
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from("blog_posts")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: user?.id,
      })
      .eq("id", postId)

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: "approved" as const, approved_at: now, approved_by: user?.id ?? null }
          : p
      )
    )
    router.refresh()
  }

  async function handleReject(postId: string) {
    await supabase
      .from("blog_posts")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim() || null,
      })
      .eq("id", postId)

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: "rejected" as const, rejection_reason: rejectionReason.trim() || null }
          : p
      )
    )
    setRejectingId(null)
    setRejectionReason("")
    router.refresh()
  }

  async function handleRespond(postId: string) {
    if (!responseText.trim()) return
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from("blog_posts")
      .update({
        moderator_response: responseText.trim(),
        responded_by: user?.id,
        responded_at: now,
      })
      .eq("id", postId)

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              moderator_response: responseText.trim(),
              responded_by: user?.id ?? null,
              responded_at: now,
            }
          : p
      )
    )
    setRespondingId(null)
    setResponseText("")
    router.refresh()
  }

  async function handleSaveUrl() {
    setSavingUrl(true)
    await supabase
      .from("app_config")
      .upsert(
        { key: "en_vivo_caimed_url", value: enVivoUrl },
        { onConflict: "key" }
      )
    setSavingUrl(false)
    setEditingUrl(false)
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: pendingPosts.length },
    { key: "approved", label: "Aprobados", count: approvedPosts.length },
    { key: "rejected", label: "Rechazados", count: rejectedPosts.length },
  ]

  const displayPosts =
    activeTab === "pending"
      ? pendingPosts
      : activeTab === "approved"
        ? approvedPosts
        : rejectedPosts

  return (
    <div className="space-y-6">
      {/* En Vivo URL config */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-neutral">URL del En Vivo CAIMED</p>
            <p className="text-xs text-tertiary">Esta URL se muestra a pacientes al publicar un mensaje</p>
          </div>
          {!editingUrl && (
            <button
              onClick={() => setEditingUrl(true)}
              className="rounded-lg border border-secondary/30 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/5"
            >
              Editar
            </button>
          )}
        </div>
        {editingUrl ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={enVivoUrl}
              onChange={(e) => setEnVivoUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
            />
            <button
              onClick={handleSaveUrl}
              disabled={savingUrl}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
            >
              {savingUrl ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setEditingUrl(false); setEnVivoUrl(initialEnVivoUrl) }}
              className="rounded-lg px-3 py-2 text-sm text-tertiary hover:text-neutral"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-sm text-neutral font-mono">
            {enVivoUrl || <span className="text-tertiary italic">No configurada</span>}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-tertiary hover:text-neutral"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-background text-tertiary"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="space-y-4">
        {displayPosts.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-tertiary">No hay mensajes {activeTab === "pending" ? "pendientes" : activeTab === "approved" ? "aprobados" : "rechazados"}.</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <div key={post.id} className="rounded-xl bg-white p-5 shadow-sm">
              {/* Post header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold text-primary">
                      {(post.patient_name || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral">{post.patient_name}</p>
                    <p className="text-xs text-tertiary">
                      {new Date(post.created_at).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    post.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : post.status === "approved"
                        ? "bg-[#58AE33]/10 text-[#58AE33]"
                        : "bg-error/10 text-error"
                  }`}
                >
                  {post.status === "pending" ? "Pendiente" : post.status === "approved" ? "Aprobado" : "Rechazado"}
                </span>
              </div>

              {/* Post content */}
              <p className="whitespace-pre-wrap text-sm text-neutral/80 leading-relaxed mb-4">
                {post.content}
              </p>

              {/* Rejection reason */}
              {post.rejection_reason && (
                <div className="mb-4 rounded-lg bg-error/5 border border-error/20 px-4 py-3">
                  <p className="text-xs font-medium text-error">Motivo de rechazo:</p>
                  <p className="mt-1 text-xs text-neutral/70">{post.rejection_reason}</p>
                </div>
              )}

              {/* Moderator response */}
              {post.moderator_response && (
                <div className="mb-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                  <p className="text-xs font-medium text-primary">Respuesta del moderador:</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-neutral/70">{post.moderator_response}</p>
                </div>
              )}

              {/* Actions for pending */}
              {post.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApprove(post.id)}
                    className="rounded-lg bg-[#58AE33] px-4 py-2 text-xs font-medium text-white hover:bg-[#58AE33]/90"
                  >
                    Aprobar
                  </button>
                  {rejectingId === post.id ? (
                    <div className="flex w-full flex-col gap-2 mt-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                        placeholder="Motivo de rechazo (opcional)"
                        className="w-full rounded-lg border border-error/30 px-3 py-2 text-xs text-neutral focus:border-error focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(post.id)}
                          className="rounded-lg bg-error px-4 py-2 text-xs font-medium text-white hover:bg-error/90"
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectionReason("") }}
                          className="rounded-lg px-3 py-2 text-xs text-tertiary hover:text-neutral"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(post.id)}
                      className="rounded-lg border border-error/30 px-4 py-2 text-xs font-medium text-error hover:bg-error/5"
                    >
                      Rechazar
                    </button>
                  )}
                </div>
              )}

              {/* Respond button for approved posts */}
              {post.status === "approved" && (
                <div className="mt-2">
                  {respondingId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                        placeholder="Escribe tu respuesta..."
                        className="w-full rounded-lg border border-primary/30 px-3 py-2 text-sm text-neutral focus:border-primary focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(post.id)}
                          disabled={!responseText.trim()}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          Enviar respuesta
                        </button>
                        <button
                          onClick={() => { setRespondingId(null); setResponseText("") }}
                          className="rounded-lg px-3 py-2 text-xs text-tertiary hover:text-neutral"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setRespondingId(post.id); setResponseText(post.moderator_response || "") }}
                      className="rounded-lg border border-primary/20 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      {post.moderator_response ? "Editar respuesta" : "Responder"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
