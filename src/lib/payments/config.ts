import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface SchedulingConfig {
  teamsMeetingUrl: string
  priceSingleCop: number
  pricePack3Cop: number
  wompiEnvironment: "sandbox" | "production"
  wompiPublicKey: string
}

const DEFAULTS: SchedulingConfig = {
  teamsMeetingUrl: "",
  priceSingleCop: 8000000,
  pricePack3Cop: 16800000,
  wompiEnvironment: "sandbox",
  wompiPublicKey: "",
}

/** Lee la config completa. Usa el cliente de sesión (RLS aplica — solo authenticated puede leer). */
export async function getSchedulingConfig(): Promise<SchedulingConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", [
      "teams_meeting_url",
      "price_single_cop",
      "price_pack3_cop",
      "wompi_environment",
      "wompi_public_key",
    ])

  const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value]))
  return {
    teamsMeetingUrl: map.get("teams_meeting_url") ?? DEFAULTS.teamsMeetingUrl,
    priceSingleCop: parseInt(map.get("price_single_cop") ?? String(DEFAULTS.priceSingleCop), 10),
    pricePack3Cop: parseInt(map.get("price_pack3_cop") ?? String(DEFAULTS.pricePack3Cop), 10),
    wompiEnvironment: (map.get("wompi_environment") as SchedulingConfig["wompiEnvironment"]) ?? DEFAULTS.wompiEnvironment,
    wompiPublicKey: map.get("wompi_public_key") ?? DEFAULTS.wompiPublicKey,
  }
}

/** Actualiza una key. Usa admin client (bypass RLS) — el caller debe haber validado que es admin. */
export async function setConfigValue(key: string, value: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("app_config")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw new Error(`No se pudo actualizar ${key}: ${error.message}`)
}
