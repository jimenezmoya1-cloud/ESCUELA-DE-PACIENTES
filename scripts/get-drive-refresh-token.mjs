#!/usr/bin/env node
// ============================================================================
// Script one-time para obtener un OAuth refresh_token de Google Drive.
// Uso:
//   1. Crea OAuth Client ID tipo "Desktop app" en Google Cloud Console.
//   2. Copia el client_id y client_secret en las constantes de abajo (o
//      pasalas como argumentos: node scripts/get-drive-refresh-token.mjs <id> <secret>).
//   3. Corre el script. Te imprime una URL — ábrela en el navegador, autoriza
//      la app con la cuenta Google donde está la carpeta de backups.
//   4. Te redirige a una URL tipo http://localhost/?code=... (no carga, no importa).
//      Copia el valor del parámetro `code` y pegalo cuando el script lo pida.
//   5. El script imprime el REFRESH_TOKEN. Pegalo en .env.local como
//      GOOGLE_OAUTH_REFRESH_TOKEN=...
// ============================================================================

import { google } from "googleapis"
import readline from "node:readline"

const CLIENT_ID = process.argv[2] ?? process.env.GOOGLE_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.argv[3] ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET
// Para "Desktop app" Google permite este redirect URI especial sin servidor:
const REDIRECT_URI = "http://localhost"

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Falta CLIENT_ID o CLIENT_SECRET.")
  console.error("Uso: node scripts/get-drive-refresh-token.mjs <client_id> <client_secret>")
  console.error("(O exporta GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en el shell.)")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forzamos consent screen para garantizar refresh_token
  scope: ["https://www.googleapis.com/auth/drive.file"],
})

console.log("\n1. Abre esta URL en el navegador y autoriza:\n")
console.log(authUrl)
console.log("\n2. Después de autorizar te redirigirá a http://localhost/?code=... (la página no carga, no importa).")
console.log("   Copia el valor del parámetro `code` (TODO entre `code=` y `&` o el final).")
console.log("   Es una cadena larga que empieza con `4/0...`\n")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question("Pega el code aquí: ", async (code) => {
  rl.close()
  try {
    const { tokens } = await oauth2.getToken(code.trim())
    if (!tokens.refresh_token) {
      console.error("\n⚠ Google no devolvió refresh_token.")
      console.error("Esto pasa si ya autorizaste antes. Revoca acceso en https://myaccount.google.com/permissions y reintenta.")
      process.exit(2)
    }
    console.log("\n✅ REFRESH_TOKEN obtenido. Pegá esto en .env.local:\n")
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`)
  } catch (err) {
    console.error("\n❌ Error intercambiando code por tokens:", err.message ?? err)
    process.exit(3)
  }
})
