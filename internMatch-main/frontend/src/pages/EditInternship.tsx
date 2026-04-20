import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { internshipService } from '../services/internships'
import { ApiError } from '../services/api'
import { normaliseSkill } from '../utils/skillAliases'

const SKILL_SUGGESTIONS = [
  'React', 'JavaScript', 'TypeScript', 'Python', 'SQL',
  'Node.js', 'Swift', 'Figma', 'UI Design', 'AWS', 'Machine Learning', 'Excel',
]

export function EditInternship() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    job_type: 'onsite',
    duration: '',
    salary: '',
    stipend_amount: '',
    deadline: '',
  })
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    internshipService.getById(Number(id))
      .then((i) => {
        setFormData({
          title: i.title,
          description: i.description,
          location: i.location,
          job_type: i.job_type,
          duration: i.duration ?? '',
          salary: i.salary ?? '',
          stipend_amount: i.stipend_amount != null ? String(i.stipend_amount) : '',
          deadline: i.deadline ?? '',
        })
        setSkills(i.skills ?? [])
      })
      .catch(() => setError('Failed to load internship.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const addSkill = (skill: string) => {
    const norm = normaliseSkill(skill.trim())
    if (norm && !skills.some((s) => s.toLowerCase() === norm.toLowerCase())) {
      setSkills((prev) => [...prev, norm])
    }
    setSkillInput('')
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError('Title, description, and location are required.')
      return
    }
    if (formData.stipend_amount && isNaN(Number(formData.stipend_amount))) {
      setError('Stipend amount must be a number.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await internshipService.update(Number(id), {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        job_type: formData.job_type,
        duration: formData.duration || undefined,
        salary: formData.salary || undefined,
        stipend_amount: formData.stipend_amount ? Number(formData.stipend_amount) : undefined,
        deadline: formData.deadline || undefined,
        skills,
      })
      navigate('/dashboard/recruiter')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Internship</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className={labelClass}>Job Title *</label>
              <input name="title" value={formData.title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                className={inputClass} rows={5} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Location *</label>
                <input name="location" value={formData.location} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Job Type</label>
                <select name="job_type" value={formData.job_type} onChange={handleChange} className={inputClass}>
                  <option value="onsite">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Duration</label>
                <input name="duration" value={formData.duration} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Application Deadline</label>
                {/* min={today} prevents setting past deadlines when editing */}
                <input name="deadline" type="date" value={formData.deadline} onChange={handleChange}
    className={inputClass} min={today} />
              </div>
            </div>

            {/* Stipend */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">Stipend / Compensation</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Display Label</label>
                  <input name="salary" value={formData.salary} onChange={handleChange}
                    className={inputClass} placeholder="e.g. ₹12,000/month" />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹/month)</label>
                  <input name="stipend_amount" type="number" min="0"
                    value={formData.stipend_amount} onChange={handleChange}
                    className={inputClass} placeholder="12000" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Required Skills</label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {skills.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {s}
                    <button type="button" onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                      className="text-blue-600 hover:text-blue-900 ml-1">×</button>
                  </span>
                ))}
              </div>
              <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown} className={inputClass}
                placeholder="Type a skill and press Enter or ," />
              <div className="flex flex-wrap gap-2 mt-2">
                {SKILL_SUGGESTIONS.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 8).map((s) => (
                  <button type="button" key={s} onClick={() => addSkill(s)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition">
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => navigate('/dashboard/recruiter')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}