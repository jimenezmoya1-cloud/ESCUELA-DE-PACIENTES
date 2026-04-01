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
  const [showConfirmation, setShowConfirmation] = useState(false)
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
    setShowConfirmation(true)
    setShowEnVivoModal(true)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212B52]">Comunidad</h1>
        <p className="mt-1 text-base text-tertiary">
          Comparte tus preguntas, experiencias y anécdotas con otros pacientes
        </p>
      </div>

      {/* Submit form */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#212B52]">Escribe tu mensaje</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Comparte una pregunta, experiencia o anécdota..."
          className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-[#1E8DCE] focus:outline-none focus:ring-2 focus:ring-[#1E8DCE]/20"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-tertiary">
            Tu mensaje será revisado por un moderador antes de publicarse.
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="rounded-lg bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar mensaje"}
          </button>
        </div>
      </div>

      {/* Confirmation toast */}
      {showConfirmation && (
        <div className="mb-6 rounded-xl border border-[#58AE33]/30 bg-[#58AE33]/5 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-[#58AE33] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#58AE33]">Mensaje enviado</p>
              <p className="mt-1 text-xs text-[#58AE33]/70">
                Recuerda que tu mensaje se publicará luego de que el moderador dé el visto bueno.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmation(false)}
              className="shrink-0 text-[#58AE33]/50 hover:text-[#58AE33]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* En Vivo CAIMED Modal */}
      {showEnVivoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#06559F]/10">
                <svg className="h-7 w-7 text-[#06559F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#212B52]">En Vivo CAIMED</h3>
              <p className="mt-2 text-sm text-tertiary leading-relaxed">
                Tus preguntas serán respondidas y los temas publicados se discutirán en el{" "}
                <strong className="text-[#06559F]">En Vivo CAIMED</strong>, el último viernes de cada mes.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowEnVivoModal(false)}
                  className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cerrar
                </button>
                <a
                  href={enVivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowEnVivoModal(false)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  Ir al En Vivo
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Published posts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#212B52]">
          Publicaciones ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-tertiary">Aún no hay publicaciones. ¡Sé el primero en compartir!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06559F]/10">
                  <span className="text-sm font-bold text-[#06559F]">
                    {(post.patient_name || "P")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#212B52]">{post.patient_name}</p>
                  <p className="text-xs text-tertiary">
                    {new Date(post.approved_at || post.created_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral/80 leading-relaxed">
                {post.content}
              </p>

              {/* Moderator response */}
              {post.moderator_response && (
                <div className="mt-4 rounded-lg bg-[#06559F]/5 border border-[#06559F]/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-[#06559F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span className="text-xs font-semibold text-[#06559F]">Respuesta del equipo CAIMED</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-neutral/70">
                    {post.moderator_response}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
