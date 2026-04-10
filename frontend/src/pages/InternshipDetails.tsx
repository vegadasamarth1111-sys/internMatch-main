import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { internshipService } from '../services/internships'
import type { Internship } from '../services/internships'
import { applicationService } from '../services/applications'
import { ApiError } from '../services/api'

function formatDeadline(deadline: string | null | undefined): { label: string; color: string } | null {
  if (!deadline) return null
  const d = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Closed', color: 'text-red-600' }
  if (diffDays <= 7) {
    const formatted = new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return { label: `Closes ${formatted}`, color: 'text-orange-600' }
  }
  const formatted = new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return { label: `Deadline: ${formatted}`, color: 'text-gray-500' }
}

export default function InternshipDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [internship, setInternship] = useState<Internship & { deadline_passed?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showApply, setShowApply] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [applyError, setApplyError] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!id) return
    internshipService.getById(Number(id))
      .then(setInternship)
      .catch(() => setError('Internship not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setApplyError('Please upload a PDF or Word document.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setApplyError('File must be under 5 MB.')
      return
    }
    setResume(file)
    setResumeName(file.name)
    setApplyError('')
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resume) {
      setApplyError('Please upload your resume.')
      return
    }
    setApplyLoading(true)
    setApplyError('')

    let application: Awaited<ReturnType<typeof applicationService.apply>> | null = null

    // Step 1: create application
    try {
      application = await applicationService.apply({
        internship_id: Number(id),
        cover_letter: coverLetter || undefined,
      })
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Failed to submit application.')
      setApplyLoading(false)
      return
    }

    // Step 2: upload resume
    try {
      await applicationService.uploadResume(application.id, resume)
      setApplied(true)
      setShowApply(false)
    } catch (_err) {
      // Application created but resume upload failed - inform user
      setApplied(true)
      setShowApply(false)
      setApplyError('Application submitted, but resume upload failed. Please re-upload your resume from your dashboard.')
    } finally {
      setApplyLoading(false)
    }
  }

  const deadlineInfo = internship ? formatDeadline(internship.deadline) : null
  const deadlinePassed = internship?.deadline_passed ?? (internship?.deadline
    ? new Date(internship.deadline) < new Date(new Date().toDateString())
    : false)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  if (error || !internship) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">{error || 'Internship not found.'}</p>
        <button onClick={() => navigate('/explore')} className="text-blue-600 hover:underline">
          ← Back to Explore
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{internship.title}</h1>
              <p className="text-gray-600 mt-1">{internship.location}</p>
              <p className="text-sm text-gray-500 mt-1">
                {internship.job_type}
                {internship.duration ? ` · ${internship.duration}` : ''}
                {internship.salary ? ` · ${internship.salary}` : ''}
              </p>
              {/* Deadline line */}
              {deadlineInfo && (
                <p className={`text-sm font-medium mt-2 ${deadlineInfo.color}`}>
                  {deadlineInfo.label}
                </p>
              )}
            </div>
            {user?.role === 'applicant' && (
              <div>
                {applied ? (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                    ✓ Applied
                  </span>
                ) : deadlinePassed ? (
                  <span className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
                    Applications closed
                  </span>
                ) : (
                  <button
                    onClick={() => setShowApply(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Resume warning (shown after modal closes if upload failed) */}
          {applied && applyError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-sm">
              {applyError}
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About the Role</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{internship.description}</p>
            </div>

            {internship.skills?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {internship.skills.map((s) => (
                    <span key={s} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Posted {new Date(internship.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Apply Modal (unchanged) */}
      {showApply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Apply Now</h2>
              <button onClick={() => setShowApply(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <form onSubmit={handleApply} className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Applying for</p>
                <p className="font-semibold text-gray-900">{internship.title}</p>
              </div>

              {applyError && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {applyError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full" />
                  {resumeName && <p className="mt-2 text-sm text-green-600">✓ {resumeName}</p>}
                  <p className="text-xs text-gray-500 mt-2">PDF or Word, max 5 MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter (optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're interested..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {applyLoading ? 'Submitting...' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}