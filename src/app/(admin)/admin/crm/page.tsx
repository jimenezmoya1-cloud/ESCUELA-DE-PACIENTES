import { getLeads } from '@/lib/chequeo/actions'
import CrmClient from './crm-client'

export default async function CrmPage() {
  const leads = await getLeads()
  const sheetId = process.env.GOOGLE_SHEET_ID
  const sheetUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}`
    : null
  return <CrmClient initialLeads={leads} sheetUrl={sheetUrl} />
}
