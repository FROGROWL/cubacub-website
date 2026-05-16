import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Clock,
  X,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Settings,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// Analytics use simple SVG charts - easy to connect to database later
// Just replace the mock data arrays with your DB query results
import { useToast } from "../Toast";
import {
  getStaffAccounts,
  createStaffAccount,
  createAuditLogEntry,
  updateStaffAccount,
  deleteStaffAccount as apiDeleteStaffAccount,
  getAuditLog,
  getAnalyticsSummary,
  getCurrentUser,
  getAdminProfile,
  getAuthToken,
  updateAdminProfile,
  getIncidents,
  getProjects,
  pingActivity,
  type StaffAccount,
  type AuditLogEntry,
  type AnalyticsSummary,
  type AdminProfile,
  type StaffAccountForm,
  type Incident,
  type Project,
} from "../../api/services";

const COLORS = [
  "#1B263B",
  "#008080",
  "#00a89d",
  "#FF6B6B",
  "#FFD93D",
];

const roleConfig: Record<
  string,
  { label: string; gradient: string }
> = {
  document_handler: {
    label: "Document Handler",
    gradient: "from-[#1B263B] to-[#2d4a6e]",
  },
  report_handler: {
    label: "Report Handler",
    gradient: "from-amber-600 to-orange-500",
  },
  clinic_handler: {
    label: "Clinic Handler",
    gradient: "from-emerald-500 to-teal-600",
  },
  treasurer: {
    label: "Treasurer",
    gradient: "from-emerald-600 to-green-500",
  },
  super_admin: {
    label: "Super Admin",
    gradient: "from-violet-500 to-purple-600",
  },
};

const auditDotColors: Record<string, string> = {
  success: "bg-emerald-400",
  error: "bg-rose-400",
  warning: "bg-amber-400",
  info: "bg-blue-400",
};

