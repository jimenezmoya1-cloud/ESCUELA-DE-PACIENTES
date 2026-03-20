"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Message } from "@/types/database"

export default function MessageThread({
  messages: initialMessages,
  currentUserId,
  adminMap,
}: {
  messages: Message[]
  currentUserId: string
  adminMap: Record<string, string>
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)

    // Enviar al primer admin disponible
    const adminId = Object.keys(adminMap)[0]
    if (!adminId) {
      setSending(false)
      return
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        from_user_id: currentUserId,
        to_user_id: adminId,
        body: newMessage.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data])
      setNewMessage("")
    }

    setSending(false)
    router.refresh()
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()

    if (isToday) {
      return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-xl bg-white shadow-sm lg:h-[calc(100vh-200px)]">
      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <svg className="mx-auto mb-3 h-12 w-12 text-tertiary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-tertiary">
                No tiene mensajes aún. Envíe un mensaje a su equipo médico.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.from_user_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "rounded-br-md bg-secondary text-white"
                      : "rounded-bl-md bg-background text-neutral"
                  }`}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-xs font-medium text-secondary">
                      {adminMap[msg.from_user_id] ?? "Equipo CAIMED"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isMine ? "text-white/60" : "text-tertiary/60"
                    }`}
                  >
                    {formatTime(msg.sent_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input de mensaje */}
      <form
        onSubmit={handleSend}
        className="border-t border-tertiary/10 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escriba su mensaje..."
            className="flex-1 rounded-lg border border-tertiary/30 px-4 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="rounded-lg bg-secondary px-4 py-2.5 text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
