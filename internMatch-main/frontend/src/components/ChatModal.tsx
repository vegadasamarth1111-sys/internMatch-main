import { useState, useEffect, useRef, useCallback } from 'react'
import { chatService, type Message } from '../services/chat'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../services/api'

interface Props {
  applicationId: number
  otherPartyEmail: string
  onClose: () => void
}

const POLL_INTERVAL_MS = 4000

export function ChatModal({ applicationId, otherPartyEmail, onClose }: Props) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [isLive, setIsLive] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMsgIdRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  //  Scroll to bottom 
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  //  Initial load 
  useEffect(() => {
    chatService.getMessages(applicationId)
      .then((msgs) => {
        setMessages(msgs)
        lastMsgIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : null
        setIsLive(true)
      })
      .catch(() => setError('Could not load messages.'))
      .finally(() => setLoading(false))
  }, [applicationId])

  //  Auto-scroll when messages change 
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  //  Live polling every 4 seconds 
  useEffect(() => {
    if (loading) return   // wait for initial load before polling

    const interval = setInterval(async () => {
      try {
        const fresh = await chatService.getMessages(applicationId)
        const latestId = fresh.length > 0 ? fresh[fresh.length - 1].id : null

        // Only update state if there are new messages (avoids unnecessary re-renders)
        if (latestId !== lastMsgIdRef.current) {
          setMessages(fresh)
          lastMsgIdRef.current = latestId
        }
        setIsLive(true)
      } catch {
        setIsLive(false)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [applicationId, loading])

  //  Focus input on mount 
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading])

  //  Close on Escape 
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  //  Send message 
  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setError('')
    try {
      const msg = await chatService.sendMessage(applicationId, text)
      setMessages((prev) => [...prev, msg])
      lastMsgIdRef.current = msg.id
      setInput('')
      scrollToBottom('smooth')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  // Group messages by day for date separators
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const d = fmtDate(msg.created_at)
    if (!grouped.length || grouped[grouped.length - 1].date !== d) {
      grouped.push({ date: d, msgs: [msg] })
    } else {
      grouped[grouped.length - 1].msgs.push(msg)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col"
        style={{ height: '85dvh', maxHeight: '600px' }}>

        {/*  Header  */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 rounded-t-2xl sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {(otherPartyEmail[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate leading-tight">{otherPartyEmail}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <p className="text-blue-200 text-xs">{isLive ? 'Live' : 'Reconnecting…'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none ml-2 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 transition"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/*  Messages area  */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
              <div className="text-3xl">💬</div>
              <p className="text-center text-gray-400 text-sm">
                No messages yet.<br />Start the conversation!
              </p>
            </div>
          )}

          {grouped.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium px-2">{date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === user?.id
                const showSender = !isMe && (i === 0 || msgs[i - 1].sender_id !== msg.sender_id)
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`max-w-[78%] ${isMe ? '' : 'items-start'}`}>
                      {showSender && (
                        <p className="text-xs text-gray-400 mb-0.5 px-1">{msg.sender.email.split('@')[0]}</p>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {fmt(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/*  Error bar  */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-red-600">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-sm ml-2">×</button>
          </div>
        )}

        {/*  Input bar  */}
        <div className="px-3 py-3 border-t border-gray-200 bg-white rounded-b-2xl flex gap-2 flex-shrink-0">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 leading-relaxed"
            rows={1}
            placeholder="Type a message… (Enter to send)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-grow textarea
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
            }}
            onKeyDown={handleKey}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 flex-shrink-0 self-end"
            aria-label="Send message"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            }
          </button>
        </div>
      </div>
    </div>
  )
}