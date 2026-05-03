import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { buildClinicalExcel, todayStamp } from "@/lib/clinical/build-clinical-excel"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()
  const isStaff = profile?.is_active && (profile.role === "admin" || profile.role === "clinico")
  if (!isStaff) return NextResponse.json({ error: "Solo personal clínico" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const { buffer } = await buildClinicalExcel(supabase, {
    convenio: searchParams.get("convenio"),
    doctor: searchParams.get("doctor"),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="caimed-evaluaciones-${todayStamp()}.xlsx"`,
    },
  })
}
