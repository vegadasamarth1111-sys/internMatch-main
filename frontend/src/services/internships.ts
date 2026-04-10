import { api } from './api'

// Types
export interface Internship {
  id: number
  posted_by: number
  title: string
  description: string
  location: string
  job_type: string
  duration: string | null
  salary: string | null
  stipend_amount: number | null   // numeric monthly stipend in ₹
  deadline: string | null         // ISO date string YYYY-MM-DD
  skills: string[]
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface PaginatedInternships {
  items: Internship[]
  total: number
  limit: number
  offset: number
}

export interface InternshipFilters {
  location?: string
  job_type?: string
  skill?: string
  search?: string
  sort_by?: string
  stipend_min?: number
  stipend_max?: number
  limit?: number
  offset?: number
}

export type InternshipCreatePayload = {
  title: string
  description: string
  location: string
  job_type: string
  duration?: string | null
  salary?: string | null
  stipend_amount?: number | null
  deadline?: string | null
  skills: string[]
}

export type InternshipUpdatePayload = Partial<InternshipCreatePayload & { is_active: boolean }>

// Helpers
function buildQuery(filters: InternshipFilters): string {
  const params = new URLSearchParams()
  if (filters.location) params.set('location', filters.location)
  if (filters.job_type) params.set('job_type', filters.job_type)
  if (filters.skill) params.set('skill', filters.skill)
  if (filters.search) params.set('search', filters.search)
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.stipend_min !== undefined) params.set('stipend_min', String(filters.stipend_min))
  if (filters.stipend_max !== undefined) params.set('stipend_max', String(filters.stipend_max))
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Service
export const internshipService = {
  list: (filters: InternshipFilters = {}) =>
    api.get<PaginatedInternships>(`/internships${buildQuery(filters)}`),

  getMine: () =>
    api.get<Internship[]>('/internships/mine'),

  getById: (id: number) =>
    api.get<Internship>(`/internships/${id}`),

  create: (data: InternshipCreatePayload) =>
    api.post<Internship>('/internships', data),

  update: (id: number, data: InternshipUpdatePayload) =>
    api.put<Internship>(`/internships/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/internships/${id}`),
}