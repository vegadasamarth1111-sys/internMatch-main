import { api } from './api'

export interface AdminUser {
  id: number
  email: string
  role: string
  is_admin: boolean
  is_deleted: boolean
  created_at: string
}

export interface AdminInternship {
  id: number
  title: string
  location: string
  is_active: boolean
  is_deleted: boolean
  posted_by: number
  created_at: string
}

export interface AdminStats {
  total_users: number
  total_applicants: number
  total_recruiters: number
  total_internships: number
  active_internships: number
  total_applications: number
}

export interface PaginatedAdminUsers {
  items: AdminUser[]
  total: number
  limit: number
  offset: number
}

export interface PaginatedAdminInternships {
  items: AdminInternship[]
  total: number
  limit: number
  offset: number
}

export const adminService = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  getUsers: (params?: {
    role?: string
    search?: string
    user_id?: number
    limit?: number
    offset?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.user_id !== undefined) q.set('user_id', String(params.user_id))
    if (params?.role) q.set('role', params.role)
    if (params?.search) q.set('search', params.search)
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    return api.get<PaginatedAdminUsers>(`/admin/users?${q}`)
  },

  banUser: (userId: number) => api.patch<{ detail: string }>(`/admin/users/${userId}/ban`, {}),
  unbanUser: (userId: number) => api.patch<{ detail: string }>(`/admin/users/${userId}/unban`, {}),

  getInternships: (params?: {
    search?: string
    internship_id?: number
    status?: string
    include_deleted?: boolean
    limit?: number
    offset?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.internship_id !== undefined) q.set('internship_id', String(params.internship_id))
    if (params?.search) q.set('search', params.search)
    if (params?.status) q.set('status', params.status)
    if (params?.include_deleted) q.set('include_deleted', 'true')
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.offset !== undefined) q.set('offset', String(params.offset))
    return api.get<PaginatedAdminInternships>(`/admin/internships?${q}`)
  },

  deleteInternship: (id: number) => api.delete<{ detail: string }>(`/admin/internships/${id}`),
  toggleInternship: (id: number) =>
    api.patch<{ detail: string; is_active: boolean }>(`/admin/internships/${id}/toggle`, {}),
}