import { api } from './api'

// Applicant profile
export interface ApplicantProfile {
  id: number
  user_id: number
  first_name: string | null
  last_name: string | null
  dob: string | null
  gender: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  education_level: string | null
  degree_name: string | null
  university_name: string | null
  graduation_year: number | null
  gpa: string | null
  skills: string[]
  headline: string | null
  bio: string | null
  languages_spoken: string[]
  hobbies: string[]
  portfolio_url: string | null
  github_url: string | null
  linkedin_url: string | null
  avatar_url: string | null          // profile picture
  profile_completed: boolean
  profile_completion_percentage: number
  created_at: string
  updated_at: string | null
  last_active_at: string | null
}

export type ApplicantProfileUpdate = Partial<
  Omit<ApplicantProfile, 'id' | 'user_id' | 'avatar_url' | 'profile_completed' | 'profile_completion_percentage' | 'created_at' | 'updated_at' | 'last_active_at'>
>

// Recruiter profile
export interface RecruiterProfile {
  id: number
  user_id: number
  company_name: string | null
  company_website: string | null
  company_logo_url: string | null    // company / brand logo
  avatar_url: string | null          // personal profile picture
  first_name: string | null
  last_name: string | null
  gender: string | null
  job_title: string | null
  department: string | null
  bio: string | null
  phone_number: string | null
  linkedin_url: string | null
  profile_completed: boolean
  profile_completion_percentage: number
  created_at: string
  updated_at: string | null
  last_active_at: string | null
}

export type RecruiterProfileUpdate = Partial<
  Omit<RecruiterProfile, 'id' | 'user_id' | 'avatar_url' | 'company_logo_url' | 'profile_completed' | 'profile_completion_percentage' | 'created_at' | 'updated_at' | 'last_active_at'>
>

// Service
export const profileService = {
  // Applicant
  getApplicantProfile: () =>
    api.get<ApplicantProfile>('/applicant/profile'),

  updateApplicantProfile: (data: ApplicantProfileUpdate) =>
    api.put<ApplicantProfile>('/applicant/profile', data),

  getApplicantProfileById: (userId: number) =>
    api.get<ApplicantProfile>(`/applicant/profile/${userId}`),

  uploadApplicantAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<ApplicantProfile>('/applicant/profile/avatar', form)
  },

  // Recruiter
  getRecruiterProfile: () =>
    api.get<RecruiterProfile>('/recruiter/profile'),

  updateRecruiterProfile: (data: RecruiterProfileUpdate) =>
    api.put<RecruiterProfile>('/recruiter/profile', data),

  uploadRecruiterAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<RecruiterProfile>('/recruiter/profile/avatar', form)
  },

  uploadCompanyLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<RecruiterProfile>('/recruiter/profile/logo', form)
  },
}

// User account
export const userService = {
  deleteAccount: () => api.delete<void>('/users/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}