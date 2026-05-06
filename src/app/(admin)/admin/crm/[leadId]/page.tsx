import { getLeadById, getStaffUsers } from '@/lib/chequeo/actions'
import { notFound } from 'next/navigation'
import LeadDetailClient from './lead-detail-client'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const [lead, staff] = await Promise.all([
    getLeadById(leadId),
    getStaffUsers(),
  ])
  if (!lead) notFound()
  return <LeadDetailClient lead={lead} staff={staff} />
}
