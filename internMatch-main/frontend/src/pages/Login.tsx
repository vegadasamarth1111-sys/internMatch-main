import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [rateLimited, setRateLimited] = useState(false)

  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const state = location.state as { message?: string } | null
    if (state?.message) {
      setSuccessMessage(state.message)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  useEffect(() => {
    if (user) {
      navigate(user.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/student', {
        replace: true,
      })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setRateLimited(true)
          setError('Too many login attempts. Please wait a minute and try again.')
        } else {
          setRateLimited(false)
          const next = failedAttempts + 1
          setFailedAttempts(next)
          // After 3 wrong attempts, nudge towards forgot password
          if (next >= 3) {
            setError(`${err.message} Having trouble? Try resetting your password.`)
          } else {
            setError(err.message)
          }
        }
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Sign In</h1>
        <p className="mt-2 text-sm text-gray-600">Welcome back to InternMatch.</p>

        {successMessage && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
            {error}
            {failedAttempts >= 3 && !rateLimited && (
              <div className="mt-2">
                <Link to="/forgot-password" className="underline font-medium">
                  Reset your password
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-pw"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            <label htmlFor="show-pw" className="text-sm text-gray-600">Show password</label>
          </div>

          <button
            type="submit"
            disabled={loading || rateLimited}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Signing in...' : rateLimited ? 'Too many attempts - wait a moment' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">Register</Link>
        </p>
      </div>
    </main>
  )
}