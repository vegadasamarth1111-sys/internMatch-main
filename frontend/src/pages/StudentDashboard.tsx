import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { applicationService } from '../services/applications'
import type { ApplicationWithInternship } from '../services/applications'
import { ApiError } from '../services/api'
import { useToast } from '../context/ToastContext'

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="ml-4 flex gap-2">
          <div className="h-9 w-16 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function StudentDashboard() {
  const [applications, setApplications] = useState<ApplicationWithInternship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { success, error: toastError, confirm } = useToast()

  useEffect(() => {
    applicationService.getMine()
      .then(setApplications)
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: applications.length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    pending: applications.filter((a) => a.status === 'applied').length,
  }

  const handleWithdraw = async (appId: number) => {
    const ok = await confirm('Are you sure you want to withdraw this application?')
    if (!ok) return
    try {
      await applicationService.updateStatus(appId, 'withdrawn')
      setApplications((prev) => prev.filter((a) => a.id !== appId))
      success('Application withdrawn.')
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to withdraw.')
    }
  }

  const statusColor = (status: string) => ({
    applied: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-800',
  }[status] ?? 'bg-gray-100 text-gray-800')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Your internship application overview.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))
          ) : (
            [
              { label: 'Total Applied', value: stats.total, color: 'text-gray-900' },
              { label: 'Accepted', value: stats.accepted, color: 'text-green-600' },
              { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg shadow p-6">
                <p className={`text-sm font-medium ${color}`}>{label}</p>
                <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Applications</h2>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't applied to any internships yet.</p>
              <Link to="/explore"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Explore Internships
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{app.internship.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{app.internship.location}</p>
                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(app.status)}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Link to={`/application/${app.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                        View
                      </Link>
                      {app.status === 'applied' && (
                        <button onClick={() => handleWithdraw(app.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                          Withdraw
                        </button>
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