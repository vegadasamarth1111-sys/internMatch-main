import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { DefaultAvatar } from '../components/DefaultAvatar'
import { profileService, userService } from '../services/profile'
import type { ApplicantProfileUpdate, RecruiterProfileUpdate } from '../services/profile'
import { ApiError } from '../services/api'
import { useToast } from '../context/ToastContext'
import { parseAndNormaliseSkills } from '../utils/skillAliases'

// Profile Completion Bar
interface CompletionBarProps {
  percentage: number
  isApplicant: boolean
  onDismiss: () => void
}

function ProfileCompletionBar({ percentage, isApplicant, onDismiss }: CompletionBarProps) {
  const color =
    percentage >= 80 ? 'bg-green-500' :
    percentage >= 50 ? 'bg-yellow-500' :
    'bg-red-400'

  const label =
    percentage >= 80 ? 'Looking great!' :
    percentage >= 50 ? 'Almost there!' :
    'Just getting started'

  const tips = isApplicant
    ? ['First name', 'Last name', 'Headline', 'Bio', 'City', 'Skills', 'Education level', 'LinkedIn URL']
    : ['First name', 'Last name', 'Job title', 'Bio', 'LinkedIn URL', 'Company Name']

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-800">Profile Completion</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-blue-700">{percentage}%</span>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-1.5">{label} - complete your profile to unlock more opportunities.</p>
      {percentage < 100 && (
        <p className="text-xs text-blue-600 mt-1">
          Tip: Fill in {tips.slice(0, 3).join(', ')} and more to boost your score.
        </p>
      )}
    </div>
  )
}

// Validation helpers
const validatePhone = (phone: string): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/[\s\-]/g, '')
  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned
  if (!/^\d{7,15}$/.test(digits)) {
    return 'Phone must be 7-15 digits, optionally starting with +'
  }
  return ''
}

const validateGpa = (gpa: string): string => {
  if (!gpa) return ''
  const val = parseFloat(gpa)
  if (isNaN(val)) return 'GPA must be a number'
  if (val < 0 || val > 10) return 'GPA must be between 0.0 and 10.0'
  return ''
}

