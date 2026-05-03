import { google } from "googleapis"
import { Readable } from "node:stream"

// ============================================================================
// Helper de subida del Excel clínico a Google Drive corporativo (Service
// Account). Toda la auth viene de variables de entorno; el código no toca
// credenciales en disco. La carpeta de destino ya debe estar compartida con
// el client_email del Service Account, con rol Editor.
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
  const email = process.env.GOOGLE_SA_EMAIL
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
  const folderId = process.env.DRIVE_BACKUP_FOLDER_ID

  if (!email) throw new Error("Falta GOOGLE_SA_EMAIL")
  if (!rawKey) throw new Error("Falta GOOGLE_SA_PRIVATE_KEY")
  if (!folderId) throw new Error("Falta DRIVE_BACKUP_FOLDER_ID")

  // Vercel guarda los \n del private_key como caracteres literales "\n";
  // los convertimos a saltos de línea reales para que JWT lo acepte.
  const privateKey = rawKey.replace(/\\n/g, "\n")

  return { email, privateKey, folderId }
}

function getDriveClient() {
  const { email, privateKey } = getCredentials()
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })
  return google.drive({ version: "v3", auth })
}

/**
 * Sube el Excel a la carpeta de Drive y devuelve metadatos del archivo.
 * Si ya existe un archivo con el mismo nombre del día (ej. dos backups en
 * la misma fecha), Drive permite el duplicado. Las versiones viejas se
 * limpian con cleanupOldBackups().
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
 * Devuelve cuántos archivos eliminó. No interrumpe el flujo si falla; los
 * errores quedan en consola para que el cron los reporte.
 */
export async function cleanupOldBackups(retentionDays: number): Promise<number> {
  const { folderId } = getCredentials()
  const drive = getDriveClient()

  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  // Listamos archivos del Service Account en la carpeta, más viejos que el cutoff.
  // 'me' como owner = el Service Account (es quien creó el archivo).
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
