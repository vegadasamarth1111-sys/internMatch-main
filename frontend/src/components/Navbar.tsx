import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth'
import { DefaultAvatar } from './DefaultAvatar'
import logo from "../assets/IM.png";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  // Close mobile menu on route change / resize
  useEffect(() => {
    setMobileOpen(false)
  }, [navigate])

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    setMobileOpen(false)
    navigate('/')
  }

  const getInitials = () => {
    if (!user) return 'U'
    const parts = user.email.split('@')[0].split('.')
    return (parts[0]?.charAt(0) ?? 'U').toUpperCase() +
      (parts[1]?.charAt(0) ?? '').toUpperCase()
  }

  const dashboardPath = user?.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/student'

  const navLinks = [
    { to: '/', label: 'Home', always: true },
    { to: '/explore', label: 'Explore', always: false, hide: user?.role === 'recruiter' },
    { to: dashboardPath, label: 'Dashboard', always: false, requireAuth: true },
    { to: '/about', label: 'About Us', always: true },
    { to: '/contact', label: 'Contact Us', always: true },
  ]

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img className="h-8 w-8 object-contain" src={logo} alt="Logo" />
          <Link to="/" className="text-lg font-semibold text-gray-900">
            InternMatch
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map(({ to, label, hide, requireAuth }) => {
            if (hide) return null
            if (requireAuth && !isAuthenticated) return null
            return (
              <Link key={to} to={to} className="text-base text-gray-600 hover:text-gray-900 transition">
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="text-base text-gray-600 hover:text-gray-900">Login</Link>
              <Link
                to="/register"
                className="text-base font-medium px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition"
                title={user?.email}
              >
                <DefaultAvatar size="sm" initials={getInitials()} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {user?.email?.toLowerCase()}
                    </p>
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setShowDropdown(false)}
                    className="block px-4 py-2 hover:bg-gray-100 text-gray-900 transition text-sm"
                  >
                    Profile
                  </Link>
                  <Link
                    to={dashboardPath}
                    onClick={() => setShowDropdown(false)}
                    className="block px-4 py-2 hover:bg-gray-100 text-gray-900 transition text-sm"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-medium transition border-t border-gray-200 text-sm"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pb-4 space-y-1">
          {navLinks.map(({ to, label, hide, requireAuth }) => {
            if (hide) return null
            if (requireAuth && !isAuthenticated) return null
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-base text-gray-700 hover:text-blue-600 border-b border-gray-100 last:border-0"
              >
                {label}
              </Link>
            )
          })}

          {!isAuthenticated ? (
            <div className="flex gap-3 pt-3">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Signed in as <span className="font-medium text-gray-700">{user?.email}</span></p>
              <Link
                to="/account"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-gray-700 hover:text-blue-600"
              >
                Profile / Account
              </Link>
              <button
                onClick={handleLogout}
                className="mt-2 w-full py-2 text-sm text-red-600 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}