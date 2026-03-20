"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Message } from "@/types/database"

export default function AdminMessageThread({
  messages: initialMessages,
  patientId,
  adminId,
}: {
  messages: Message[]
  patientId: string
  adminId: string
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

    const { data, error } = await supabase
      .from("messages")
      .insert({
        from_user_id: adminId,
        to_user_id: patientId,
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

  return (
    <div className="flex h-80 flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-tertiary">Sin mensajes</p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.from_user_id === adminId
            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    isAdmin
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm bg-background text-neutral"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  <p
                    className={`mt-0.5 text-right text-[10px] ${
                      isAdmin ? "text-white/50" : "text-tertiary/50"
                    }`}
                  >
                    {new Date(msg.sent_at).toLocaleString("es-CO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-tertiary/10 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Responder..."
            className="flex-1 rounded-lg border border-tertiary/30 px-3 py-2 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
