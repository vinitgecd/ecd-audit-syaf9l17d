import pb from '@/lib/pocketbase/client'

export interface Project {
  id: string
  name: string
  client: string
  status: 'active' | 'archived' | 'completed'
  user_id: string
  created: string
  updated: string
}

export const getProjects = () =>
  pb.collection('projects').getFullList<Project>({ sort: '-created' })

export const createProject = (data: Partial<Project>) =>
  pb.collection('projects').create<Project>({ ...data, user_id: pb.authStore.record?.id })

export const updateProject = (id: string, data: Partial<Project>) =>
  pb.collection('projects').update<Project>(id, data)

export const deleteProject = (id: string) => pb.collection('projects').delete(id)
