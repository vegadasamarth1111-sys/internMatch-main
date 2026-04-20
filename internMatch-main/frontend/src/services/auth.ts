import { api } from './api'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface MessageResponse {
  message: string
}

export interface MeResponse {
  id: number
  email: string
  role: 'applicant' | 'recruiter'
  is_admin?: boolean
}

export const authService = {
  register: (payload: { email: string; password: string; role: 'applicant' | 'recruiter' }) =>
    api.post<MessageResponse>('/auth/register', payload),

  verifyOtp: async (payload: { email: string; otp: string }) => {
    const res = await api.post<TokenResponse>('/auth/verify-otp', payload)

    localStorage.setItem('accessToken', res.access_token)
    localStorage.setItem('refreshToken', res.refresh_token)

    return res
  },

  resendOtp: (payload: { email: string; purpose: 'verify' | 'reset' }) =>
    api.post<MessageResponse>('/auth/resend-otp', payload),

  login: async (payload: { email: string; password: string }) => {
    const res = await api.post<TokenResponse>('/auth/login', payload)

    localStorage.setItem('accessToken', res.access_token)
    localStorage.setItem('refreshToken', res.refresh_token)

    return res
  },

  forgotPassword: (payload: { email: string }) =>
    api.post<MessageResponse>('/auth/forgot-password', payload),

  resetPassword: (payload: { email: string; otp: string; new_password: string }) =>
    api.post<MessageResponse>('/auth/reset-password', payload),

  getMe: () => api.get<MeResponse>('/users/me'),
}