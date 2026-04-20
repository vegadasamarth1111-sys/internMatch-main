import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DefaultAvatar } from "../components/DefaultAvatar";
import { profileService } from "../services/profile";
import type { ApplicantProfile } from "../services/profile";

function isProfileEmpty(profile: ApplicantProfile): boolean {
  return (
    !profile.first_name &&
    !profile.last_name &&
    !profile.headline &&
    !profile.bio &&
    !profile.city &&
    !profile.skills?.length &&
    !profile.education_level &&
    !profile.linkedin_url &&
    !profile.github_url &&
    !profile.portfolio_url
  );
}

export function ViewApplicantProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    profileService
      .getApplicantProfileById(Number(id))
      .then(setProfile)
      .catch(() => setError("Applicant profile not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const getInitials = () => {
    if (!profile) return "U";
    return (
      (
        (profile.first_name?.charAt(0) ?? "") +
        (profile.last_name?.charAt(0) ?? "")
      ).toUpperCase() || "A"
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  if (error || !profile)
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back
          </button>
          <p className="text-center text-gray-600">
            {error || "Profile not found."}
          </p>
        </div>
      </div>
    );

  // Empty profile state
  if (isProfileEmpty(profile)) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back
          </button>
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <DefaultAvatar size="lg" initials={getInitials()} />
            )}
            <h2 className="text-xl font-semibold text-gray-700 mt-4">
              Profile not complete
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              This applicant hasn't filled in their profile yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex items-start gap-6 mb-8 pb-8 border-b border-gray-200">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <DefaultAvatar size="lg" initials={getInitials()} />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {[profile.first_name, profile.last_name]
                  .filter(Boolean)
                  .join(" ") || "Applicant"}
              </h1>
              {profile.headline && (
                <p className="text-gray-600 mt-1">{profile.headline}</p>
              )}
              {profile.city && (
                <p className="text-sm text-gray-500 mt-1">
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {(profile.education_level ||
            profile.degree_name ||
            profile.university_name) && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Education
              </h2>
              <p className="text-gray-700">
                {[profile.degree_name, profile.university_name]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
              {profile.graduation_year && (
                <p className="text-sm text-gray-500 mt-1">
                  Class of {profile.graduation_year}
                </p>
              )}
              {profile.gpa && (
                <p className="text-sm text-gray-500">GPA: {profile.gpa}</p>
              )}
            </div>
          )}

          {profile.skills?.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile.linkedin_url ||
            profile.github_url ||
            profile.portfolio_url) && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Links</h2>
              <div className="space-y-1">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline text-sm"
                  >
                    {profile.linkedin_url}
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline text-sm"
                  >
                    {profile.github_url}
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline text-sm"
                  >
                    {profile.portfolio_url}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
