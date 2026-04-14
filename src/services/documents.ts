import pb from '@/lib/pocketbase/client'

export interface Document {
  id: string
  name: string
  project_id: string
  type: string
  file: string
  created: string
  updated: string
}

export const getDocuments = (projectId?: string) => {
  const filter = projectId ? `project_id = "${projectId}"` : ''
  return pb.collection('documents').getFullList<Document>({ filter, sort: '-created' })
}

export const createDocument = (data: FormData) => pb.collection('documents').create<Document>(data)

export const deleteDocument = (id: string) => pb.collection('documents').delete(id)

export const getFileUrl = (record: Document) => {
  return pb.files.getURL(record, record.file)
}
