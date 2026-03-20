import { createClient } from "@/lib/supabase/server"
import MessageThread from "@/components/dashboard/MessageThread"

export default async function MensajesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Obtener todos los mensajes del paciente (enviados y recibidos)
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
    .order("sent_at", { ascending: true })

  // Marcar mensajes recibidos como leídos
  if (messages && messages.length > 0) {
    const unreadIds = messages
      .filter((m) => m.to_user_id === user!.id && !m.read_at)
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds)
    }
  }

  // Obtener info del admin/coordinador para mostrar nombre
  const { data: admins } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "admin")

  const adminMap = new Map(admins?.map((a) => [a.id, a.name]) ?? [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral">Mensajes</h1>
        <p className="mt-1 text-sm text-tertiary">
          Comunicación con su equipo médico de CAIMED
        </p>
      </div>

      <MessageThread
        messages={messages ?? []}
        currentUserId={user!.id}
        adminMap={Object.fromEntries(adminMap)}
      />
    </div>
  )
}
