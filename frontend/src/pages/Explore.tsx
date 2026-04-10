import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { internshipService } from '../services/internships'
import type { Internship } from '../services/internships'
import { useAuth } from '../context/useAuth'
import { profileService } from '../services/profile'
import { normaliseSkill } from '../utils/skillAliases'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const JOB_TYPES = ['onsite', 'remote', 'hybrid']

const JOB_TYPE_LABELS: Record<string, string> = {
  onsite: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
}

const JOB_TYPE_COLORS: Record<string, string> = {
  onsite: 'bg-orange-50 text-orange-700 border-orange-200',
  remote: 'bg-green-50 text-green-700 border-green-200',
  hybrid: 'bg-purple-50 text-purple-700 border-purple-200',
}

const SKILL_COLORS = [
  'bg-blue-50 text-blue-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-sky-50 text-sky-700',
  'bg-teal-50 text-teal-700',
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'relevant', label: 'Most relevant', requiresAuth: true },
  { value: 'stipend_high', label: 'Stipend: High → Low' },
  { value: 'stipend_low', label: 'Stipend: Low → High' },
  { value: 'duration_asc', label: 'Duration: Shortest first' },
]

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
  'SQL', 'Machine Learning', 'Java', 'Go', 'AWS',
  'Figma', 'Data Analysis', 'REST APIs', 'Docker', 'Git',
  'C++', 'Django', 'Spring Boot', 'MongoDB', 'PostgreSQL',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z'
  const diff = Date.now() - new Date(normalized).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const wks = Math.floor(days / 7)
  if (wks < 5) return `${wks}w ago`
  return new Date(normalized).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function skillColor(index: number): string {
  return SKILL_COLORS[index % SKILL_COLORS.length]
}

function getMatchInfo(internship: Internship, userSkills: string[]): { matched: number; total: number } {
  if (!userSkills.length || !internship.skills?.length) return { matched: 0, total: internship.skills?.length ?? 0 }
  const normUser = userSkills.map((s) => s.toLowerCase())
  const matched = internship.skills.filter((s) => normUser.includes(s.toLowerCase())).length
  return { matched, total: internship.skills.length }
}

function matchPercent(internship: Internship, userSkills: string[]): number {
  const { matched, total } = getMatchInfo(internship, userSkills)
  if (!total) return 0
  return Math.round((matched / total) * 100)
}

function sortByRelevance(internships: Internship[], userSkills: string[]): Internship[] {
  return [...internships].sort((a, b) => matchPercent(b, userSkills) - matchPercent(a, userSkills))
}

function deadlineBadge(deadline: string | null | undefined): { label: string; color: string } | null {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Closed', color: 'text-red-600 font-semibold' }
  if (diffDays <= 7) {
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return { label: `Closes ${formatted}`, color: 'text-orange-600' }
  }
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="p-6 border border-gray-200 rounded-xl animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      <div className="mt-4 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-14 bg-gray-200 rounded-full" />
        ))}
      </div>
    </div>
  )
}

interface MatchBadgeProps {
  pct: number
  matched: number
  total: number
}

