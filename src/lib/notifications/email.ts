import { Resend } from "resend"
import { render } from "@react-email/render"
import type { ReactElement } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import type { EmailTemplateKey } from "./types"

let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will not be sent.")
    return null
  }
  if (!_resend) _resend = new Resend(key)
  return _resend
}

/**
 * Envía un email vía Resend y loggea el resultado en `email_log`.
 * No lanza errores — devuelve { ok }.
 */
export async function sendEmail(args: {
  to: string
  subject: string
  template: EmailTemplateKey
  body: ReactElement
  recipientId?: string | null         // user.id si aplica, para email_log
}): Promise<{ ok: boolean; error?: string }> {
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
  const replyTo = process.env.RESEND_REPLY_TO

  const resend = getResend()
  if (!resend) {
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: "RESEND_API_KEY not configured",
      resendId: null,
    })
    return { ok: false, error: "RESEND_API_KEY not configured" }
  }

  let html: string
  try {
    html = await render(args.body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render failed"
    console.error("[email] render failed:", msg)
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: msg,
      resendId: null,
    })
    return { ok: false, error: msg }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html,
      replyTo,
    })
    if (error) {
      const msg = error.message ?? "Resend error"
      console.error("[email] Resend error:", msg)
      await logEmail({
        recipient: args.to,
        recipientId: args.recipientId ?? null,
        template: args.template,
        status: "failed",
        error: msg,
        resendId: null,
      })
      return { ok: false, error: msg }
    }
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "sent",
      error: null,
      resendId: data?.id ?? null,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown send error"
    console.error("[email] send threw:", msg)
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: msg,
      resendId: null,
    })
    return { ok: false, error: msg }
  }
}

async function logEmail(args: {
  recipient: string
  recipientId: string | null
  template: string
  status: "sent" | "failed"
  error: string | null
  resendId: string | null
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("email_log").insert({
    recipient_id: args.recipientId,
    recipient_email: args.recipient,
    template: args.template,
    status: args.status,
    error_message: args.error,
    resend_id: args.resendId,
  })
  if (error) {
    console.error("[email_log] insert failed:", error.message)
  }
}
