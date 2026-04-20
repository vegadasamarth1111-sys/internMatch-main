import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">InternMatch</h3>
            <p className="text-sm text-gray-400">
              Skill-based internship matching platform connecting students with the right opportunities.
            </p>
          </div>

          {/* For Students */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">For Students</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="hover:text-white transition">
                  Find Internships
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/dashboard/student" className="hover:text-white transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* For Companies */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">For Recruiters</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/post-internship" className="hover:text-white transition">
                  Post Internship
                </Link>
              </li>
              <li>
                <Link to="/dashboard/recruiter" className="hover:text-white transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © {currentYear} InternMatch. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Built with FastAPI + React
          </p>
        </div>
      </div>
    </footer>
  )
}