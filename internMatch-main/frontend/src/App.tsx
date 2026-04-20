import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { ProtectedRoute } from './utils/ProtectedRoute'

import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Explore from './pages/Explore'
import InternshipDetails from './pages/InternshipDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import CompanyProfile from './pages/CompanyProfile'
import { Account } from './pages/Account'
import { StudentDashboard } from './pages/StudentDashboard'
import { RecruiterDashboard } from './pages/RecruiterDashboard'
import { ApplicationDetails } from './pages/ApplicationDetails'
import { InternshipManagement } from './pages/InternshipManagement'
import { PostInternship } from './pages/PostInternship'
import { EditInternship } from './pages/EditInternship'
import { ViewApplicantProfile } from './pages/ViewApplicantProfile'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminRegister } from './pages/AdminRegister'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/internship/:id" element={<InternshipDetails />} />
        <Route path="/company/:id" element={<CompanyProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected - any authenticated user */}
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

        {/* Protected - applicants only */}
        <Route path="/dashboard/student" element={<ProtectedRoute requiredRole="applicant"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/application/:id" element={<ProtectedRoute requiredRole="applicant"><ApplicationDetails /></ProtectedRoute>} />

        {/* Protected - recruiters only */}
        <Route path="/dashboard/recruiter" element={<ProtectedRoute requiredRole="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
        <Route path="/internship/:id/manage" element={<ProtectedRoute requiredRole="recruiter"><InternshipManagement /></ProtectedRoute>} />
        <Route path="/post-internship" element={<ProtectedRoute requiredRole="recruiter"><PostInternship /></ProtectedRoute>} />
        <Route path="/edit-internship/:id" element={<ProtectedRoute requiredRole="recruiter"><EditInternship /></ProtectedRoute>} />
        <Route path="/applicant-profile/:id" element={<ProtectedRoute requiredRole="recruiter"><ViewApplicantProfile /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App