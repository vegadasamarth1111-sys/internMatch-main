import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { applicationService } from "../services/applications";
import type {
  Application,
  PaginatedApplicationsForInternship,
} from "../services/applications";
import { internshipService } from "../services/internships";
import type { Internship } from "../services/internships";
import { ApiError } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Pagination } from "../components/Pagination";
import { ChatModal } from "../components/ChatModal";

const PAGE_SIZE = 12;

const handleDownloadResume = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fetch failed");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = url.split("/").pop() || "resume";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};

export function InternshipManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [internship, setInternship] = useState<Internship | null>(null);
  const [appData, setAppData] =
    useState<PaginatedApplicationsForInternship | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [error, setError] = useState("");

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Chat state
  const [chatApp, setChatApp] = useState<Application | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load internship once
  useEffect(() => {
    if (!id) return;
    internshipService
      .getById(Number(id))
      .then(setInternship)
      .catch(() => setError("Failed to load internship."))
      .finally(() => setLoading(false));
  }, [id]);

  // Load applications (paginated + search)
  const fetchApps = useCallback(
    (off: number, s: string) => {
      if (!id) return;
      setAppsLoading(true);
      applicationService
        .getForInternship(Number(id), { limit: PAGE_SIZE, offset: off, search: s || undefined })
        .then(setAppData)
        .catch(() => setError("Failed to load applications."))
        .finally(() => setAppsLoading(false));
    },
    [id],
  );

  useEffect(() => {
    fetchApps(offset, search);
  }, [offset, search, fetchApps]);

  const handleStatus = async (
    appId: number,
    newStatus: "accepted" | "rejected",
  ) => {
    try {
      await applicationService.updateStatus(appId, newStatus);
      fetchApps(offset, search);
      success(`Application ${newStatus}.`);
    } catch (err) {
      toastError(
        err instanceof ApiError ? err.message : "Failed to update status.",
      );
    }
  };

  const statusColor = (status: string) =>
    ({
      applied: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      withdrawn: "bg-gray-100 text-gray-600",
    })[status] ?? "bg-gray-100 text-gray-800";

  const getApplicantName = (app: Application) => {
    const { applicant } = app;
    if (!applicant) return `Applicant #${app.applicant_id}`;
    const full = [applicant.first_name, applicant.last_name]
      .filter(Boolean)
      .join(" ");
    return full || applicant.email;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );

  const apps = appData?.items ?? [];
  const total = appData?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/dashboard/recruiter")}
          className="text-blue-600 hover:underline mb-6 inline-block text-sm"
        >
          ← Back to Dashboard
        </button>

        {/* Internship header */}
        {internship && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {internship.title}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {internship.location} · {internship.job_type}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    internship.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {internship.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                  {total} applicant{total !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Applications</h2>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full sm:w-64 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {appsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : apps.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>{search ? `No applicants found for "${search}".` : "No applications yet."}</p>
            </div>
          ) : (
            <>
              {/* Mobile card layout (hidden on sm+) */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {apps.map((app) => (
                  <div key={app.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {getApplicantName(app)}
                        </p>
                        {app.applicant?.email && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {app.applicant.email}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor(app.status)}`}
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/applicant-profile/${app.applicant_id}`}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                      >
                        Profile
                      </Link>
                      {app.resume_path ? (
                        app.resume_path.toLowerCase().endsWith(".pdf") ? (
                          <a
                            href={app.resume_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                          >
                            View Resume
                          </a>
                        ) : (
                          <button
                            onClick={() =>
                              handleDownloadResume(app.resume_path!)
                            }
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                          >
                            Download Resume
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No resume
                        </span>
                      )}
                      <button
                        onClick={() => setChatApp(app)}
                        className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50 transition"
                      >
                        💬 Chat
                      </button>
                      {app.status === "applied" && (
                        <>
                          <button
                            onClick={() => handleStatus(app.id, "accepted")}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatus(app.id, "rejected")}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table (hidden on mobile) */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Applicant
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Applied
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apps.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {getApplicantName(app)}
                          </p>
                          {app.applicant?.email && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {app.applicant.email}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(app.status)}`}
                          >
                            {app.status.charAt(0).toUpperCase() +
                              app.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Link
                              to={`/applicant-profile/${app.applicant_id}`}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                            >
                              Profile
                            </Link>
                            {app.resume_path ? (
                              app.resume_path.toLowerCase().endsWith(".pdf") ? (
                                <a
                                  href={app.resume_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                                >
                                  View Resume
                                </a>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleDownloadResume(app.resume_path!)
                                  }
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition"
                                >
                                  Download Resume
                                </button>
                              )
                            ) : null}
                            <button
                              onClick={() => setChatApp(app)}
                              className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50 transition"
                            >
                              💬 Chat
                            </button>
                            {app.status === "applied" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatus(app.id, "accepted")
                                  }
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatus(app.id, "rejected")
                                  }
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {appData && total > PAGE_SIZE && (
            <div className="px-5 sm:px-6">
              <Pagination
                total={total}
                limit={PAGE_SIZE}
                offset={offset}
                onPageChange={setOffset}
                loading={appsLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {chatApp && (
        <ChatModal
          applicationId={chatApp.id}
          otherPartyEmail={
            getApplicantName(chatApp) !== `Applicant #${chatApp.applicant_id}`
              ? getApplicantName(chatApp)
              : (chatApp.applicant?.email ??
                `Applicant #${chatApp.applicant_id}`)
          }
          onClose={() => setChatApp(null)}
        />
      )}
    </div>
  );
}