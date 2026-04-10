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
  resume_path: string | null  // storage path e.g. "user_2/internship_1/resume.pdf", NOT a URL
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

export const applicationService = {
  apply: (data: ApplyPayload) =>
    api.post<Application>('/applications', data),

  getMine: () =>
    api.get<ApplicationWithInternship[]>('/applications/mine'),

  getById: (id: number) =>
    api.get<ApplicationWithInternship>(`/applications/${id}`),

  getForInternship: (internshipId: number) =>
    api.get<Application[]>(`/applications/internship/${internshipId}`),

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