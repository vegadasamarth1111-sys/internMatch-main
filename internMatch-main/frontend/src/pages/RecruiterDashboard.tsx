import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { internshipService } from '../services/internships'
import type { PaginatedInternships } from '../services/internships'
import { ApiError } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 10

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4 mt-2" />
        </div>
        <div className="ml-4 flex flex-col gap-2">
          <div className="h-9 w-32 bg-gray-200 rounded-lg" />
          <div className="h-9 w-20 bg-gray-200 rounded-lg" />
          <div className="h-9 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function RecruiterDashboard() {
  const [data, setData] = useState<PaginatedInternships | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { success, error: toastError, confirm } = useToast()

  // Search
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setOffset(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchInternships = useCallback((off: number, s: string) => {
    setLoading(true)
    internshipService.getMine({ limit: PAGE_SIZE, offset: off, search: s || undefined })
      .then(setData)
      .catch(() => setError('Failed to load internships.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchInternships(offset, search) }, [offset, search, fetchInternships])

  const handleDelete = async (id: number) => {
    const ok = await confirm('Delete this internship posting? This cannot be undone.')
    if (!ok) return
    try {
      await internshipService.delete(id)
      fetchInternships(offset, search)
      success('Internship deleted.')
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to delete.')
    }
  }

  const total = data?.total ?? 0
  const totalActive = data?.items.filter((i) => i.is_active).length ?? 0

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recruiter Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your internship postings.</p>
          </div>
          <Link
            to="/post-internship"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            + Post Internship
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {loading && !data ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/4" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Total Posted</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">Active (this page)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalActive}</p>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Internship Postings</h2>
            <input
              type="text"
              placeholder="Search by title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-72 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-12">
              {search ? (
                <p className="text-gray-600">No internships found for "{search}".</p>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">You haven't posted any internships yet.</p>
                  <Link
                    to="/post-internship"
                    className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Post Your First Internship
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {data.items.map((internship) => (
                  <div key={internship.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{internship.title}</h3>
                          {!internship.is_active && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {internship.location}
                          {internship.duration ? ` · ${internship.duration}` : ''}
                          {internship.salary ? ` · ${internship.salary}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Posted {new Date(internship.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <Link
                          to={`/internship/${internship.id}/manage`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm text-center"
                        >
                          View Applicants
                        </Link>
                        <Link
                          to={`/edit-internship/${internship.id}`}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm text-center"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(internship.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                total={data.total}
                limit={data.limit}
                offset={data.offset}
                onPageChange={setOffset}
                loading={loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}