export default function SuperAdmin() {
  const STAFF_PAGE_SIZE = 6;
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [search, setSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffAccountForm>({
    username: "",
    name: "",
    role: "document_handler",
    phone: "",
    email: "",
    address: "",
    birthdate: "",
    sex: "Male",
    password: "",   // now valid
  });
  const { showToast } = useToast();

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [analytics, setAnalytics] =
    useState<AnalyticsSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRoleFilter, setAuditRoleFilter] = useState("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [auditSortBy, setAuditSortBy] = useState<"time" | "user" | "type">("time");
  const [auditSortDirection, setAuditSortDirection] = useState<"asc" | "desc">("desc");
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [adminProfile, setAdminProfile] =
    useState<AdminProfile>({
      name: getCurrentUser()?.name || "Kap. Roberto",
      email: "admin@cubacub.gov.ph",
      phone: "09621234567",
      address: "Barangay Hall, Cubacub",
    });

  /* Load data from services.ts on mount */
    useEffect(() => {
    getStaffAccounts().then(setAccounts);
    getAuditLog().then(setAuditLog);
    getAnalyticsSummary().then(setAnalytics);
    getIncidents().then(setIncidents);
    getProjects().then(setProjects);
    getAdminProfile().then(setAdminProfile);
  }, []);

  const isDocumentRefund = (incident: Incident) =>
    incident.category === "Document Refund" || (incident.subcategory || "").toLowerCase().includes("refund");

  const serviceVolume = analytics?.serviceVolume || [];
  const hasUpdatedReportBreakdown = serviceVolume.some(item => item.label === "Case Management" || item.label === "Document Refund");
  const hasProjectsVolume = serviceVolume.some(item => item.label === "Total Projects");
  const caseManagementCount = incidents.filter(incident => !isDocumentRefund(incident)).length;
  const documentRefundCount = incidents.filter(isDocumentRefund).length;
  const baseServiceData = hasUpdatedReportBreakdown
    ? serviceVolume
    : [
        ...(serviceVolume.filter(item => item.label !== "Reports" && item.label !== "Case Management" && item.label !== "Document Refund")),
        { label: "Case Management", value: caseManagementCount, color: "#008080" },
        { label: "Document Refund", value: documentRefundCount, color: "#7C3AED" },
      ];
  const simpleServiceData = hasProjectsVolume
    ? baseServiceData
    : [...baseServiceData, { label: "Total Projects", value: projects.length, color: "#059669" }];
  const totalServiceVolume = simpleServiceData.reduce((sum, item) => sum + item.value, 0);
  const maxServiceVolume = Math.max(...simpleServiceData.map((item) => item.value), 1);
  const topService = simpleServiceData.reduce(
    (top, item) => item.value > top.value ? item : top,
    { label: "None", value: 0, color: "#CBD5E1" },
  );

  const pieData = analytics?.documentBreakdown || [];
  const documentBreakdownTotal = pieData.reduce((sum, item) => sum + item.value, 0);

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.username.toLowerCase().includes(search.toLowerCase()),
  );

  const staffTotalPages = Math.max(1, Math.ceil(filtered.length / STAFF_PAGE_SIZE));
  const currentStaffPage = Math.min(staffPage, staffTotalPages);
  const paginatedStaff = filtered.slice(
    (currentStaffPage - 1) * STAFF_PAGE_SIZE,
    currentStaffPage * STAFF_PAGE_SIZE,
  );

  const getAuditRoleLabel = (entry: AuditLogEntry) => {
    if (entry.user === "System") return "System";
    const roleMatch = entry.user.match(/,\s*([^)]+)\)$/);
    return roleMatch?.[1] || "Unknown";
  };

  const filteredAudit = auditLog.filter((a) => {
    const auditRole = getAuditRoleLabel(a);
    const roleLabel = auditRoleFilter === "system" ? "System" : roleConfig[auditRoleFilter]?.label;
    const matchRole = auditRoleFilter === "all" || auditRole === roleLabel;
    const matchType = auditTypeFilter === "all" || a.type === auditTypeFilter;
    const matchSearch =
      a.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.action.toLowerCase().includes(auditSearch.toLowerCase());
    return matchRole && matchType && matchSearch;
  });
  const sortedAudit = [...filteredAudit].sort((left, right) => {
    const leftValue = auditSortBy === "time" ? new Date(left.time || 0).getTime() : String(left[auditSortBy] || "");
    const rightValue = auditSortBy === "time" ? new Date(right.time || 0).getTime() : String(right[auditSortBy] || "");
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" });
    return auditSortDirection === "asc" ? result : -result;
  });

  useEffect(() => {
    setStaffPage(1);
  }, [search]);

  const resetStaffForm = () => {
    setForm({
      username: "",
      name: "",
      role: "document_handler",
      phone: "",
      email: "",
      address: "",
      birthdate: "",
      sex: "Male",
      password: "",
    });
  };

  const saveAccount = () => {
    const username = form.username?.trim() || "";
    const name = form.name?.trim() || "";
    const role = form.role?.trim() || "";
    const password = form.password?.trim() || "";

    if (!username || !name || !role) {
      showToast("Username, name, and role are required.", "error");
      return;
    }

    if (!editId && !password) {
      showToast("Password is required for new staff accounts.", "error");
      return;
    }

    const payload = { ...form, username, name, role, password };
    if (editId) {
      updateStaffAccount(editId, payload).then(() => {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === editId ? ({ ...a, ...payload } as StaffAccount) : a
          )
        );
        getAuditLog().then(setAuditLog);
        showToast("Account updated!");
        setShowForm(false);
        setEditId(null);
        resetStaffForm();
      }).catch(() => {
        showToast("Failed to update account. Please review the fields.", "error");
      });
    } else {
      createStaffAccount(payload as Omit<StaffAccount, "id"> & { password: string })
        .then((newAcc) => {
          setAccounts((prev) => [...prev, newAcc]);
          getAuditLog().then(setAuditLog);
          showToast("Account created!");
          setShowForm(false);
          setEditId(null);
          resetStaffForm();
        }).catch(() => {
          showToast("Failed to create account. Username may already exist.", "error");
        });
    }
  };

  const deleteAccount = (id: string) => {
    apiDeleteStaffAccount(id).then(() => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      getAuditLog().then(setAuditLog); // refresh from backend
      showToast("Account deleted!", "error");
    }).catch(() => {
      showToast("Failed to delete account. Please try again.", "error");
    });
  };

  const startEdit = (a: StaffAccount) => {
    setForm({
      username: a.username,
      name: a.name,
      role: a.role,
      phone: a.phone,
      email: a.email,
      address: a.address,
      birthdate: a.birthdate,
      sex: a.sex,
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const saveAdminProfile = () => {
    updateAdminProfile(adminProfile).then(() => {
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminProfile.name || "Super Admin",
        action: `Updated own admin profile: ${adminProfile.name}, ${adminProfile.email}, ${adminProfile.phone}`,
        type: "info",
      }).catch(() => {});
      getAuditLog().then(setAuditLog); // refresh from backend
    });
    setShowMyProfile(false);
    showToast("Profile updated! Refresh to see name change.");
  };

  useEffect(() => {
    const interval = setInterval(() => {
        const token = getAuthToken();
        if (token) {
          pingActivity().catch(() => {});
        }
      }, 30000);
      return () => clearInterval(interval);
    }, []);

  return (
    <div className="space-y-6">
      {/* Account Management Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-[#1B263B]">Staff Accounts</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-200 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowMyProfile(true)}
            className="bg-white border border-gray-100 text-gray-600 px-3 py-2.5 rounded-xl text-sm flex items-center gap-1.5 hover:bg-gray-50 transition-all"
          >
            <Settings className="w-4 h-4" /> My Profile
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setForm({
                username: "",
                name: "",
                role: "document_handler",
                phone: "",
                email: "",
                address: "",
                birthdate: "",
                sex: "Male",
                password: "",
              });
              setEditId(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow-lg shadow-violet-500/20 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </motion.button>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {paginatedStaff.map((a) => {
          const rc =
            roleConfig[a.role] || roleConfig.document_handler;
          return (
            <motion.div
              key={a.id}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-white text-sm shadow-md`}
                  >
                    {a.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm text-[#1B263B]">
                      {a.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{a.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                        {rc.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${a.is_online ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${a.is_online ? "bg-emerald-400" : "bg-gray-300"}`}
                        />{" "}
                        {a.is_online ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => startEdit(a)}
                    className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAccount(a.id)}
                    className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Profile details */}
              <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-1.5 text-xs text-gray-400">
                {a.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {a.phone}
                  </span>
                )}
                {a.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {a.email}
                  </span>
                )}
                {a.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {a.address}
                  </span>
                )}
                {a.birthdate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {a.birthdate}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
          No staff accounts match your search.
        </div>
      )}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">
            Showing {(currentStaffPage - 1) * STAFF_PAGE_SIZE + 1}-{Math.min(currentStaffPage * STAFF_PAGE_SIZE, filtered.length)} of {filtered.length} staff accounts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStaffPage(page => Math.max(1, page - 1))}
              disabled={currentStaffPage === 1}
              className="w-9 h-9 rounded-xl border border-gray-100 bg-white text-gray-500 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-20 text-center">
              Page {currentStaffPage} of {staffTotalPages}
            </span>
            <button
              onClick={() => setStaffPage(page => Math.min(staffTotalPages, page + 1))}
              disabled={currentStaffPage === staffTotalPages}
              className="w-9 h-9 rounded-xl border border-gray-100 bg-white text-gray-500 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Account Modal */}
      <AnimatePresence>
        {showForm && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <h3
                    className="text-white flex items-center gap-2"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    <UserPlus className="w-5 h-5" />
                    {editId ? "Edit" : "New"} Account
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-3 overflow-y-auto flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Account Info
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Username*
                    </label>
                    <input
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.username}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          username: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Password*
                    </label>
                    <input
                      type="password"
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.password || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Role*
                    </label>
                    <select
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.role}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          role: e.target.value,
                        })
                      }
                    >
                      {Object.entries(roleConfig).map(
                        ([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-2">
                  Personal Information
                </p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Full Name*
                  </label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Birthdate
                    </label>
                    <input
                      type="date"
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.birthdate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          birthdate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Sex
                    </label>
                    <select
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.sex}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sex: e.target.value,
                        })
                      }
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-2">
                  Contact Info
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Phone
                    </label>
                    <input
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      placeholder="09XX-XXX-XXXX"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Address
                  </label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    placeholder="e.g. Sitio Magsaysay, Cubacub"
                    value={form.address}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={saveAccount}
                  disabled={!form.username?.trim() || !form.name?.trim() || !form.role || (!editId && !form.password?.trim())}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl disabled:opacity-40 hover:shadow-lg transition-all mt-2"
                >
                  {editId ? "Update" : "Create"} Account
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Profile Modal */}
      <AnimatePresence>
        {showMyProfile && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMyProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
                <div className="flex justify-between items-center">
                  <h3
                    className="text-white"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    My Profile
                  </h3>
                  <button
                    onClick={() => setShowMyProfile(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg">
                    {adminProfile.name[0]}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">
                    Display Name
                  </label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={adminProfile.name}
                    onChange={(e) =>
                      setAdminProfile({
                        ...adminProfile,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={adminProfile.email}
                    onChange={(e) =>
                      setAdminProfile({
                        ...adminProfile,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">
                    Phone
                  </label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={adminProfile.phone}
                    onChange={(e) =>
                      setAdminProfile({
                        ...adminProfile,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">
                    Address
                  </label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    value={adminProfile.address}
                    onChange={(e) =>
                      setAdminProfile({
                        ...adminProfile,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  onClick={saveAdminProfile}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Trail */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-5">
          <h3 className="text-[#1B263B] flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-500" /> Audit
            Trail
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-gray-400">
              Showing {sortedAudit.length} of {auditLog.length}
            </p>
            <select
              value={auditRoleFilter}
              onChange={(e) => setAuditRoleFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
            >
              <option value="all">All Handlers</option>
              <option value="document_handler">Document Handler</option>
              <option value="report_handler">Report Handler</option>
              <option value="clinic_handler">Clinic Handler</option>
              <option value="treasurer">Treasurer</option>
              <option value="super_admin">Super Admin</option>
              <option value="system">System</option>
            </select>
            <select
              value={auditTypeFilter}
              onChange={(e) => setAuditTypeFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
            >
              <option value="all">All Types</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <select
              value={auditSortBy}
              onChange={(e) => setAuditSortBy(e.target.value as typeof auditSortBy)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
            >
              <option value="time">Time</option>
              <option value="user">User</option>
              <option value="type">Type</option>
            </select>
            <button
              onClick={() => setAuditSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-gray-600 flex items-center gap-1 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {auditSortDirection === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              placeholder="Search by user or action..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-0 max-h-[28rem] overflow-y-auto pr-2">
          {sortedAudit.map((a, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${auditDotColors[a.type] || "bg-gray-300"} ring-4 ring-white shrink-0 mt-1`}
                />
                {i <
                  sortedAudit.length -
                    1 && (
                  <div className="w-px flex-1 bg-gray-100 min-h-[32px]" />
                )}
              </div>
              <div className="pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#1B263B]">
                    {a.user}
                  </span>
                  <span className="text-xs text-gray-300">
                    {a.time}
                  </span>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${a.type === "success" ? "bg-emerald-50 text-emerald-600" : a.type === "warning" ? "bg-amber-50 text-amber-600" : a.type === "error" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                    {a.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {a.action}
                </p>
              </div>
            </div>
          ))}
          {sortedAudit.length === 0 && (
            <p className="text-xs text-gray-400 py-3">No audit entries match your search.</p>
          )}
        </div>
      </div>

      {/* Analytics */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-[#1B263B]">
              Analytics Overview
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Service activity across public requests and handled records.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2.5 py-1 rounded-full bg-white border border-gray-100">
              Total Volume: {totalServiceVolume}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white border border-gray-100">
              Top: {topService.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {simpleServiceData.map((d) => (
            <div
              key={d.label}
              className="bg-white rounded-2xl p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 leading-tight min-h-8">
                    {d.label}
                  </p>
                  <p
                    className="text-2xl text-[#1B263B] mt-1"
                    style={{ fontFamily: "Montserrat" }}
                  >
                    {d.value}
                  </p>
                </div>
                <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: d.color }} />
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: d.color,
                    width: `${(d.value / maxServiceVolume) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-3">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-[#1B263B] text-sm">
                Service Volume
              </h3>
              <span className="text-xs text-gray-400">
                {simpleServiceData.length} categories
              </span>
            </div>
            <div className="space-y-3">
              {simpleServiceData.map((d) => {
                const width = (d.value / maxServiceVolume) * 100;
                return (
                  <div
                    key={d.label}
                    className="grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,2fr)_3rem] items-center gap-3"
                  >
                    <span className="text-xs text-gray-500 truncate">
                      {d.label}
                    </span>
                    <div className="h-8 bg-gray-50 rounded-xl overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-xl"
                        style={{ backgroundColor: d.color }}
                      />
                    </div>
                    <span className="text-xs text-[#1B263B] text-right">
                      {d.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[#1B263B] text-sm">
                Document Breakdown
              </h3>
              <span className="text-xs text-gray-400">
                {pieData.length} types
              </span>
            </div>
            <div
              className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center justify-center gap-4"
              style={{ height: 230 }}
            >
              {documentBreakdownTotal > 0 ? (
                <>
                  <svg
                    viewBox="0 0 200 200"
                    width="150"
                    height="150"
                    className="shrink-0"
                  >
                    {(() => {
                      let cumulative = 0;
                      return pieData.map((c) => {
                        const pct = c.value / documentBreakdownTotal;
                        const startAngle =
                          cumulative * 2 * Math.PI - Math.PI / 2;
                        cumulative += pct;
                        const endAngle =
                          cumulative * 2 * Math.PI - Math.PI / 2;
                        const largeArc = pct > 0.5 ? 1 : 0;
                        const gap = 0.02;
                        const s = startAngle + gap;
                        const e = endAngle - gap;
                        const r1 = 50,
                          r2 = 80,
                          cx = 100,
                          cy = 100;
                        const d = `M ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} L ${cx + r2 * Math.cos(s)} ${cy + r2 * Math.sin(s)} A ${r2} ${r2} 0 ${largeArc} 1 ${cx + r2 * Math.cos(e)} ${cy + r2 * Math.sin(e)} L ${cx + r1 * Math.cos(e)} ${cy + r1 * Math.sin(e)} A ${r1} ${r1} 0 ${largeArc} 0 ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} Z`;
                        return (
                          <path key={c.name} d={d} fill={c.fill} />
                        );
                      });
                    })()}
                  </svg>
                  <div className="w-full space-y-2">
                    {pieData.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.fill }}
                        />
                        <span className="text-gray-500 truncate">
                          {c.name}
                        </span>
                        <span className="text-gray-400 ml-auto">
                          {c.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-gray-400">
                  No document activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
