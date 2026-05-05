import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyReminder1h } from "@/lib/notifications/triggers"
import { getSchedulingConfig } from "@/lib/payments/config"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron — corre cada 5 minutos.
 * Busca citas que arrancan en ~1h (ventana 55min-65min) y aún no tienen
 * reminder_1h_sent_at. Manda recordatorio + marca timestamp.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now + 55 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 65 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id, patient_id, clinician_id, starts_at")
    .eq("status", "scheduled")
    .is("reminder_1h_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)

  if (error) {
    console.error("[cron 1h] query failed:", error.message)
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
      await notifyReminder1h({
        patientId: apt.patient_id,
        clinicianId: apt.clinician_id,
        startsAtIso: apt.starts_at,
        teamsUrl,
      })
      const { error: updErr } = await admin
        .from("appointments")
        .update({ reminder_1h_sent_at: new Date().toISOString() })
        .eq("id", apt.id)
      if (updErr) {
        console.error("[cron 1h] mark sent failed:", updErr.message, { id: apt.id })
        failed++
      } else {
        processed++
      }
    } catch (e) {
      console.error("[cron 1h] notification failed:", e, { id: apt.id })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed, failed, total: list.length })
}
