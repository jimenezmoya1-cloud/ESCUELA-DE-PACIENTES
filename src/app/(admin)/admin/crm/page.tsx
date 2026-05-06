import { getLeads } from '@/lib/chequeo/actions'
import CrmClient from './crm-client'

export default async function CrmPage() {
  const leads = await getLeads()
  return <CrmClient initialLeads={leads} />
}
