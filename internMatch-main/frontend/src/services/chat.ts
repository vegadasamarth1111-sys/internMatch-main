import { api } from './api'

export interface MessageSender {
  id: number
  email: string
}

export interface Message {
  id: number
  application_id: number
  sender_id: number
  sender: MessageSender
  content: string
  created_at: string
}

export const chatService = {
  getMessages: (applicationId: number) =>
    api.get<Message[]>(`/chat/${applicationId}`),

  sendMessage: (applicationId: number, content: string) =>
    api.post<Message>(`/chat/${applicationId}`, { content }),
}