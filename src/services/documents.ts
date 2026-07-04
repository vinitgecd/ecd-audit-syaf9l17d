import pb from '@/lib/pocketbase/client'

export interface ProjectDocument {
  id: string
  project_id: string
  name: string
  type: string
  file: string
  created: string
  updated: string
}

export const getEcdDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
  return await pb.collection('documents').getFullList<ProjectDocument>({
    filter: `project_id = "${projectId}" && type = "ecd"`,
    sort: '-created',
  })
}
