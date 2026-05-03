import { NextResponse } from "next/server"
import { runClinicalBackup } from "@/lib/clinical/run-backup"

// Endpoint llamado por Vercel Cron Jobs (configurado en vercel.json).
// Vercel firma sus llamadas con el header `Authorization: Bearer <CRON_SECRET>`,
// que comparamos contra la env var. Cualquier otro caller queda bloqueado.

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const result = await runClinicalBackup("cron")
  if (!result.ok) {
    return NextResponse.json({ error: result.errorMessage }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    fileId: result.fileId,
    fileUrl: result.fileUrl,
    rowsExported: result.rowsExported,
    durationMs: result.durationMs,
  })
}

// Vercel Cron también soporta POST; lo cubrimos por si la config lo manda así.
export const POST = GET
