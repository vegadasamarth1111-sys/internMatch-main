import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { adminService } from "../services/admin";
import type {
  AdminStats,
  AdminUser,
  AdminInternship,
  PaginatedAdminUsers,
  PaginatedAdminInternships,
} from "../services/admin";
import { ApiError } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Pagination } from "../components/Pagination";

type Tab = "overview" | "users" | "internships";

const PAGE_SIZE = 20;

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError, confirm } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users tab
  const [usersData, setUsersData] = useState<PaginatedAdminUsers | null>(null);
  const [usersOffset, setUsersOffset] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userIdSearch, setUserIdSearch] = useState("");

  // Internships tab
  const [internshipsData, setInternshipsData] =
    useState<PaginatedAdminInternships | null>(null);
  const [internshipsOffset, setInternshipsOffset] = useState(0);
  const [internshipsLoading, setInternshipsLoading] = useState(false);
  const [internshipSearch, setInternshipSearch] = useState("");
  const [internshipIdSearch, setInternshipIdSearch] = useState("");
  const [internshipStatusFilter, setInternshipStatusFilter] = useState("");

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && !(user as any).is_admin) navigate("/");
  }, [user, navigate]);

  // Load stats on mount
  useEffect(() => {
    adminService
      .getStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  // Users fetch
  const fetchUsers = useCallback(
    (offset: number, s: string, role: string, uid: string) => {
      setUsersLoading(true);
      adminService
        .getUsers({
          search: s || undefined,
          role: role || undefined,
          user_id: uid ? Number(uid) : undefined,
          limit: PAGE_SIZE,
          offset,
        })
        .then(setUsersData)
        .catch(() => toastError("Failed to load users."))
        .finally(() => setUsersLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (tab === "users") fetchUsers(usersOffset, search, roleFilter, userIdSearch);
  }, [tab, usersOffset, search, roleFilter, userIdSearch, fetchUsers]);

  // Reset offset when search/filter changes
  useEffect(() => {
    setUsersOffset(0);
  }, [search, roleFilter, userIdSearch]);

  // Internships fetch
  const fetchInternships = useCallback(
    (offset: number, s: string, iid: string, statusF: string) => {
      setInternshipsLoading(true);
      adminService
        .getInternships({
          search: s || undefined,
          internship_id: iid ? Number(iid) : undefined,
          status: statusF || undefined,
          // When no status filter, show all (include deleted)
          include_deleted: !statusF,
          limit: PAGE_SIZE,
          offset,
        })
        .then(setInternshipsData)
        .catch(() => toastError("Failed to load internships."))
        .finally(() => setInternshipsLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (tab === "internships")
      fetchInternships(
        internshipsOffset,
        internshipSearch,
        internshipIdSearch,
        internshipStatusFilter,
      );
  }, [
    tab,
    internshipsOffset,
    internshipSearch,
    internshipIdSearch,
    internshipStatusFilter,
    fetchInternships,
  ]);

  useEffect(() => {
    setInternshipsOffset(0);
  }, [internshipSearch, internshipIdSearch, internshipStatusFilter]);

  // Actions
  const handleBanToggle = async (u: AdminUser) => {
    const action = u.is_deleted ? "unban" : "ban";
    const ok = await confirm(`Are you sure you want to ${action} ${u.email}?`);
    if (!ok) return;
    setActionLoading(u.id);
    try {
      if (u.is_deleted) await adminService.unbanUser(u.id);
      else await adminService.banUser(u.id);
      fetchUsers(usersOffset, search, roleFilter, userIdSearch);
      success(`User ${action}ned.`);
    } catch (err) {
      toastError(
        err instanceof ApiError ? err.message : `Failed to ${action} user.`,
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteInternship = async (i: AdminInternship) => {
    const ok = await confirm(`Remove "${i.title}"? This cannot be undone.`);
    if (!ok) return;
    setActionLoading(i.id);
    try {
      await adminService.deleteInternship(i.id);
      fetchInternships(
        internshipsOffset,
        internshipSearch,
        internshipIdSearch,
        internshipStatusFilter,
      );
      success("Internship removed.");
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Failed to remove.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleInternship = async (i: AdminInternship) => {
    setActionLoading(i.id);
    try {
      const res = await adminService.toggleInternship(i.id);
      fetchInternships(
        internshipsOffset,
        internshipSearch,
        internshipIdSearch,
        internshipStatusFilter,
      );
      success(res.detail);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Failed to toggle.");
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.total_users, color: "text-gray-900" },
        { label: "Applicants", value: stats.total_applicants, color: "text-blue-600" },
        { label: "Recruiters", value: stats.total_recruiters, color: "text-purple-600" },
        { label: "Internships", value: stats.total_internships, color: "text-indigo-600" },
        { label: "Active Listings", value: stats.active_internships, color: "text-green-600" },
        { label: "Total Applications", value: stats.total_applications, color: "text-orange-600" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Moderation and platform overview</p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wide">
            Admin
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(["overview", "users", "internships"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSearch("");
                setRoleFilter("");
                setUserIdSearch("");
                setInternshipSearch("");
                setInternshipIdSearch("");
                setInternshipStatusFilter("");
              }}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition capitalize ${
                tab === t
                  ? "bg-white border border-b-white border-gray-200 text-blue-600 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {statsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                    <div className="h-9 bg-gray-200 rounded w-1/3" />
                  </div>
                ))
              : statCards.map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-500 font-medium">{label}</p>
                    <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
                  </div>
                ))}
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <>
            <div className="flex gap-3 mb-6 flex-wrap">
              <input
                type="text"
                placeholder="Search by email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) setUserIdSearch("");
                }}
                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Search by ID…"
                value={userIdSearch}
                onChange={(e) => {
                  setUserIdSearch(e.target.value);
                  if (e.target.value) setSearch("");
                }}
                className="w-36 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All roles</option>
                <option value="applicant">Applicants</option>
                <option value="recruiter">Recruiters</option>
              </select>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              {usersLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(usersData?.items ?? []).map((u) => (
                      <tr
                        key={u.id}
                        className={u.is_deleted ? "bg-red-50" : "hover:bg-gray-50"}
                      >
                        <td className="px-4 py-3 text-gray-400">{u.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {u.email}
                          {u.is_admin && (
                            <span className="ml-2 text-xs text-red-600 font-bold">[admin]</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.is_admin
                                ? "bg-red-100 text-red-700"
                                : u.role === "recruiter"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {u.is_admin ? "admin" : u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.is_deleted
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {u.is_deleted ? "Banned" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!u.is_admin && (
                            <button
                              onClick={() => handleBanToggle(u)}
                              disabled={actionLoading === u.id}
                              className={`px-3 py-1 rounded text-xs font-medium transition ${
                                u.is_deleted
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              } disabled:opacity-50`}
                            >
                              {actionLoading === u.id ? "…" : u.is_deleted ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!usersData || usersData.items.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {usersData && (
                <div className="px-4">
                  <Pagination
                    total={usersData.total}
                    limit={usersData.limit}
                    offset={usersData.offset}
                    onPageChange={setUsersOffset}
                    loading={usersLoading}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Internships */}
        {tab === "internships" && (
          <>
            <div className="flex gap-3 mb-6 flex-wrap">
              <input
                type="text"
                placeholder="Search by title…"
                value={internshipSearch}
                onChange={(e) => {
                  setInternshipSearch(e.target.value);
                  if (e.target.value) setInternshipIdSearch("");
                }}
                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Search by ID…"
                value={internshipIdSearch}
                onChange={(e) => {
                  setInternshipIdSearch(e.target.value);
                  if (e.target.value) setInternshipSearch("");
                }}
                className="w-36 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={internshipStatusFilter}
                onChange={(e) => setInternshipStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              {internshipsLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Posted</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(internshipsData?.items ?? []).map((i) => (
                        <tr
                          key={i.id}
                          className={
                            i.is_deleted ? "bg-red-50 opacity-60" : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 text-gray-400">{i.id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                            {i.title}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{i.location}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                i.is_deleted
                                  ? "bg-red-100 text-red-700"
                                  : i.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {i.is_deleted ? "Deleted" : i.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(i.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-2">
                            {!i.is_deleted && (
                              <>
                                <button
                                  onClick={() => handleToggleInternship(i)}
                                  disabled={actionLoading === i.id}
                                  className="px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-xs font-medium transition disabled:opacity-50"
                                >
                                  {actionLoading === i.id
                                    ? "…"
                                    : i.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                                </button>
                                <button
                                  onClick={() => handleDeleteInternship(i)}
                                  disabled={actionLoading === i.id}
                                  className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!internshipsData || internshipsData.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                            No internships found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {internshipsData && (
                <div className="px-4">
                  <Pagination
                    total={internshipsData.total}
                    limit={internshipsData.limit}
                    offset={internshipsData.offset}
                    onPageChange={setInternshipsOffset}
                    loading={internshipsLoading}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}