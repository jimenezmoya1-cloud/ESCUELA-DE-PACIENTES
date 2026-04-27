import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const badgeKey = searchParams.get("badge")
  const userId = searchParams.get("user")

  if (!badgeKey || !userId) {
    return new Response("missing params", { status: 400 })
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const [achRes, userRes] = await Promise.all([
    fetch(`${sbUrl}/rest/v1/achievements?key=eq.${badgeKey}&select=*`, {
      headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}` },
    }),
    fetch(`${sbUrl}/rest/v1/users?id=eq.${userId}&select=name`, {
      headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}` },
    }),
  ])

  const [achievement] = (await achRes.json()) as Array<{
    title: string
    description: string
    icon: string
    category: string
  }>
  const [userRow] = (await userRes.json()) as Array<{ name: string }>

  if (!achievement) return new Response("not found", { status: 404 })

  const bgGradient =
    achievement.category === "streak"
      ? "linear-gradient(135deg, #FB923C, #DC2626)"
      : achievement.category === "special"
        ? "linear-gradient(135deg, #F59E0B, #B45309)"
        : "linear-gradient(135deg, #06559F, #1E8DCE)"

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "260px",
            height: "260px",
            borderRadius: "50%",
            background: bgGradient,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: "140px", color: "white" }}>🏅</div>
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "#212B52",
            margin: "32px 0 8px",
            textAlign: "center",
          }}
        >
          {achievement.title}
        </h1>
        <p style={{ fontSize: "28px", color: "#6B7280", margin: 0, textAlign: "center" }}>
          {userRow?.name ?? ""}
        </p>
        <p
          style={{
            fontSize: "24px",
            color: "#06559F",
            marginTop: "40px",
            fontWeight: 700,
          }}
        >
          Escuela de Pacientes CAIMED
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
