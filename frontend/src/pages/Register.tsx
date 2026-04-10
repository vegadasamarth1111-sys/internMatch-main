import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { authService } from '../services/auth'
import { ApiError } from '../services/api'

type Step = 'details' | 'otp'

export default function Register() {
  const { sendRegisterOtp, verifyRegisterOtp, user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('details')

  // Step 1 fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'applicant' | 'recruiter'>('applicant')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2 fields
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect once logged in after OTP verify
  useEffect(() => {
    if (user) {
      navigate(user.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/student', {
        replace: true,
      })
    }
  }, [user, navigate])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  const startCooldown = () => {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Step 1 submit
  const validateDetails = (): string => {
    if (!email || !password || !confirmPassword) return 'All fields are required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return ''
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateDetails()
    if (err) { setError(err); return }

    setError('')
    setLoading(true)
    try {
      await sendRegisterOtp(email, password, role)
      setStep('otp')
      startCooldown()
      // Focus first OTP box after transition
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // OTP input handling
  const handleOtpChange = (index: number, value: string) => {
    // Accept only digits
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    // Auto-advance
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      otpRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  // Step 2 submit
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return }

    setError('')
    setLoading(true)
    try {
      await verifyRegisterOtp(email, code)
      // useEffect above handles redirect once user is set
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.')
      setLoading(false)
    }
  }

  // Resend
  const handleResend = async () => {
    if (cooldown > 0) return
    setError('')
    try {
      await authService.resendOtp({ email, purpose: 'verify' })
      startCooldown()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend OTP.')
    }
  }

  // Render
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8">

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
            ${step === 'details' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'otp' ? '✓' : '1'}
          </div>
          <div className={`flex-1 h-0.5 ${step === 'otp' ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
            ${step === 'otp' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
        </div>

        {step === 'details' ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Create Account</h1>
            <p className="mt-1 text-sm text-gray-600">We'll send a verification code to your email.</p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleDetailsSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass} placeholder="Min. 8 characters" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass} placeholder="Re-enter password" autoComplete="new-password" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="show-pw" checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)} />
                <label htmlFor="show-pw" className="text-sm text-gray-600">Show password</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'applicant' | 'recruiter')}
                  className={inputClass}>
                  <option value="applicant">Student / Applicant</option>
                  <option value="recruiter">Recruiter</option>
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition">
                {loading ? 'Sending code...' : 'Continue'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Verify your email</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter the 6-digit code sent to <span className="font-medium text-gray-900">{email}</span>
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
            )}

            <form className="mt-6" onSubmit={handleOtpSubmit}>
              {/* OTP boxes */}
              <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:border-blue-500 border-gray-300"
                  />
                ))}
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>

            <button
              onClick={() => { setStep('details'); setOtp(['', '', '', '', '', '']); setError('') }}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              ← Change email or password
            </button>
          </>
        )}
      </div>
    </main>
  )
}