import { api } from './api'
import type { Internship } from './internships'

export interface SavedInternship {
  id: number
  user_id: number
  internship_id: number
  created_at: string
  internship: Internship
}

export interface PaginatedSaved {
  items: SavedInternship[]
  total: number
  limit: number
  offset: number
}

export const savedService = {
  getAll: (params?: { limit?: number; offset?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    const qs = q.toString()
    return api.get<PaginatedSaved>(`/saved${qs ? `?${qs}` : ''}`)
  },
  getIds: () => api.get<number[]>('/saved/ids'),
  save: (internship_id: number) => api.post<SavedInternship>('/saved', { internship_id }),
  unsave: (internship_id: number) => api.delete<void>(`/saved/${internship_id}`),
}