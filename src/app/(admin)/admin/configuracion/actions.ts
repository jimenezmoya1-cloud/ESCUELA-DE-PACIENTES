"use server"

import { revalidatePath } from "next/cache"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { setConfigValue, copToCents } from "@/lib/payments/config"

type Result = { ok: true } | { ok: false; error: string }

export async function updateSchedulingConfig(input: {
  teamsMeetingUrl: string
  priceSingleCop: number          // input es en pesos enteros (ej. 80000), no centavos
  pricePack3Cop: number
  wompiEnvironment: "sandbox" | "production"
  wompiPublicKey: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  // Validaciones
  const url = input.teamsMeetingUrl.trim()
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "El link de Teams debe empezar con http:// o https://" }
  }
  if (input.priceSingleCop < 1000 || input.pricePack3Cop < 1000) {
    return { ok: false, error: "Precios deben ser al menos $1.000 COP" }
  }
  if (input.priceSingleCop > 100_000_000 || input.pricePack3Cop > 100_000_000) {
    return { ok: false, error: "Precios irrazonablemente altos" }
  }
  if (input.wompiEnvironment !== "sandbox" && input.wompiEnvironment !== "production") {
    return { ok: false, error: "Wompi environment inválido" }
  }

  try {
    await setConfigValue("teams_meeting_url", url)
    await setConfigValue("price_single_cop", String(copToCents(input.priceSingleCop)))
    await setConfigValue("price_pack3_cop", String(copToCents(input.pricePack3Cop)))
    await setConfigValue("wompi_environment", input.wompiEnvironment)
    await setConfigValue("wompi_public_key", input.wompiPublicKey.trim())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error guardando configuración" }
  }

  revalidatePath("/admin/configuracion")
  return { ok: true }
}
