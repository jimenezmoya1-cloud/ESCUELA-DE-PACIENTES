import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyReminder24h } from "@/lib/notifications/triggers"
import { getSchedulingConfig } from "@/lib/payments/config"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron — corre cada hora.
 * Busca citas que arrancan en ~24h (ventana 23h-25h) y aún no tienen
 * reminder_24h_sent_at. Manda recordatorio + marca timestamp para idempotencia.
 *
 * Protegido con header `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron 24h] CRON_SECRET not configured — endpoint disabled")
    return NextResponse.json({ error: "misconfigured" }, { status: 500 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now + 23 * 60 * 60 * 1000).toISOString()       // 23h ahead
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000).toISOString()         // 25h ahead

  const admin = createAdminClient()
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id, patient_id, starts_at")
    .eq("status", "scheduled")
    .is("reminder_24h_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)

  if (error) {
    console.error("[cron 24h] query failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const list = appointments ?? []
  if (list.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  const config = await getSchedulingConfig()
  const teamsUrl = config.teamsMeetingUrl

  let processed = 0
  let failed = 0
  for (const apt of list) {
    try {
      await notifyReminder24h({
        patientId: apt.patient_id,
        startsAtIso: apt.starts_at,
        teamsUrl,
      })
      // Marcar enviado (idempotencia — si la próxima corrida ve este timestamp, salta)
      const { error: updErr } = await admin
        .from("appointments")
        .update({ reminder_24h_sent_at: new Date().toISOString() })
        .eq("id", apt.id)
      if (updErr) {
        console.error("[cron 24h] mark sent failed:", updErr.message, { id: apt.id })
        failed++
      } else {
        processed++
      }
    } catch (e) {
      console.error("[cron 24h] notification failed:", e, { id: apt.id })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed, failed, total: list.length })
}
