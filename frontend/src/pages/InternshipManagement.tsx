import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { applicationService } from '../services/applications'
import type { Application } from '../services/applications'
import { internshipService } from '../services/internships'
import type { Internship } from '../services/internships'
import { ApiError } from '../services/api'
import { useToast } from '../context/ToastContext'

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

export function InternshipManagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [internship, setInternship] = useState<Internship | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const internshipId = Number(id)
    Promise.all([
      internshipService.getById(internshipId),
      applicationService.getForInternship(internshipId),
    ])
      .then(([i, apps]) => { setInternship(i); setApplications(apps) })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatus = async (appId: number, newStatus: 'accepted' | 'rejected') => {
    try {
      const updated = await applicationService.updateStatus(appId, newStatus)
      setApplications((prev) => prev.map((a) => a.id === appId ? updated : a))
      success(`Application ${newStatus}.`)
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update status.')
    }
  }

  const statusColor = (status: string) => ({
    applied: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-600',
  }[status] ?? 'bg-gray-100 text-gray-800')

  const getApplicantName = (app: Application) => {
    const { applicant } = app
    if (!applicant) return `Applicant #${app.applicant_id}`
    const full = [applicant.first_name, applicant.last_name].filter(Boolean).join(' ')
    return full || applicant.email
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/dashboard/recruiter')}
          className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{internship?.title}</h1>
          <p className="text-gray-600 mt-1">{internship?.location}</p>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total', value: applications.length, color: 'text-gray-900' },
            { label: 'Accepted', value: applications.filter((a) => a.status === 'accepted').length, color: 'text-green-600' },
            { label: 'Pending', value: applications.filter((a) => a.status === 'applied').length, color: 'text-yellow-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <p className={`text-sm font-medium ${color}`}>{label}</p>
              <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Applicants</h2>
          {applications.length === 0 ? (
            <p className="text-center text-gray-600 py-12">No applications yet.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-base font-semibold text-gray-900">
                          {getApplicantName(app)}
                        </span>
                        {app.applicant?.email && (
                          <span className="text-sm text-gray-500">{app.applicant.email}</span>
                        )}
                        <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${statusColor(app.status)}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      {app.cover_letter && (
                        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{app.cover_letter}</p>
                      )}
                      {app.resume_path ? (
                        app.resume_path.toLowerCase().endsWith('.pdf') ? (
                          <a
                            href={app.resume_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Resume
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDownloadResume(app.resume_path!)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Download Resume
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-400 italic">No resume uploaded</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link
                        to={`/applicant-profile/${app.applicant_id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition text-sm text-center"
                      >
                        View Profile
                      </Link>
                      {app.status === 'applied' && (
                        <>
                          <button
                            onClick={() => handleStatus(app.id, 'accepted')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatus(app.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}