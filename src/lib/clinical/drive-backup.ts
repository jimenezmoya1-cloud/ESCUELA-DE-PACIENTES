import { google } from "googleapis"
import { Readable } from "node:stream"

// ============================================================================
// Helper de subida del Excel clínico a Google Drive usando OAuth2 con
// refresh token de un usuario real (no Service Account, porque los SA no
// tienen cuota de almacenamiento en Drive personal/Workspace estándar).
//
// El refresh token se obtiene UNA SOLA VEZ corriendo el script
// scripts/get-drive-refresh-token.mjs y se guarda como variable de entorno.
// ============================================================================

interface UploadParams {
  buffer: Buffer
  filename: string
}

interface UploadResult {
  fileId: string
  webViewLink: string
}

function getCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  const folderId = process.env.DRIVE_BACKUP_FOLDER_ID

  if (!clientId) throw new Error("Falta GOOGLE_OAUTH_CLIENT_ID")
  if (!clientSecret) throw new Error("Falta GOOGLE_OAUTH_CLIENT_SECRET")
  if (!refreshToken) throw new Error("Falta GOOGLE_OAUTH_REFRESH_TOKEN")
  if (!folderId) throw new Error("Falta DRIVE_BACKUP_FOLDER_ID")

  return { clientId, clientSecret, refreshToken, folderId }
}

function getDriveClient() {
  const { clientId, clientSecret, refreshToken } = getCredentials()
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: "v3", auth: oauth2 })
}

/**
 * Sube el Excel a la carpeta de Drive y devuelve metadatos del archivo.
 * El archivo queda como propiedad del usuario que autorizó OAuth (cuenta su
 * cuota personal de 15 GB en Gmail, o la del Workspace si aplica).
 */
export async function uploadClinicalBackup({ buffer, filename }: UploadParams): Promise<UploadResult> {
  const { folderId } = getCredentials()
  const drive = getDriveClient()

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  })

  if (!res.data.id) throw new Error("Drive no devolvió fileId")

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}`,
  }
}

/**
 * Borra archivos en la carpeta de backups con más de retentionDays días.
 * Best-effort: errores individuales se loguean y no interrumpen el flujo.
 */
export async function cleanupOldBackups(retentionDays: number): Promise<number> {
  const { folderId } = getCredentials()
  const drive = getDriveClient()

  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  // Listamos archivos del usuario en la carpeta más viejos que el cutoff.
  const res = await drive.files.list({
    q: `'${folderId}' in parents and 'me' in owners and createdTime < '${cutoffIso}' and trashed = false`,
    fields: "files(id, name, createdTime)",
    pageSize: 200,
  })

  const files = res.data.files ?? []
  let deleted = 0
  for (const f of files) {
    if (!f.id) continue
    try {
      await drive.files.delete({ fileId: f.id })
      deleted++
    } catch (err) {
      console.error(`[drive-backup] Error borrando ${f.name} (${f.id}):`, err)
    }
  }
  return deleted
}
