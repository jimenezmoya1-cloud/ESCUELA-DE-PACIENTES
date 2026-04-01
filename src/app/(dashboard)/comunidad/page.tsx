import { createClient } from "@/lib/supabase/server"
import ComunidadClient from "@/components/dashboard/ComunidadClient"

export default async function ComunidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get approved blog posts with patient names
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*, users!blog_posts_patient_id_fkey(name)")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })

  // Get "En Vivo CAIMED" URL from app_config
  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "en_vivo_caimed_url")
    .single()

  const enVivoUrl = configRow?.value || "#"

  const formattedPosts = (posts ?? []).map((p) => ({
    ...p,
    patient_name: (p.users as { name: string } | null)?.name || "Paciente",
  }))

  return (
    <ComunidadClient
      posts={formattedPosts}
      patientId={user!.id}
      enVivoUrl={enVivoUrl}
    />
  )
}