const validateUrl = (url: string, label: string): string => {
  if (!url) return ''
  if (!/^https?:\/\//.test(url)) return `${label} must start with http:// or https://`
  return ''
}

// Change Password Section
function ChangePasswordSection() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [open, setOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const reset = () => { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setShowNew(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 8) { toastError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { toastError('New passwords do not match.'); return }
    setSaving(true)
    try {
      await userService.changePassword(currentPw, newPw)
      toastSuccess('Password changed successfully.')
      setOpen(false)
      reset()
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-500 mt-0.5">Update your account password</p>
        </div>
        <button
          onClick={() => { setOpen((v) => !v); reset() }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {open ? 'Cancel' : 'Change'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              className={inputClass} placeholder="Enter current password" autoComplete="current-password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={inputClass + ' pr-16'} placeholder="Min 8 characters"
                autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-2.5 text-xs text-gray-500 hover:text-gray-800">
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              className={inputClass} placeholder="Repeat new password" autoComplete="new-password" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setOpen(false); reset() }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 transition">
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// Main Component
export function Account() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { success: toastSuccess, error: toastError, confirm } = useToast()
  const isApplicant = user?.role === 'applicant'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [completionPct, setCompletionPct] = useState(0)
  const [showCompletion, setShowCompletion] = useState(true)

  // Shared fields
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')

  // Applicant-only
  const [dob, setDob] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [degreeName, setDegreeName] = useState('')
  const [universityName, setUniversityName] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [gpa, setGpa] = useState('')
  const [skills, setSkills] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [languagesSpoken, setLanguagesSpoken] = useState('')
  const [hobbies, setHobbies] = useState('')

  // Recruiter-only
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [snapshot, setSnapshot] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    setLoading(true)

    const fetchProfile = isApplicant
      ? profileService.getApplicantProfile()
      : profileService.getRecruiterProfile()

    fetchProfile
      .then((p) => {
        if (isApplicant) {
          const ap = p as Awaited<ReturnType<typeof profileService.getApplicantProfile>>
          setAvatarUrl(ap.avatar_url ?? '')
          setFirstName(ap.first_name ?? '')
          setLastName(ap.last_name ?? '')
          setGender(ap.gender ?? '')
          setDob(ap.dob ?? '')
          setHeadline(ap.headline ?? '')
          setBio(ap.bio ?? '')
          setPhone(ap.phone ?? '')
          setLinkedinUrl(ap.linkedin_url ?? '')
          setGithubUrl(ap.github_url ?? '')
          setCity(ap.city ?? '')
          setState(ap.state ?? '')
          setCountry(ap.country ?? '')
          setEducationLevel(ap.education_level ?? '')
          setDegreeName(ap.degree_name ?? '')
          setUniversityName(ap.university_name ?? '')
          setGraduationYear(ap.graduation_year?.toString() ?? '')
          setGpa(ap.gpa ?? '')
          setSkills((ap.skills ?? []).join(', '))
          setPortfolioUrl(ap.portfolio_url ?? '')
          setLanguagesSpoken((ap.languages_spoken ?? []).join(', '))
          setHobbies((ap.hobbies ?? []).join(', '))
          setCompletionPct(ap.profile_completion_percentage ?? 0)
        } else {
          const rp = p as Awaited<ReturnType<typeof profileService.getRecruiterProfile>>
          setAvatarUrl(rp.avatar_url ?? '')
          setFirstName(rp.first_name ?? '')
          setLastName(rp.last_name ?? '')
          setGender(rp.gender ?? '')
          setBio(rp.bio ?? '')
          setPhone(rp.phone_number ?? '')
          setLinkedinUrl(rp.linkedin_url ?? '')
          setCompanyName(rp.company_name ?? '')
          setJobTitle(rp.job_title ?? '')
          setDepartment(rp.department ?? '')
          setCompanyWebsite(rp.company_website ?? '')
          setCompanyLogoUrl(rp.company_logo_url ?? '')
          setCompletionPct(rp.profile_completion_percentage ?? 0)
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [user, isApplicant])

  const takeSnapshot = () => {
    setSnapshot({
      firstName, lastName, gender, headline, bio, phone, linkedinUrl, githubUrl,
      dob, city, state, country, educationLevel, degreeName, universityName,
      graduationYear, gpa, skills, portfolioUrl, languagesSpoken, hobbies,
      companyName, jobTitle, department, companyWebsite,
    })
  }

  const restoreSnapshot = () => {
    setFirstName(snapshot.firstName ?? '')
    setLastName(snapshot.lastName ?? '')
    setGender(snapshot.gender ?? '')
    setHeadline(snapshot.headline ?? '')
    setBio(snapshot.bio ?? '')
    setPhone(snapshot.phone ?? '')
    setLinkedinUrl(snapshot.linkedinUrl ?? '')
    setGithubUrl(snapshot.githubUrl ?? '')
    setDob(snapshot.dob ?? '')
    setCity(snapshot.city ?? '')
    setState(snapshot.state ?? '')
    setCountry(snapshot.country ?? '')
    setEducationLevel(snapshot.educationLevel ?? '')
    setDegreeName(snapshot.degreeName ?? '')
    setUniversityName(snapshot.universityName ?? '')
    setGraduationYear(snapshot.graduationYear ?? '')
    setGpa(snapshot.gpa ?? '')
    setSkills(snapshot.skills ?? '')
    setPortfolioUrl(snapshot.portfolioUrl ?? '')
    setLanguagesSpoken(snapshot.languagesSpoken ?? '')
    setHobbies(snapshot.hobbies ?? '')
    setCompanyName(snapshot.companyName ?? '')
    setJobTitle(snapshot.jobTitle ?? '')
    setDepartment(snapshot.department ?? '')
    setCompanyWebsite(snapshot.companyWebsite ?? '')
  }

  const handleEdit = () => { takeSnapshot(); setIsEditing(true); setSuccessMsg(''); setError(''); setFieldErrors({}) }
  const handleCancel = () => { restoreSnapshot(); setIsEditing(false); setError(''); setFieldErrors({}) }

  const handleSave = async () => {
    const errors: Record<string, string> = {}
    const phoneErr = validatePhone(phone)
    if (phoneErr) errors.phone = phoneErr
    if (isApplicant) {
      const gpaErr = validateGpa(gpa)
      if (gpaErr) errors.gpa = gpaErr
      const liErr = validateUrl(linkedinUrl, 'LinkedIn URL')
      if (liErr) errors.linkedinUrl = liErr
      const ghErr = validateUrl(githubUrl, 'GitHub URL')
      if (ghErr) errors.githubUrl = ghErr
      const poErr = validateUrl(portfolioUrl, 'Portfolio URL')
      if (poErr) errors.portfolioUrl = poErr
    } else {
      const liErr = validateUrl(linkedinUrl, 'LinkedIn URL')
      if (liErr) errors.linkedinUrl = liErr
      const cwErr = validateUrl(companyWebsite, 'Company Website')
      if (cwErr) errors.companyWebsite = cwErr
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the highlighted fields before saving.')
      return
    }
    setFieldErrors({})

    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      if (isApplicant) {
        const normalisedSkills = parseAndNormaliseSkills(skills)
        const normalisedLanguages = languagesSpoken
          .split(',').map((s) => s.trim()).filter(Boolean)
        const normalisedHobbies = hobbies
          .split(',').map((s) => s.trim()).filter(Boolean)

        const payload: ApplicantProfileUpdate = {
          first_name: firstName || null,
          last_name: lastName || null,
          gender: gender || null,
          dob: dob || null,
          headline: headline || null,
          bio: bio || null,
          phone: phone.replace(/[\s\-]/g, '') || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          city: city || null,
          state: state || null,
          country: country || null,
          education_level: educationLevel || null,
          degree_name: degreeName || null,
          university_name: universityName || null,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          gpa: gpa || null,
          skills: normalisedSkills,
          portfolio_url: portfolioUrl || null,
          languages_spoken: normalisedLanguages.length ? normalisedLanguages : undefined,
          hobbies: normalisedHobbies.length ? normalisedHobbies : undefined,
        }
        const updated = await profileService.updateApplicantProfile(payload)
        setSkills(normalisedSkills.join(', '))
        setLanguagesSpoken(normalisedLanguages.join(', '))
        setHobbies(normalisedHobbies.join(', '))
        setCompletionPct(updated.profile_completion_percentage ?? 0)
      } else {
        const payload: RecruiterProfileUpdate = {
          first_name: firstName || null,
          last_name: lastName || null,
          gender: gender || null,
          bio: bio || null,
          phone_number: phone.replace(/[\s\-]/g, '') || null,
          linkedin_url: linkedinUrl || null,
          company_name: companyName || null,
          job_title: jobTitle || null,
          department: department || null,
          company_website: companyWebsite || null,
        }
        const updated = await profileService.updateRecruiterProfile(payload)
        setCompletionPct(updated.profile_completion_percentage ?? 0)
      }
      setSuccessMsg('Profile saved successfully.')
      toastSuccess('Profile saved!')
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const ok = await confirm('Are you sure you want to permanently delete your account? This cannot be undone.')
    if (!ok) return
    setDeleting(true)
    try {
      await userService.deleteAccount()
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to delete account.')
    } finally {
      setDeleting(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toastError('Avatar must be under 5 MB.')
      return
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toastError('Only PNG, JPEG, WebP, or GIF allowed.')
      return
    }

    setAvatarUploading(true)

    try {
      const res = isApplicant
        ? await profileService.uploadApplicantAvatar(file)
        : await profileService.uploadRecruiterAvatar(file)

      setAvatarUrl(res.avatar_url ?? '')
      toastSuccess('Avatar uploaded!')
      window.dispatchEvent(new Event('avatarUpdated'))
    } catch {
      toastError('Failed to upload avatar.')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toastError('Logo must be under 2 MB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { toastError('Only PNG, JPEG, WebP, or GIF allowed.'); return }
    setLogoUploading(true)
    try {
      const res = await profileService.uploadCompanyLogo(file)
      setCompanyLogoUrl(res.company_logo_url ?? '')
      toastSuccess('Logo uploaded!')
    } catch {
      toastError('Failed to upload logo.')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const getInitials = () =>
    ((firstName.charAt(0) + lastName.charAt(0)).toUpperCase()) || 'U'

  const inputClass = (field?: string) =>
    `mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
      field && fieldErrors[field] ? 'border-red-400' : 'border-gray-300'
    }`
  const labelClass = 'block text-sm font-medium text-gray-700'
  const fieldError = (field: string) =>
    fieldErrors[field] ? <p className="text-xs text-red-600 mt-1">{fieldErrors[field]}</p> : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profile card */}
        <div className="bg-white rounded-lg shadow-md p-8">

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-30 h-30 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <DefaultAvatar size="lg" initials={getInitials()} />
                )}
                {isEditing && (
                  <label className={`absolute bottom-0 right-0 cursor-pointer bg-white border border-gray-300 rounded-full p-1 text-xs hover:bg-gray-100 ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {avatarUploading ? '...' : '✎'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {firstName || 'Your'} {lastName || 'Profile'}
                </h1>
                <p className="text-gray-500 text-sm capitalize">Role: {user?.role}</p>
                <p className="text-gray-500 text-sm">Email: {user?.email}</p>
              </div>
            </div>
            {!isEditing && (
              <button onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                Edit Profile
              </button>
            )}
          </div>

           {showCompletion && completionPct < 100 && (
              <ProfileCompletionBar
                percentage={completionPct}
                isApplicant={isApplicant}
                onDismiss={() => setShowCompletion(false)}
              />
            )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
          )}
          {successMsg && !isEditing && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm">{successMsg}</div>
          )}

          {/* Shared fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input disabled={!isEditing} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input disabled={!isEditing} value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass()} />
              </div>
            </div>

            {/* Gender - shared between applicant and recruiter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  disabled={!isEditing}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* DOB - applicant only */}
              {isApplicant && (
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={inputClass()}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>

            {isApplicant && (
              <div>
                <label className={labelClass}>Headline</label>
                <input disabled={!isEditing} value={headline} onChange={(e) => setHeadline(e.target.value)}
                  className={inputClass()} placeholder="e.g. Computer Science Student at IIT Delhi" />
              </div>
            )}

            <div>
              <label className={labelClass}>Bio</label>
              <textarea disabled={!isEditing} value={bio} onChange={(e) => setBio(e.target.value)}
                className={inputClass()} rows={3} placeholder="A brief intro about yourself…" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone</label>
                <input disabled={!isEditing} value={phone} onChange={(e) => setPhone(e.target.value)}
                  className={inputClass('phone')} placeholder="+91 9876543210" />
                {fieldError('phone')}
              </div>
              {isApplicant && (
                <>
                  <div>
                    <label className={labelClass}>City</label>
                    <input disabled={!isEditing} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input disabled={!isEditing} value={state} onChange={(e) => setState(e.target.value)} className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input disabled={!isEditing} value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass()} />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input disabled={!isEditing} value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                  className={inputClass('linkedinUrl')} placeholder="https://linkedin.com/in/…" />
                {fieldError('linkedinUrl')}
              </div>
              {isApplicant && (
                <div>
                  <label className={labelClass}>GitHub URL</label>
                  <input disabled={!isEditing} value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                    className={inputClass('githubUrl')} placeholder="https://github.com/…" />
                  {fieldError('githubUrl')}
                </div>
              )}
            </div>

            {/* Applicant-specific */}
            {isApplicant && (
              <>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Education</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Education Level</label>
                      <input disabled={!isEditing} value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={inputClass()} />
                    </div>
                    <div>
                      <label className={labelClass}>Degree Name</label>
                      <input disabled={!isEditing} value={degreeName} onChange={(e) => setDegreeName(e.target.value)} className={inputClass()} />
                    </div>
                    <div>
                      <label className={labelClass}>University Name</label>
                      <input disabled={!isEditing} value={universityName} onChange={(e) => setUniversityName(e.target.value)} className={inputClass()} />
                    </div>
                    <div>
                      <label className={labelClass}>Graduation Year</label>
                      <input disabled={!isEditing} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}
                        className={inputClass()} type="number" min="1990" max="2035" />
                    </div>
                    <div>
                      <label className={labelClass}>GPA / CGPA</label>
                      <input disabled={!isEditing} value={gpa} onChange={(e) => setGpa(e.target.value)}
                        className={inputClass('gpa')} placeholder="e.g. 8.5" />
                      {fieldError('gpa')}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Skills</p>
                  <div>
                    <label className={labelClass}>Skills (comma-separated)</label>
                    <input disabled={!isEditing} value={skills} onChange={(e) => setSkills(e.target.value)}
                      className={inputClass()} placeholder="e.g. Python, React, SQL" />
                    {isEditing && (
                      <p className="text-xs text-gray-400 mt-1">Tip: separate skills with commas.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Links</p>
                  <div>
                    <label className={labelClass}>Portfolio URL</label>
                    <input disabled={!isEditing} value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)}
                      className={inputClass('portfolioUrl')} placeholder="https://yourportfolio.com" />
                    {fieldError('portfolioUrl')}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">About You</p>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Languages Spoken (comma-separated)</label>
                      <input
                        disabled={!isEditing}
                        value={languagesSpoken}
                        onChange={(e) => setLanguagesSpoken(e.target.value)}
                        className={inputClass()}
                        placeholder="e.g. English, Hindi, Gujarati"
                      />
                      {isEditing && (
                        <p className="text-xs text-gray-400 mt-1">Separate languages with commas.</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Hobbies (comma-separated)</label>
                      <input
                        disabled={!isEditing}
                        value={hobbies}
                        onChange={(e) => setHobbies(e.target.value)}
                        className={inputClass()}
                        placeholder="e.g. Reading, Photography, Chess"
                      />
                      {isEditing && (
                        <p className="text-xs text-gray-400 mt-1">Separate hobbies with commas.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Recruiter-specific */}
            {!isApplicant && (
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Work Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input disabled={!isEditing} value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass}>Job Title</label>
                    <input disabled={!isEditing} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <input disabled={!isEditing} value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass}>Company Website</label>
                    <input
                      disabled={!isEditing}
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      className={inputClass('companyWebsite')}
                      placeholder="https://yourcompany.com"
                    />
                    {fieldError('companyWebsite')}
                  </div>
                </div>

                {/* Company Logo */}
                <div>
                  <label className={labelClass}>Company Logo</label>
                  {companyLogoUrl && (
                    <div className="mt-2 mb-3">
                      <img
                        src={companyLogoUrl}
                        alt="Company logo"
                        className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {logoUploading ? 'Uploading…' : companyLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={logoUploading}
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {companyLogoUrl && !logoUploading && (
                      <span className="text-xs text-green-600">✓ Logo set</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">PNG/JPEG/WebP/GIF, max 2 MB. Visible on your company profile page.</p>
                </div>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>

        {/* Change Password card */}
        <ChangePasswordSection />

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-red-100">
          <h2 className="text-lg font-semibold text-red-700 mb-1">Delete Account</h2>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition text-sm"
          >
            {deleting ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>

      </div>
    </div>
  )
}