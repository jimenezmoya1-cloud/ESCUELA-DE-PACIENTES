import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer"
import React from "react"

export const runtime = "nodejs"

const styles = StyleSheet.create({
  page: { padding: 60, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  border: {
    flex: 1,
    borderWidth: 4,
    borderColor: "#06559F",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 16, color: "#06559F", fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 44, fontWeight: 900, color: "#212B52", marginVertical: 20, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 30, textAlign: "center" },
  name: { fontSize: 36, fontWeight: 700, color: "#06559F", marginVertical: 20, textAlign: "center" },
  body: { fontSize: 14, color: "#374151", marginVertical: 15, textAlign: "center", lineHeight: 1.5 },
  footer: { marginTop: 40, alignItems: "center" },
  date: { fontSize: 12, color: "#6B7280" },
  certNum: { fontSize: 10, color: "#9CA3AF", marginTop: 10 },
})

function CertificatePdf({ name, certNumber, date }: { name: string; certNumber: string; date: string }) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>ESCUELA DE PACIENTES — CAIMED</Text>
          <Text style={styles.title}>Certificado de Finalización</Text>
          <Text style={styles.subtitle}>Programa de Salud Cardiovascular</Text>
          <Text style={styles.body}>Se otorga a:</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.body}>
            Por haber completado exitosamente todos los módulos del programa{"\n"}
            Escuela de Pacientes en Salud Cardiovascular, demostrando compromiso{"\n"}
            con el cuidado de su salud y bienestar.
          </Text>
          <View style={styles.footer}>
            <Text style={styles.date}>Otorgado el {date}</Text>
            <Text style={styles.certNum}>Certificado No. {certNumber}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: firefighter } = await admin
    .from("achievements")
    .select("id")
    .eq("key", "special_firefighter")
    .single()

  if (!firefighter) return NextResponse.json({ error: "no firefighter badge" }, { status: 500 })

  const { data: unlock } = await admin
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", firefighter.id)
    .maybeSingle()

  if (!unlock) return NextResponse.json({ error: "certificate not earned" }, { status: 403 })

  const { data: userRow } = await admin
    .from("users")
    .select("name")
    .eq("id", userId)
    .single()

  let { data: cert } = await admin
    .from("user_certificates")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!cert) {
    const certNumber = `CAIMED-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`
    const { data: newCert } = await admin
      .from("user_certificates")
      .insert({ user_id: userId, certificate_number: certNumber })
      .select()
      .single()
    cert = newCert
  }

  if (!cert) return NextResponse.json({ error: "failed to create cert" }, { status: 500 })

  const dateStr = new Date(cert.issued_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const stream = await renderToStream(
    React.createElement(CertificatePdf, {
      name: userRow?.name ?? "Paciente",
      certNumber: cert.certificate_number,
      date: dateStr,
    })
  )

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-caimed.pdf"`,
    },
  })
}
