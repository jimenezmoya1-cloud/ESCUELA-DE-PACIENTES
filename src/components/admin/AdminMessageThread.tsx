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
            if (msg.is_system) {
              return (
                <div key={msg.id} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-neutral my-2">
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 shrink-0 mt-0.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h.01a1 1 0 100-2H10V9a1 1 0 00-1 0z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wide text-primary mb-0.5">CAIMED · Sistema</div>
                      <div>{msg.body}</div>
                    </div>
                  </div>
                </div>
              )
            }
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
