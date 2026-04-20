import { Link } from "react-router-dom"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Left Side Text */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Find Internships Based on Your Skills
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                InternMatch matches students with companies based on actual skills and experience. 
                Create a profile, list your abilities, and connect with opportunities that fit your goals.
              </p>
            </div>

            {/* Right Side Image */}
            <div>
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
                alt="Students working together on laptops"
                className="rounded-lg shadow-md w-full object-cover"
              />
            </div>

          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            How to get your next internship in 3 easy steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-2xl font-semibold text-indigo-600 mb-4">1</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Create Your Profile
              </h3>
              <p className="text-gray-600">
                Register as a student or recruiter. Add your skills and preferences.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-2xl font-semibold text-indigo-600 mb-4">2</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Get Matched
              </h3>
              <p className="text-gray-600">
                The system shows internships that match your skills.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-2xl font-semibold text-indigo-600 mb-4">3</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Connect
              </h3>
              <p className="text-gray-600">
                Apply and connect directly with companies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Why Choose InternMatch?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Skills-Based Matching
              </h3>
              <p className="text-gray-600">
                Focuses on actual abilities instead of only resumes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Better Fit
              </h3>
              <p className="text-gray-600">
                Students and companies find more relevant opportunities.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Save Time
              </h3>
              <p className="text-gray-600">
                Avoid browsing irrelevant listings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Transparent Process
              </h3>
              <p className="text-gray-600">
                Clear matching based on skills and requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Sign up today and start finding opportunities.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="inline-block px-8 py-3 bg-white text-indigo-600 font-semibold rounded-md hover:bg-gray-100 transition"
            >
              Create Account
            </Link>
            <Link 
              to="/login" 
              className="inline-block px-8 py-3 border border-white rounded-md hover:bg-indigo-700 transition"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