function MatchBadge({ pct, matched, total }: MatchBadgeProps) {
  const [showTip, setShowTip] = useState(false)
  const color = pct >= 70 ? 'bg-green-100 text-green-700 border-green-200'
    : pct >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border cursor-default ${color}`}>
        {pct}% match
      </span>
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded px-2.5 py-1.5 whitespace-nowrap shadow-lg">
            {matched} of {total} skills matched
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  )
}

interface InternshipCardProps {
  internship: Internship
  userSkills: string[]
}

function InternshipCard({ internship, userSkills }: InternshipCardProps) {
  const jtKey = internship.job_type?.toLowerCase() ?? ''
  const badgeClass = JOB_TYPE_COLORS[jtKey] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  const badgeLabel = JOB_TYPE_LABELS[jtKey] ?? internship.job_type
  const pct = matchPercent(internship, userSkills)
  const { matched, total } = getMatchInfo(internship, userSkills)
  const showMatch = userSkills.length > 0 && total > 0

  // Fixed deadline badge: shows "Closed" if past, "Closes X" if within 7d, nothing otherwise
  const dlBadge = deadlineBadge(internship.deadline)

  return (
    <Link
      to={`/internship/${internship.id}`}
      className="group block p-6 border border-gray-200 rounded-xl hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {internship.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 truncate">{internship.location}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClass}`}>
            {badgeLabel}
          </span>
          {showMatch && <MatchBadge pct={pct} matched={matched} total={total} />}
        </div>
      </div>

      {(internship.duration || internship.stipend_amount || internship.salary) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {internship.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {internship.duration}
            </span>
          )}
          {(internship.stipend_amount != null || internship.salary) && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {internship.salary ?? `₹${Number(internship.stipend_amount).toLocaleString('en-IN')}/mo`}
            </span>
          )}
        </div>
      )}

      <p className="text-gray-500 mt-3 text-sm line-clamp-2 leading-relaxed">
        {internship.description}
      </p>

      {internship.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {internship.skills.slice(0, 5).map((s, i) => (
            <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-medium ${skillColor(i)}`}>
              {s}
            </span>
          ))}
          {internship.skills.length > 5 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              +{internship.skills.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400">{relativeDate(internship.created_at)}</p>
        {/* Deadline badge: "Closed" in red, "Closes X" in orange, nothing otherwise */}
        {dlBadge && (
          <span className={`text-xs ${dlBadge.color}`}>
            {dlBadge.label}
          </span>
        )}
      </div>
    </Link>
  )
}

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
}

function Pagination({ total, page, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 4) pages.push('ellipsis')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 3) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
        ← Prev
      </button>
      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
              p === page ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
        Next →
      </button>
    </div>
  )
}

// ─── Skill combobox ───────────────────────────────────────────────────────────

interface SkillComboboxProps {
  selected: string[]
  onChange: (skills: string[]) => void
}

function SkillCombobox({ selected, onChange }: SkillComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const normQuery = normaliseSkill(query)
  const suggestions = POPULAR_SKILLS.filter((s) =>
    !selected.includes(s) &&
    (s.toLowerCase().includes(query.toLowerCase()) || s.toLowerCase().includes(normQuery.toLowerCase()))
  ).slice(0, 8)

  const addSkill = (skill: string) => {
    if (!selected.includes(skill)) onChange([...selected, skill])
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && query.trim()) {
      e.preventDefault()
      addSkill(normaliseSkill(query.trim()))
    }
  }

  const removeSkill = (skill: string) => onChange(selected.filter((s) => s !== skill))

  return (
    <div ref={ref} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
              {s}
              <button onClick={() => removeSkill(s)} className="hover:opacity-70 leading-none">×</button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={selected.length ? 'Add more…' : 'Type or pick skills…'}
        className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />

      {open && (suggestions.length > 0 || (query && normaliseSkill(query) !== query)) && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {query && !POPULAR_SKILLS.map(s => s.toLowerCase()).includes(normaliseSkill(query).toLowerCase()) && (
            <button
              onClick={() => addSkill(normaliseSkill(query.trim()))}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-100"
            >
              Add "{normaliseSkill(query.trim())}"
            </button>
          )}
          {suggestions.map((s) => (
            <button key={s} onClick={() => addSkill(s)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Explore() {
  const { user, isAuthenticated } = useAuth()
  const [internships, setInternships] = useState<Internship[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [locationPrefilled, setLocationPrefilled] = useState(false)

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [selectedJobType, setSelectedJobType] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('newest')
  const [stipendMin, setStipendMin] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'applicant') return
    profileService.getApplicantProfile().then((p) => {
      if (p.skills?.length) setUserSkills(p.skills)
      if (p.city && !locationPrefilled) {
        setLocation(p.city)
        setLocationPrefilled(true)
      }
    }).catch(() => { /* silent */ })
  }, [isAuthenticated, user])

  const fetchInternships = useCallback(async (currentPage: number, overrideSort?: string) => {
    setLoading(true)
    setError('')
    const effectiveSort = overrideSort ?? sortBy

    try {
      const filters: Record<string, string | number> = {
        sort_by: effectiveSort === 'relevant' ? 'newest' : effectiveSort,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      }
      if (search) filters.search = search
      if (location) filters.location = location
      if (selectedJobType) filters.job_type = selectedJobType
      if (selectedSkills.length >= 1) filters.skill = selectedSkills[0]
      if (stipendMin) filters.stipend_min = Number(stipendMin)

      const result = await internshipService.list(filters)
      let items = result.items

      if (selectedSkills.length > 1) {
        items = items.filter((i) =>
          selectedSkills.every((s) =>
            (i.skills ?? []).some((sk) => sk.toLowerCase().includes(s.toLowerCase()))
          )
        )
      }

      if (effectiveSort === 'relevant' && userSkills.length) {
        items = sortByRelevance(items, userSkills)
      }

      setInternships(items)
      setTotal(result.total)
    } catch {
      setError('Failed to load internships.')
    } finally {
      setLoading(false)
    }
  }, [search, location, selectedJobType, selectedSkills, sortBy, stipendMin, userSkills])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchInternships(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchInternships])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchInternships(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSearch('')
    setLocation('')
    setSelectedJobType('')
    setSelectedSkills([])
    setSortBy('newest')
    setStipendMin('')
  }

  const hasActiveFilters = search || location || selectedJobType || selectedSkills.length || sortBy !== 'newest' || stipendMin
  const activeFilterCount =
    (search ? 1 : 0) + (location ? 1 : 0) + (selectedJobType ? 1 : 0) +
    selectedSkills.length + (sortBy !== 'newest' ? 1 : 0) + (stipendMin ? 1 : 0)

  // "Most relevant" is only shown to authenticated users (it needs their skill profile)
  const visibleSortOptions = SORT_OPTIONS.filter((o) => !o.requiresAuth || isAuthenticated)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Explore Internships</h1>
          <p className="text-gray-500 mt-1">Find the right opportunity to kick-start your career</p>
        </div>

        <div className="flex gap-8">

          {/* ── Sidebar Filters ── */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Clear {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</label>
                <div className="relative">
                  <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title or keyword…"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Location
                  {locationPrefilled && (
                    <span className="ml-1 normal-case font-normal text-blue-500">(from profile)</span>
                  )}
                </label>
                <div className="relative">
                  <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="City or state…"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Sort - "Most relevant" hidden for unauthenticated users */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort by</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {visibleSortOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Type</label>
                <select value={selectedJobType} onChange={(e) => setSelectedJobType(e.target.value)}
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">All types</option>
                  {JOB_TYPES.map((jt) => (
                    <option key={jt} value={jt}>{JOB_TYPE_LABELS[jt] ?? jt}</option>
                  ))}
                </select>
              </div>

              {/* Stipend filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Min. Stipend (₹/month)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={stipendMin}
                  onChange={(e) => setStipendMin(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</label>
                <SkillCombobox selected={selectedSkills} onChange={setSelectedSkills} />
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">

            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="text-sm text-gray-500">
                {loading ? 'Loading…' : '' }
              </p>

              {(selectedJobType || selectedSkills.length > 0 || stipendMin) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedJobType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {JOB_TYPE_LABELS[selectedJobType] ?? selectedJobType}
                      <button onClick={() => setSelectedJobType('')} className="hover:text-blue-900">×</button>
                    </span>
                  )}
                  {selectedSkills.map((s) => (
                    <span key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {s}
                      <button onClick={() => setSelectedSkills((prev) => prev.filter((x) => x !== s))}
                        className="hover:text-indigo-900">×</button>
                    </span>
                  ))}
                  {stipendMin && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ₹{Number(stipendMin).toLocaleString('en-IN')}+/mo
                      <button onClick={() => setStipendMin('')} className="hover:text-green-900">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-500">{error}</div>
            ) : internships.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-700 font-medium text-lg">No internships found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {internships.map((internship) => (
                    <InternshipCard key={internship.id} internship={internship} userSkills={userSkills} />
                  ))}
                </div>

                <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={handlePageChange} />

              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}