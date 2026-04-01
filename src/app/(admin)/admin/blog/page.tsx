import { createClient } from "@/lib/supabase/server"
import BlogModerationClient from "@/components/admin/BlogModerationClient"

export default async function AdminBlogPage() {
  const supabase = await createClient()

  // Get all posts with patient names, newest first
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*, users!blog_posts_patient_id_fkey(name)")
    .order("created_at", { ascending: false })

  // Get en_vivo_caimed_url from app_config
  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "en_vivo_caimed_url")
    .single()

  const formattedPosts = (posts ?? []).map((p) => ({
    ...p,
    patient_name: (p.users as { name: string } | null)?.name || "Paciente",
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral">Blog Comunitario</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {formattedPosts.filter((p) => p.status === "pending").length} pendientes
        </span>
      </div>
      <BlogModerationClient
        posts={formattedPosts}
        enVivoUrl={configRow?.value || ""}
      />
    </div>
  )
}
