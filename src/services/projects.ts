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

export const createProject = (data: Partial<Project> & { user_id: string }) =>
  pb.collection('projects').create<Project>({ ...data })

export const updateProject = (id: string, data: Partial<Project>) =>
  pb.collection('projects').update<Project>(id, data)

export const deleteProject = (id: string) => pb.collection('projects').delete(id)
