import { createAdminClient } from "@/lib/supabase/admin"
import type { MessageKind } from "./types"

/**
 * Inserta un mensaje de sistema en `messages`. Usa admin client (bypass RLS).
 * `from_user_id` queda NULL — la coherence constraint del schema lo permite cuando is_system=true.
 *
 * No lanza errores: si el insert falla, loggea con console.error y devuelve sin propagar.
 * Esto es importante porque las notificaciones NO deben fallar la acción de fondo.
 */
export async function sendSystemMessage(args: {
  toUserId: string
  body: string
  kind: MessageKind
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from("messages").insert({
    from_user_id: null,
    to_user_id: args.toUserId,
    body: args.body,
    is_system: true,
    message_kind: args.kind,
  })
  if (error) {
    console.error("[in-platform notification] insert failed:", error.message, { kind: args.kind, toUserId: args.toUserId })
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
