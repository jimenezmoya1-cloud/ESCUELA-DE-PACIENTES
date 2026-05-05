import { getSchedulingConfig, centsToCop } from "@/lib/payments/config"
import PagosTable from "@/components/admin/PagosTable"

export const dynamic = "force-dynamic"

export default async function PagosPage() {
  const config = await getSchedulingConfig()

  return (
    <PagosTable
      defaultPriceSingle={centsToCop(config.priceSingleCop)}
      defaultPricePack3={centsToCop(config.pricePack3Cop)}
    />
  )
}
