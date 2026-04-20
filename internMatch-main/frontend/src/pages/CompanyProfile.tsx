import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Internship } from '../services/internships'

interface CompanyProfile {
  user_id: number
  company_name: string | null
  company_logo_url: string | null
  company_website: string | null
  bio: string | null
  linkedin_url: string | null
  job_title: string | null
  internships: Internship[]
}

function InternshipCard({ internship }: { internship: Internship }) {
  return (
    <Link
      to={`/internship/${internship.id}`}
      className="block border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-gray-900">{internship.title}</h3>
      <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500">
        <span>📍 {internship.location}</span>
        <span>• {internship.job_type}</span>
        {internship.stipend_amount && (
          <span className="text-green-700 font-medium">
            ₹{Number(internship.stipend_amount).toLocaleString('en-IN')}/mo
          </span>
        )}
      </div>
      {internship.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {internship.skills.slice(0, 5).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<CompanyProfile>(`/company/${id}`)
      .then(setProfile)
      .catch(() => setError('Company not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Company Not Found</p>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link to="/explore" className="text-blue-600 hover:underline">Browse internships →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Company header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start gap-6">
            {profile.company_logo_url ? (
              <img
                src={profile.company_logo_url}
                alt={profile.company_name || 'Company logo'}
                className="w-24 h-24 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold">
                {(profile.company_name || 'C')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.company_name || 'Unknown Company'}
              </h1>
              {profile.job_title && (
                <p className="text-gray-500 text-sm mt-1">{profile.job_title}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                {profile.company_website && (
                  <a
                    href={profile.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    🌐 Website
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    💼 LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About</h2>
              <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Active Internships */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Open Internships
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({profile.internships.length})
            </span>
          </h2>
          {profile.internships.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
              No open internships at the moment.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.internships.map((i) => (
                <InternshipCard key={i.id} internship={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}