import pb from '@/lib/pocketbase/client'

export interface AuditComment {
  id?: string
  project_id: string
  entry_reference: string
  comment: string
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
