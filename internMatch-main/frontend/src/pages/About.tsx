export default function About() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-bold text-gray-900">About InternMatch</h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-lg text-gray-600 mb-4">
            InternMatch is a skill-based internship matching platform that connects students with companies based on actual abilities rather than resumes. We believe that traditional resume-based hiring doesn't accurately reflect what students can truly do.
          </p>
          <p className="text-lg text-gray-600 mb-4">
            Our platform allows students to showcase their real skills and experience, while companies can find interns who have the exact capabilities they need. By focusing on practical ability and relevant skills instead of credentials, we create better matches and save time for everyone involved.
          </p>
          <p className="text-lg text-gray-600">
            We're committed to making the internship search transparent, fair, and straightforward for both students and companies.
          </p>
        </div>
      </section>
    </main>
  )
}
