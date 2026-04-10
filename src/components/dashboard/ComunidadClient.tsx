"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { BlogPost } from "@/types/database"

export default function ComunidadClient({
  posts,
  patientId,
  enVivoUrl,
}: {
  posts: BlogPost[]
  patientId: string
  enVivoUrl: string
}) {
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showEnVivoModal, setShowEnVivoModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)

    await supabase.from("blog_posts").insert({
      patient_id: patientId,
      content: content.trim(),
      status: "pending",
    })

    setContent("")
    setSubmitting(false)
    setSubmitted(true)

    // Show En Vivo modal after confirmation appears
    setTimeout(() => setShowEnVivoModal(true), 800)

    router.refresh()
  }

  function handleNewMessage() {
    setSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[#06559F] to-[#1E8DCE] px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Comunidad</h1>
              <p className="text-sm text-white/70">Escuela de Pacientes CAIMED</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            Comparte preguntas, experiencias y anécdotas con otros pacientes. Los temas se discuten en el <strong className="text-white">En Vivo CAIMED</strong> cada último viernes del mes.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">

        {/* Submit form */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#212B52]">Escribe tu mensaje</h2>
          </div>

          {submitted ? (
            <div className="px-5 py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#58AE33]/10">
                <svg className="h-7 w-7 text-[#58AE33]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[#212B52]">¡Mensaje enviado!</p>
              <p className="mt-1 text-sm text-tertiary leading-relaxed">
                Recuerda que tu mensaje se publicará luego de que el moderador dé el visto bueno.
              </p>
              <button
                onClick={handleNewMessage}
                className="mt-4 rounded-xl border-2 border-[#1E8DCE]/30 px-5 py-2 text-sm font-medium text-[#06559F] hover:bg-[#06559F]/5 transition-colors"
              >
                Escribir otro mensaje
              </button>
            </div>
          ) : (
            <div className="px-5 py-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="¿Tienes una pregunta, experiencia o anécdota para compartir?..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-neutral placeholder:text-tertiary/50 focus:border-[#1E8DCE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8DCE]/10 transition-all"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-tertiary">
                  Revisado por moderador antes de publicarse.
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Posts feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#212B52]">
              Publicaciones
              <span className="ml-2 rounded-full bg-[#06559F]/10 px-2 py-0.5 text-xs font-bold text-[#06559F]">
                {posts.length}
              </span>
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral">Aún no hay publicaciones</p>
              <p className="mt-1 text-xs text-tertiary">¡Sé el primero en compartir!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* En Vivo CAIMED Modal */}
      {showEnVivoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#06559F] to-[#1E8DCE]">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 mb-3">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-600">EN VIVO CAIMED</span>
              </div>
              <h3 className="text-lg font-bold text-[#212B52]">¡Nos vemos en el En Vivo!</h3>
              <p className="mt-2 text-sm text-tertiary leading-relaxed">
                Tus preguntas serán respondidas y los temas publicados se discutirán en el{" "}
                <strong className="text-[#06559F]">En Vivo CAIMED</strong>, el <strong>último viernes de cada mes</strong>.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {enVivoUrl && enVivoUrl !== "#" && (
                  <a
                    href={enVivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowEnVivoModal(false)}
                    className="w-full rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                  >
                    Ver transmisión
                  </a>
                )}
                <button
                  onClick={() => setShowEnVivoModal(false)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  const initial = (post.patient_name || "P")[0].toUpperCase()
  const dateStr = new Date(post.approved_at || post.created_at).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <article className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06559F] to-[#1E8DCE]">
          <span className="text-sm font-bold text-white">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#212B52] truncate">{post.patient_name}</p>
          <p className="text-xs text-tertiary">{dateStr}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-sm text-neutral/80 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Moderator response */}
      {post.moderator_response && (
        <div className="mx-4 mb-4 rounded-xl bg-[#06559F]/5 border border-[#06559F]/15 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06559F]">
              <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#06559F]">Equipo CAIMED</span>
          </div>
          <p className="text-sm text-neutral/70 leading-relaxed whitespace-pre-wrap">
            {post.moderator_response}
          </p>
        </div>
      )}
    </article>
  )
}
