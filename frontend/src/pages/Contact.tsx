import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { api } from '../services/api'
import { ApiError } from '../services/api'

export default function Contact() {
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email ?? '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = (): string => {
    if (!formData.name.trim()) return 'Name is required.'
    if (!formData.email.trim()) return 'Email is required.'
    if (!formData.subject.trim()) return 'Subject is required.'
    if (formData.message.trim().length < 10) return 'Message must be at least 10 characters.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setError('')
    setLoading(true)
    try {
      await api.post('/contact', formData)
      setSuccess(true)
      setFormData({ name: '', email: user?.email ?? '', subject: '', message: '' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700'

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="text-gray-600 mt-2">Have a question or feedback? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-2xl px-6">
          {success ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Message sent!</h2>
              <p className="text-gray-600 mb-6">
                Thanks for reaching out. We'll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Send another message
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Name *</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Subject *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select a subject...</option>
                    <option>General Inquiry</option>
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Account Issue</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className={inputClass}
                    placeholder="Tell us what's on your mind..."
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.message.length} / 2000
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}