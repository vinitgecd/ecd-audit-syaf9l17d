import pb from '@/lib/pocketbase/client'

export interface AuditComment {
  id?: string
  project_id: string
  entry_reference: string
  comment: string
  status?: 'pending' | 'approved' | 'rejected'
  user_id: string
  created?: string
  updated?: string
}

export const getAuditCommentsByProject = async (projectId: string) => {
  return pb.collection('audit_comments').getFullList<AuditComment>({
    filter: `project_id = "${projectId}"`,
  })
}

export const saveAuditComment = async (data: Partial<AuditComment>) => {
  if (data.id) {
    return pb.collection('audit_comments').update<AuditComment>(data.id, data)
  } else {
    return pb.collection('audit_comments').create<AuditComment>(data)
  }
}

export const deleteAuditComment = async (id: string) => {
  return pb.collection('audit_comments').delete(id)
}

export interface AuditLog {
  id?: string
  project_id: string
  comment_id: string
  user_id: string
  action: string
  details?: string
  created?: string
  updated?: string
  expand?: {
    user_id: { name: string; email: string }
  }
}

export const getAuditLogsByComment = async (commentId: string) => {
  return pb.collection('audit_logs').getFullList<AuditLog>({
    filter: `comment_id = "${commentId}"`,
    sort: '-created',
    expand: 'user_id',
  })
}

export const createAuditLog = async (data: Partial<AuditLog>) => {
  return pb.collection('audit_logs').create<AuditLog>(data)
}
