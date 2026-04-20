import { api } from './api'
import type { Internship } from './internships'

export type ApplicationStatus = 'applied' | 'accepted' | 'rejected' | 'withdrawn'

export interface ApplicantSummary {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
}

export interface Application {
  id: number
  internship_id: number
  applicant_id: number
  applicant: ApplicantSummary | null
  cover_letter: string | null
  resume_path: string | null
  status: ApplicationStatus
  created_at: string
  updated_at: string | null
}

export interface ApplicationWithInternship extends Application {
  internship: Internship
}

export interface ApplyPayload {
  internship_id: number
  cover_letter?: string
}

export interface PaginatedApplications {
  items: ApplicationWithInternship[]
  total: number
  limit: number
  offset: number
}

export interface PaginatedApplicationsForInternship {
  items: Application[]
  total: number
  limit: number
  offset: number
}

export const applicationService = {
  apply: (data: ApplyPayload) =>
    api.post<Application>('/applications', data),

  getMine: (params?: { limit?: number; offset?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    const qs = q.toString()
    return api.get<PaginatedApplications>(`/applications/mine${qs ? `?${qs}` : ''}`)
  },

  getById: (id: number) =>
    api.get<ApplicationWithInternship>(`/applications/${id}`),

  getForInternship: (internshipId: number, params?: { limit?: number; offset?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    const qs = q.toString()
    return api.get<PaginatedApplicationsForInternship>(`/applications/internship/${internshipId}${qs ? `?${qs}` : ''}`)
  },

  updateStatus: (id: number, status: ApplicationStatus) =>
    api.patch<Application>(`/applications/${id}/status`, { status }),

  uploadResume: (applicationId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<Application>(`/applications/${applicationId}/resume`, form)
  },
  getResumeUrl: (applicationId: number) =>
    api.get<{ url: string }>(`/applications/${applicationId}/resume-url`),
}