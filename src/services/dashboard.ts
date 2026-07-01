import pb from '@/lib/pocketbase/client'

export interface DashboardStats {
  totalEntries: number
  totalAccounts: number
}

export const getDashboardStats = async (projectId: string): Promise<DashboardStats> => {
  const [entriesResult, accountsResult] = await Promise.all([
    pb.collection('journal_entries').getList(1, 1, {
      filter: `project_id = "${projectId}"`,
      fields: 'id',
    }),
    pb.collection('accounts').getList(1, 1, {
      filter: `project_id = "${projectId}"`,
      fields: 'id',
    }),
  ])
  return {
    totalEntries: entriesResult.totalItems,
    totalAccounts: accountsResult.totalItems,
  }
}
