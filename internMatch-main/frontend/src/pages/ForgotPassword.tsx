import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'
import { ApiError } from '../services/api'

type Step = 'email' | 'otp' | 'newPassword'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  const startCooldown = () => {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // Step 1: send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword({ email })
      setStep('otp')
      startCooldown()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // OTP box handling
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) { setOtp(text.split('')); otpRefs.current[5]?.focus() }
    e.preventDefault()
  }

  // Step 2: verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return }
    setError('')
    setStep('newPassword')
  }

  // Step 3: set new password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setError('')
    setLoading(true)
    try {
      await authService.resetPassword({ email, otp: otp.join(''), new_password: newPassword })
      navigate('/login', { state: { message: 'Password reset successfully. Please sign in.' } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed. Please try again.')
      // If OTP was wrong, send them back to OTP step
      if (err instanceof ApiError && err.status === 400) {
        setStep('otp')
        setOtp(['', '', '', '', '', ''])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError('')
    try {
      await authService.resendOtp({ email, purpose: 'reset' })
      startCooldown()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend OTP.')
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8">

        {step === 'email' && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Reset password</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter your email and we'll send you a verification code.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleEmailSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} placeholder="you@example.com" autoComplete="email" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition">
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">← Back to sign in</Link>
            </p>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Enter code</h1>
            <p className="mt-1 text-sm text-gray-600">
              We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
            )}

            <form className="mt-6" onSubmit={handleOtpSubmit}>
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
              <button type="submit"
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                Continue
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={handleResend} disabled={cooldown > 0}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
            <button onClick={() => setStep('email')}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700">
              ← Change email
            </button>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">New password</h1>
            <p className="mt-1 text-sm text-gray-600">Choose a strong password for your account.</p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">{error}</div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleResetSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}