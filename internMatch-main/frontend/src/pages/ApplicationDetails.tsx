import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { applicationService } from '../services/applications'
import type { ApplicationWithInternship } from '../services/applications'
import { ChatModal } from '../components/ChatModal'

const handleDownloadResume = async (url: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = url.split('/').pop() || 'resume'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = useState<ApplicationWithInternship | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (!id) return
    applicationService.getById(Number(id))
      .then(setApplication)
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const statusColor = (status: string) => ({
    applied: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-600',
  }[status] ?? 'bg-gray-100 text-gray-800')

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>

  if (error || !application) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    </div>
  )

  const { internship } = application

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back
        </button>
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{internship.title}</h1>
              <p className="text-gray-600 mt-1">{internship.location}</p>
              {internship.salary && <p className="text-sm text-gray-500">{internship.salary}</p>}
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(application.status)}`}>
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </span>
              <button
                onClick={() => setShowChat(true)}
                className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg text-sm hover:bg-blue-50 transition"
              >
                💬 Chat with Recruiter
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Applied on</p>
              <p className="text-gray-900 mt-1">{new Date(application.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}</p>
            </div>
            {application.cover_letter && (
              <div>
                <p className="text-sm font-medium text-gray-600">Cover Letter</p>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{application.cover_letter}</p>
              </div>
            )}
            {application.resume_path ? (
              <div>
                <p className="text-sm font-medium text-gray-600">Resume</p>
                {application.resume_path.toLowerCase().endsWith('.pdf') ? (
                  <a
                    href={application.resume_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-blue-600 hover:underline"
                  >
                    View Resume
                  </a>
                ) : (
                  <button
                    onClick={() => handleDownloadResume(application.resume_path!)}
                    className="mt-1 inline-block text-blue-600 hover:underline"
                  >
                    Download Resume
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-600">Resume</p>
                <p className="text-gray-500 mt-1 text-sm">No resume uploaded.</p>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">About the Role</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-4">{internship.description}</p>
          </div>
        </div>
      </div>
      {showChat && (
        <ChatModal
          applicationId={application.id}
          otherPartyEmail={internship.title + ' — Recruiter'}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}