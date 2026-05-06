import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')!
const SERVICE_ACCOUNT_KEY = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!)

async function getAccessToken(): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const claim = btoa(JSON.stringify({
    iss: SERVICE_ACCOUNT_KEY.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(SERVICE_ACCOUNT_KEY.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  )
  const jwt = `${header}.${claim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const { access_token } = await res.json()
  return access_token
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

serve(async (req) => {
  try {
    const { record } = await req.json()
    const token = await getAccessToken()

    const row = [
      new Date(record.created_at).toLocaleDateString('es-CO'),
      `${record.nombre} ${record.apellido}`,
      record.cedula,
      record.telefono,
      record.email ?? '',
      record.score_parcial,
      record.nivel,
      (record.enfermedades ?? []).join(', '),
      record.estado,
    ]

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:I:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      },
    )

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    console.error('sync-lead-to-sheets error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
