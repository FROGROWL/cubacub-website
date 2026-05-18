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
  ChevronDown,
  ChevronUp,
  FileText,
  ListChecks,
  Save,
} from "lucide-react";
// Analytics use simple SVG charts - easy to connect to database later
// Just replace the mock data arrays with your DB query results
import { useToast } from "../Toast";
import {
  getStaffAccounts,
  createStaffAccount,
  createAuditLogEntry,
  moveAuditLogsToTrash,
  restoreAuditLogs,
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
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  pingActivity,
  getLandingPageConfig,
  updateLandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  type StaffAccount,
  type AuditLogEntry,
  type AnalyticsSummary,
  type AdminProfile,
  type StaffAccountForm,
  type Incident,
  type Project,
  type CalendarEvent,
  type LandingPageConfig,
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

type AuditActionCategory =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "rejected"
  | "status"
  | "login"
  | "system"
  | "other";

const auditActionConfig: Record<AuditActionCategory, { label: string; dot: string; badge: string }> = {
  created: { label: "Created", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-600" },
  updated: { label: "Updated", dot: "bg-blue-400", badge: "bg-blue-50 text-blue-600" },
  deleted: { label: "Deleted", dot: "bg-rose-400", badge: "bg-rose-50 text-rose-600" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700" },
  status: { label: "Status Change", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-600" },
  login: { label: "Login", dot: "bg-violet-400", badge: "bg-violet-50 text-violet-600" },
  system: { label: "System", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
  other: { label: "Other", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
};

const normalizePhoneInput = (value: string) => value.replace(/\D/g, "").slice(0, 11);
const isValidPhilippineMobile = (value?: string) => !value || /^09\d{9}$/.test(value);
const toInputDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
  const [trashAuditLog, setTrashAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditView, setAuditView] = useState<"active" | "trash">("active");
  const [analytics, setAnalytics] =
    useState<AnalyticsSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRoleFilter, setAuditRoleFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState<"all" | AuditActionCategory>("all");
  const [auditSortBy, setAuditSortBy] = useState<"time" | "user" | "action">("time");
  const [auditSortDirection, setAuditSortDirection] = useState<"asc" | "desc">("desc");
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showAddCalendarEvent, setShowAddCalendarEvent] = useState(false);
  const [newCalendarEvent, setNewCalendarEvent] = useState({ date: "", title: "", color: "bg-violet-500" });
  const [adminSection, setAdminSection] = useState<"staff" | "services" | "calendar" | "audit" | "analytics">("staff");
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [landingConfigSaving, setLandingConfigSaving] = useState(false);
  const [showLandingServices, setShowLandingServices] = useState(true);
  const [adminProfile, setAdminProfile] =
    useState<AdminProfile>({
      name: getCurrentUser()?.name || "Kap. Roberto",
      email: "admin@cubacub.gov.ph",
      phone: "09621234567",
      address: "Barangay Hall, Cubacub",
    });
  const todayDate = toInputDate();

  /* Load data from services.ts on mount */
    useEffect(() => {
    getStaffAccounts().then(setAccounts);
    getAuditLog().then(setAuditLog);
    getAuditLog({ trash: true }).then(setTrashAuditLog);
    getAnalyticsSummary().then(setAnalytics);
    getIncidents().then(setIncidents);
    getProjects().then(setProjects);
    getAdminProfile().then(setAdminProfile);
    getLandingPageConfig().then(response => setLandingConfig(response.config)).catch(() => setLandingConfig(DEFAULT_LANDING_PAGE_CONFIG));
  }, []);

  useEffect(() => {
    const loadEvents = () => getCalendarEvents().then(setCalendarEvents);
    loadEvents();
    const handler = () => { loadEvents(); };
    window.addEventListener("calendarUpdate", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("calendarUpdate", handler);
      window.removeEventListener("storage", handler);
    };
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

  const getAuditActionCategory = (entry: AuditLogEntry): AuditActionCategory => {
    const action = entry.action.toLowerCase();
    if (entry.user === "System") return "system";
    if (/\b(deleted|removed)\b/.test(action)) return "deleted";
    if (/\brejected\b/.test(action)) return "rejected";
    if (/\bapproved\b/.test(action)) return "approved";
    if (/\b(created|added|submitted|registered)\b/.test(action)) return "created";
    if (/\b(updated|edited|changed|marked|saved)\b/.test(action)) return "updated";
    if (/\b(status|moved|set)\b/.test(action)) return "status";
    if (/\b(login|logged in|signed in)\b/.test(action)) return "login";
    return "other";
  };

  const getAuditActionSummary = (entry: AuditLogEntry) => entry.action.split(";")[0].trim();
  const getAuditActionDetails = (entry: AuditLogEntry) =>
    entry.action.split(";").slice(1).map(detail => detail.trim()).filter(Boolean);
  const displayedAuditLog = auditView === "trash" ? trashAuditLog : auditLog;

  const filteredAudit = displayedAuditLog.filter((a) => {
    const auditRole = getAuditRoleLabel(a);
    const roleLabel = roleConfig[auditRoleFilter]?.label;
    const actionCategory = getAuditActionCategory(a);
    const matchRole = auditRoleFilter === "all" || auditRole === roleLabel;
    const matchAction = auditActionFilter === "all" || actionCategory === auditActionFilter;
    const matchSearch =
      a.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      auditActionConfig[actionCategory].label.toLowerCase().includes(auditSearch.toLowerCase());
    return matchRole && matchAction && matchSearch;
  });
  const sortedAudit = [...filteredAudit].sort((left, right) => {
    const leftValue = auditSortBy === "time"
      ? new Date(left.time || 0).getTime()
      : auditSortBy === "action"
        ? auditActionConfig[getAuditActionCategory(left)].label
        : left.user;
    const rightValue = auditSortBy === "time"
      ? new Date(right.time || 0).getTime()
      : auditSortBy === "action"
        ? auditActionConfig[getAuditActionCategory(right)].label
        : right.user;
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" });
    return auditSortDirection === "asc" ? result : -result;
  });
  const adminCalendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const adminCalendarStartDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const adminMonthEvents = calendarEvents.filter((event) => {
    const date = new Date(event.date);
    return date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
  });
  const adminAuditUser = `${getCurrentUser()?.name || adminProfile.name || "Super Admin"} (super_admin, Super Admin)`;

  const refreshAuditTrail = () => {
    getAuditLog().then(setAuditLog).catch(() => {});
    getAuditLog({ trash: true }).then(setTrashAuditLog).catch(() => {});
  };

  const selectedAuditIds = sortedAudit.map(entry => entry.id).filter((id): id is number => typeof id === "number");

  const moveFilteredAuditToTrash = () => {
    if (selectedAuditIds.length === 0) {
      showToast("No audit entries match the current filters.", "error");
      return;
    }
    if (!window.confirm(`Move ${selectedAuditIds.length} filtered audit trail entries to Trash?`)) return;
    moveAuditLogsToTrash(selectedAuditIds).then(() => {
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminAuditUser,
        action: `Moved ${selectedAuditIds.length} filtered audit trail entries to Trash; view: ${auditView}; role filter: ${auditRoleFilter}; action filter: ${auditActionFilter}`,
        type: "warning",
      }).finally(refreshAuditTrail);
      showToast("Filtered audit entries moved to Trash.");
    }).catch(() => {
      showToast("Failed to move audit entries to Trash.", "error");
    });
  };

  const restoreFilteredAudit = () => {
    if (selectedAuditIds.length === 0) {
      showToast("No trashed audit entries match the current filters.", "error");
      return;
    }
    if (!window.confirm(`Restore ${selectedAuditIds.length} filtered audit trail entries?`)) return;
    restoreAuditLogs(selectedAuditIds).then(() => {
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminAuditUser,
        action: `Restored ${selectedAuditIds.length} filtered audit trail entries from Trash; role filter: ${auditRoleFilter}; action filter: ${auditActionFilter}`,
        type: "info",
      }).finally(refreshAuditTrail);
      showToast("Filtered audit entries restored.");
    }).catch(() => {
      showToast("Failed to restore audit entries.", "error");
    });
  };

  const addAdminCalendarEvent = () => {
    const title = newCalendarEvent.title.trim();
    if (!newCalendarEvent.date || !title) return;
    if (newCalendarEvent.date < todayDate) {
      showToast("Calendar events cannot be scheduled on a previous date.", "error");
      return;
    }

    const eventPayload = {
      date: newCalendarEvent.date,
      title,
      color: newCalendarEvent.color,
      source: "super_admin",
      type: "event" as const,
    };

    createCalendarEvent(eventPayload).then((createdEvent) => {
      getCalendarEvents().then(setCalendarEvents);
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminAuditUser,
        action: `Created admin calendar event ${createdEvent.id}: "${eventPayload.title}" scheduled on ${eventPayload.date}; source: ${eventPayload.source}; color: ${eventPayload.color}`,
        type: "info",
      }).then(refreshAuditTrail).catch(() => {});
      setNewCalendarEvent({ date: "", title: "", color: "bg-violet-500" });
      setShowAddCalendarEvent(false);
      showToast("Admin calendar event added.");
    }).catch(() => {
      showToast("Failed to add admin calendar event.", "error");
    });
  };

  const deleteAdminCalendarEvent = (id: string) => {
    const target = calendarEvents.find((event) => event.id === id);
    if (!window.confirm(`Delete calendar event${target ? ` "${target.title}"` : ""}? This cannot be undone.`)) return;

    deleteCalendarEvent(id).then(() => {
      getCalendarEvents().then(setCalendarEvents);
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminAuditUser,
        action: `Deleted admin calendar event ${id}: "${target?.title || "Unknown event"}" scheduled on ${target?.date || "unknown date"}; source: ${target?.source || "unknown"}; type: ${target?.type || "event"}; color: ${target?.color || "unknown"}`,
        type: "warning",
      }).then(refreshAuditTrail).catch(() => {});
      showToast("Calendar event deleted.");
    }).catch(() => {
      showToast("Failed to delete calendar event.", "error");
    });
  };

  const saveLandingConfig = () => {
    const cleaned: LandingPageConfig = {
      report_categories: landingConfig.report_categories
        .map(category => ({
          name: category.name.trim(),
          subcategories: category.subcategories.map(sub => sub.trim()).filter(Boolean),
        }))
        .filter(category => category.name),
      document_types: landingConfig.document_types
        .map(doc => ({
          name: doc.name.trim(),
          price: Number(doc.price || 0),
          info: doc.info.trim(),
          requirements: doc.requirements
            .map(req => ({ label: req.label.trim(), note: req.note.trim() }))
            .filter(req => req.label),
          requirementGroups: (doc.requirementGroups || [])
            .map(group => ({
              name: group.name.trim(),
              requirements: group.requirements
                .map(req => ({ label: req.label.trim(), note: req.note.trim() }))
                .filter(req => req.label),
            }))
            .filter(group => group.name),
        }))
        .filter(doc => doc.name),
    };

    if (!cleaned.report_categories.length || !cleaned.document_types.length) {
      showToast("Keep at least one report category and one document type.", "error");
      return;
    }

    setLandingConfigSaving(true);
    updateLandingPageConfig(cleaned)
      .then(response => {
        setLandingConfig(response.config);
        createAuditLogEntry({
          time: new Date().toLocaleString("en-PH"),
          user: adminAuditUser,
          action: `Updated landing page service configuration; report categories: ${response.config.report_categories.length}; document types: ${response.config.document_types.length}`,
          type: "info",
        }).then(refreshAuditTrail).catch(() => {});
        showToast("Landing page settings saved.");
      })
      .catch(() => showToast("Failed to save landing page settings.", "error"))
      .finally(() => setLandingConfigSaving(false));
  };

  const updateReportCategory = (index: number, value: string) => {
    setLandingConfig(prev => ({
      ...prev,
      report_categories: prev.report_categories.map((category, idx) => idx === index ? { ...category, name: value } : category),
    }));
  };

  const updateReportSubcategories = (index: number, value: string) => {
    setLandingConfig(prev => ({
      ...prev,
      report_categories: prev.report_categories.map((category, idx) => idx === index ? {
        ...category,
        subcategories: value.split("\n").map(item => item.trim()).filter(Boolean),
      } : category),
    }));
  };

  const updateDocumentType = (index: number, patch: Partial<LandingPageConfig["document_types"][number]>) => {
    setLandingConfig(prev => ({
      ...prev,
      document_types: prev.document_types.map((doc, idx) => idx === index ? { ...doc, ...patch } : doc),
    }));
  };

  const updateDocumentRequirement = (docIndex: number, reqIndex: number, patch: { label?: string; note?: string }) => {
    setLandingConfig(prev => ({
      ...prev,
      document_types: prev.document_types.map((doc, idx) => idx === docIndex ? {
        ...doc,
        requirements: doc.requirements.map((req, rIdx) => rIdx === reqIndex ? { ...req, ...patch } : req),
      } : doc),
    }));
  };

  const updateRequirementGroup = (docIndex: number, groupIndex: number, patch: { name?: string }) => {
    setLandingConfig(prev => ({
      ...prev,
      document_types: prev.document_types.map((doc, idx) => idx === docIndex ? {
        ...doc,
        requirementGroups: (doc.requirementGroups || []).map((group, gIdx) => gIdx === groupIndex ? { ...group, ...patch } : group),
      } : doc),
    }));
  };

  const updateGroupRequirement = (docIndex: number, groupIndex: number, reqIndex: number, patch: { label?: string; note?: string }) => {
    setLandingConfig(prev => ({
      ...prev,
      document_types: prev.document_types.map((doc, idx) => idx === docIndex ? {
        ...doc,
        requirementGroups: (doc.requirementGroups || []).map((group, gIdx) => gIdx === groupIndex ? {
          ...group,
          requirements: group.requirements.map((req, rIdx) => rIdx === reqIndex ? { ...req, ...patch } : req),
        } : group),
      } : doc),
    }));
  };

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

    if (!isValidPhilippineMobile(form.phone)) {
      showToast("Phone number must be 11 digits and start with 09.", "error");
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
        refreshAuditTrail();
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
          refreshAuditTrail();
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
      refreshAuditTrail();
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
    if (!isValidPhilippineMobile(adminProfile.phone)) {
      showToast("Phone number must be 11 digits and start with 09.", "error");
      return;
    }

    updateAdminProfile(adminProfile).then(() => {
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: adminProfile.name || "Super Admin",
        action: `Updated own admin profile: ${adminProfile.name}, ${adminProfile.email}, ${adminProfile.phone}`,
        type: "info",
      }).catch(() => {});
      refreshAuditTrail();
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
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { id: "staff", label: "Staff", desc: `${accounts.length} accounts`, icon: <UserPlus className="w-4 h-4" />, color: "from-violet-500 to-purple-600" },
          { id: "services", label: "Landing Services", desc: "Public form options", icon: <Settings className="w-4 h-4" />, color: "from-[#008080] to-[#00a89d]" },
          { id: "calendar", label: "Calendar", desc: `${calendarEvents.length} events`, icon: <Calendar className="w-4 h-4" />, color: "from-sky-500 to-blue-600" },
          { id: "audit", label: "Audit Trail", desc: `${auditLog.length} active logs`, icon: <Clock className="w-4 h-4" />, color: "from-amber-500 to-orange-500" },
          { id: "analytics", label: "Analytics", desc: "Service overview", icon: <ArrowUpDown className="w-4 h-4" />, color: "from-emerald-500 to-teal-600" },
        ].map(section => {
          const active = adminSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setAdminSection(section.id as typeof adminSection)}
              className={`rounded-2xl border p-4 text-left transition-all ${active ? "bg-white border-transparent shadow-lg shadow-black/5" : "bg-white/70 border-gray-100 hover:bg-white hover:shadow-sm"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} text-white flex items-center justify-center shadow-sm`}>
                  {section.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#1B263B]" style={{ fontWeight: active ? 700 : 500 }}>{section.label}</span>
                  <span className="block text-xs text-gray-400 truncate">{section.desc}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {adminSection === "staff" && (
      <>
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
      </>
      )}

      {adminSection === "services" && (
      <>
      {/* Landing Page Service Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="text-[#1B263B] flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" /> Landing Page Services
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">Control the choices citizens see on the public forms. Report categories affect File a Report. Document types, fees, and requirement rules affect Request Document.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLandingServices(prev => !prev)}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-100 text-gray-600 text-sm flex items-center justify-center gap-1.5 hover:bg-gray-50"
            >
              {showLandingServices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showLandingServices ? "Close" : "Open"}
            </button>
            <button
              type="button"
              onClick={saveLandingConfig}
              disabled={landingConfigSaving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {landingConfigSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
        {showLandingServices && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
        <div className="grid sm:grid-cols-3 gap-3 py-2">
          <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
            <p className="text-xs text-violet-500 uppercase tracking-wider">Report Categories</p>
            <p className="text-2xl text-[#1B263B] mt-1" style={{ fontFamily: "Montserrat" }}>{landingConfig.report_categories.length}</p>
            <p className="text-xs text-gray-500 mt-1">Shown in File a Report.</p>
          </div>
          <div className="rounded-2xl bg-[#008080]/5 border border-[#008080]/15 p-4">
            <p className="text-xs text-[#008080] uppercase tracking-wider">Document Types</p>
            <p className="text-2xl text-[#1B263B] mt-1" style={{ fontFamily: "Montserrat" }}>{landingConfig.document_types.length}</p>
            <p className="text-xs text-gray-500 mt-1">Shown in Request Document.</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wider">Requirement Types</p>
            <p className="text-2xl text-[#1B263B] mt-1" style={{ fontFamily: "Montserrat" }}>{landingConfig.document_types.reduce((sum, doc) => sum + (doc.requirementGroups?.length || 0), 0)}</p>
            <p className="text-xs text-gray-500 mt-1">For variants like Cedula.</p>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h4 className="text-[#1B263B] flex items-center gap-2"><ListChecks className="w-4 h-4 text-rose-500" /> File a Report</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">Each category appears in the public report form. Put one sub-category per line so users can choose the most accurate report type.</p>
              </div>
              <button
                type="button"
                onClick={() => setLandingConfig(prev => ({
                  ...prev,
                  report_categories: [...prev.report_categories, { name: "New Category", subcategories: ["Other"] }],
                }))}
                className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600"
              >
                + Add Category
              </button>
            </div>
            <div className="grid xl:grid-cols-2 gap-4">
              {landingConfig.report_categories.map((category, index) => (
                <div key={`${category.name}-${index}`} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Category Name</label>
                      <input
                        className="w-full bg-[#F5F7FA] border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none"
                        value={category.name}
                        onChange={(event) => updateReportCategory(index, event.target.value)}
                        placeholder="Category name"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLandingConfig(prev => ({
                        ...prev,
                        report_categories: prev.report_categories.filter((_, idx) => idx !== index),
                      }))}
                      className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Sub-categories</label>
                  <textarea
                    rows={5}
                    className="w-full bg-[#F5F7FA] border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none resize-y"
                    value={category.subcategories.join("\n")}
                    onChange={(event) => updateReportSubcategories(index, event.target.value)}
                    placeholder="One sub-category per line"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h4 className="text-[#1B263B] flex items-center gap-2"><FileText className="w-4 h-4 text-[#008080]" /> Request Document</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">Default requirements apply to everyone. Requirement types are optional and useful when one document has variants, like Cedula Individual, Business, or Employee.</p>
              </div>
              <button
                type="button"
                onClick={() => setLandingConfig(prev => ({
                  ...prev,
                  document_types: [...prev.document_types, { name: "New Document", price: 0, info: "", requirements: [] }],
                }))}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#008080]/10 text-[#008080]"
              >
                + Add Document
              </button>
            </div>
            <div className="space-y-5">
              {landingConfig.document_types.map((doc, docIndex) => (
                <div key={`${doc.name}-${docIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
                  <div className="grid md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-7">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Document Type</label>
                      <input
                        className="w-full bg-[#F5F7FA] border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none"
                        value={doc.name}
                        onChange={(event) => updateDocumentType(docIndex, { name: event.target.value })}
                        placeholder="Document type"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Price</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-[#F5F7FA] border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none"
                        value={doc.price}
                        onChange={(event) => updateDocumentType(docIndex, { price: Number(event.target.value || 0) })}
                        placeholder="Price"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLandingConfig(prev => ({
                        ...prev,
                        document_types: prev.document_types.filter((_, idx) => idx !== docIndex),
                      }))}
                      className="md:col-span-2 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Public Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-[#F5F7FA] border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none resize-y"
                    value={doc.info}
                    onChange={(event) => updateDocumentType(docIndex, { info: event.target.value })}
                    placeholder="Public description or requirement summary"
                  />
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs text-[#1B263B]" style={{ fontWeight: 600 }}>Default Requirements</p>
                        <p className="text-[11px] text-gray-400">Used when this document does not have requirement types.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDocumentType(docIndex, { requirements: [...doc.requirements, { label: "", note: "" }] })}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white border border-gray-100 text-gray-500"
                      >
                        + Add Requirement
                      </button>
                    </div>
                    {doc.requirements.map((req, reqIndex) => (
                      <div key={reqIndex} className="grid md:grid-cols-12 gap-2">
                        <input className="md:col-span-5 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={req.label} onChange={(event) => updateDocumentRequirement(docIndex, reqIndex, { label: event.target.value })} placeholder="Requirement" />
                        <input className="md:col-span-5 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={req.note} onChange={(event) => updateDocumentRequirement(docIndex, reqIndex, { note: event.target.value })} placeholder="Note" />
                        <button
                          type="button"
                          onClick={() => updateDocumentType(docIndex, { requirements: doc.requirements.filter((_, idx) => idx !== reqIndex) })}
                          className="md:col-span-2 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {!doc.requirements.length && <p className="text-xs text-gray-400">No extra uploaded requirements for this document.</p>}
                  </div>

                  <div className="rounded-2xl border border-[#008080]/15 bg-[#008080]/5 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs text-[#1B263B]" style={{ fontWeight: 600 }}>Requirement Types</p>
                        <p className="text-[11px] text-gray-500">Users choose one type, then upload only that type's requirements.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDocumentType(docIndex, { requirementGroups: [...(doc.requirementGroups || []), { name: "New Type", requirements: [] }] })}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white border border-gray-100 text-gray-500"
                      >
                        + Add Type
                      </button>
                    </div>
                    {(doc.requirementGroups || []).map((group, groupIndex) => (
                      <div key={`${group.name}-${groupIndex}`} className="rounded-2xl bg-white border border-gray-100 p-3 space-y-3">
                        <div className="flex gap-2 items-center">
                          <input
                            className="flex-1 bg-[#F5F7FA] rounded-xl px-3 py-2.5 text-sm outline-none"
                            value={group.name}
                            onChange={(event) => updateRequirementGroup(docIndex, groupIndex, { name: event.target.value })}
                            placeholder="Type name, e.g. Individual"
                          />
                          <button
                            type="button"
                            onClick={() => updateDocumentType(docIndex, { requirementGroups: (doc.requirementGroups || []).filter((_, idx) => idx !== groupIndex) })}
                            className="w-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {group.requirements.map((req, reqIndex) => (
                          <div key={reqIndex} className="grid md:grid-cols-12 gap-2">
                            <input className="md:col-span-5 bg-[#F5F7FA] rounded-xl px-3 py-2.5 text-sm outline-none" value={req.label} onChange={(event) => updateGroupRequirement(docIndex, groupIndex, reqIndex, { label: event.target.value })} placeholder="Requirement" />
                            <input className="md:col-span-5 bg-[#F5F7FA] rounded-xl px-3 py-2.5 text-sm outline-none" value={req.note} onChange={(event) => updateGroupRequirement(docIndex, groupIndex, reqIndex, { note: event.target.value })} placeholder="Note" />
                            <button
                              type="button"
                              onClick={() => {
                                const nextGroups = (doc.requirementGroups || []).map((nextGroup, idx) => idx === groupIndex ? {
                                  ...nextGroup,
                                  requirements: nextGroup.requirements.filter((_, rIdx) => rIdx !== reqIndex),
                                } : nextGroup);
                                updateDocumentType(docIndex, { requirementGroups: nextGroups });
                              }}
                              className="md:col-span-2 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextGroups = (doc.requirementGroups || []).map((nextGroup, idx) => idx === groupIndex ? {
                              ...nextGroup,
                              requirements: [...nextGroup.requirements, { label: "", note: "" }],
                            } : nextGroup);
                            updateDocumentType(docIndex, { requirementGroups: nextGroups });
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-[#008080]/10 text-[#008080]"
                        >
                          + Add Type Requirement
                        </button>
                      </div>
                    ))}
                    {!(doc.requirementGroups || []).length && <p className="text-xs text-gray-400">Use requirement types when a document has variants, like Cedula Individual, Business, or Employee.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
      </>
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
                          phone: normalizePhoneInput(e.target.value),
                        })
                      }
                      inputMode="numeric"
                      maxLength={11}
                    />
                    {form.phone && !isValidPhilippineMobile(form.phone) && (
                      <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>
                    )}
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
                  disabled={!form.username?.trim() || !form.name?.trim() || !form.role || (!editId && !form.password?.trim()) || !isValidPhilippineMobile(form.phone)}
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
                        phone: normalizePhoneInput(e.target.value),
                      })
                    }
                    inputMode="numeric"
                    maxLength={11}
                  />
                  {adminProfile.phone && !isValidPhilippineMobile(adminProfile.phone) && (
                    <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>
                  )}
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
                  disabled={!isValidPhilippineMobile(adminProfile.phone)}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-40"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {adminSection === "calendar" && (
      <>
      {/* Admin Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div>
            <h3 className="text-[#1B263B] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" /> Admin Calendar
            </h3>
            <p className="text-xs text-gray-400 mt-1">Shared calendar events across handler dashboards.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddCalendarEvent(true)}
              className="px-3 py-2 rounded-xl bg-violet-500 text-white text-xs flex items-center gap-1 hover:shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Event
            </button>
            <button
              type="button"
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear(year => year - 1);
                  return;
                }
                setCalendarMonth(month => month - 1);
              }}
              className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-500 min-w-32 text-center">
              {monthNames[calendarMonth]} {calendarYear}
            </span>
            <button
              type="button"
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear(year => year + 1);
                  return;
                }
                setCalendarMonth(month => month + 1);
              }}
              className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_22rem] gap-5">
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {["S","M","T","W","T","F","S"].map((day, index) => (
                <div key={`${day}-${index}`} className="text-gray-300 py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adminCalendarStartDay }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}
              {Array.from({ length: adminCalendarDaysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const event = adminMonthEvents.find(item => item.date === dateStr);
                return (
                  <div
                    key={day}
                    className={`min-h-12 rounded-xl text-xs p-2 transition-all ${event ? `${event.color} text-white shadow-sm` : dateStr < todayDate ? "bg-gray-50 text-gray-300" : "hover:bg-gray-50 text-gray-500"}`}
                    title={event?.title}
                  >
                    <span>{day}</span>
                    {event && <p className="mt-1 truncate text-[10px]">{event.title}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Events this month</p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {[...adminMonthEvents].sort((a, b) => a.date.localeCompare(b.date)).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${event.color} shrink-0`} />
                      <p className="text-xs text-[#1B263B] truncate">{event.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {monthNames[calendarMonth]} {new Date(event.date).getDate()}, {new Date(event.date).getFullYear()} - {event.source.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAdminCalendarEvent(event.id)}
                    className="w-8 h-8 rounded-xl bg-white text-gray-300 hover:text-rose-500 flex items-center justify-center transition-colors shrink-0"
                    title="Delete calendar event"
                    aria-label={`Delete ${event.title}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {adminMonthEvents.length === 0 && (
                <p className="text-xs text-gray-400 py-3">No calendar events for this month.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddCalendarEvent && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddCalendarEvent(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-sm" style={{ fontFamily: "Montserrat" }}>Add Admin Calendar Event</h3>
                  <button type="button" onClick={() => setShowAddCalendarEvent(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Date of Schedule</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      min={todayDate}
                      className="w-full bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                      value={newCalendarEvent.date}
                      onChange={(event) => setNewCalendarEvent({ ...newCalendarEvent, date: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Event Title</label>
                  <input
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none"
                    placeholder="e.g. Council Session"
                    value={newCalendarEvent.title}
                    onChange={(event) => setNewCalendarEvent({ ...newCalendarEvent, title: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-2 block">Event Color</label>
                  <div className="flex gap-2">
                    {[
                      { label: "Admin", color: "bg-violet-500" },
                      { label: "Official", color: "bg-[#1B263B]" },
                      { label: "Public", color: "bg-[#008080]" },
                      { label: "Urgent", color: "bg-rose-500" },
                    ].map((option) => (
                      <button
                        key={option.color}
                        type="button"
                        onClick={() => setNewCalendarEvent({ ...newCalendarEvent, color: option.color })}
                        className={`w-9 h-9 rounded-lg ${option.color} ${newCalendarEvent.color === option.color ? "ring-2 ring-offset-2 ring-violet-500" : ""}`}
                        title={option.label}
                        aria-label={option.label}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAdminCalendarEvent}
                  disabled={!newCalendarEvent.date || !newCalendarEvent.title.trim() || newCalendarEvent.date < todayDate}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:shadow-md transition-all"
                >
                  Add Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
      )}

      {adminSection === "audit" && (
      <>
      {/* Audit Trail */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-5">
          <h3 className="text-[#1B263B] flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-500" /> Audit
            Trail
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-gray-400">
              Showing {sortedAudit.length} of {displayedAuditLog.length} {auditView === "trash" ? "trashed" : "active"}
            </p>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setAuditView("active")}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${auditView === "active" ? "bg-white text-violet-600 shadow-sm" : "text-gray-400"}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setAuditView("trash")}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${auditView === "trash" ? "bg-white text-violet-600 shadow-sm" : "text-gray-400"}`}
              >
                Trash Bin
              </button>
            </div>
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
            </select>
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value as "all" | AuditActionCategory)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="status">Status Change</option>
              <option value="login">Login</option>
              <option value="other">Other</option>
            </select>
            <select
              value={auditSortBy}
              onChange={(e) => setAuditSortBy(e.target.value as typeof auditSortBy)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 outline-none"
            >
              <option value="time">Time</option>
              <option value="user">User</option>
              <option value="action">Action</option>
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
        <div className="mb-4 rounded-xl bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-700">
          Audit trail entries are automatically permanently deleted after 1 month from their original audit date. Moving an entry to the Trash Bin does not extend its deletion date, and trashed entries are not included in the active action count.
        </div>
        <div className="mb-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              placeholder="Search by user, action, or details..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {auditView === "active" ? (
              <button
                type="button"
                onClick={moveFilteredAuditToTrash}
                disabled={selectedAuditIds.length === 0}
                className="text-xs px-3 py-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Move Filtered to Trash
              </button>
            ) : (
              <button
                type="button"
                onClick={restoreFilteredAudit}
                disabled={selectedAuditIds.length === 0}
                className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 disabled:opacity-40"
              >
                Restore Filtered
              </button>
            )}
          </div>
        </div>
        <div className="space-y-0 max-h-[28rem] overflow-y-auto pr-2">
          {sortedAudit.map((a, i) => {
            const category = getAuditActionCategory(a);
            const config = auditActionConfig[category];
            const details = getAuditActionDetails(a);
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${config.dot} ring-4 ring-white shrink-0 mt-1`}
                  />
                  {i <
                    sortedAudit.length -
                      1 && (
                    <div className="w-px flex-1 bg-gray-100 min-h-[44px]" />
                  )}
                </div>
                <div className="pb-5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-[#1B263B]">
                      {a.user}
                    </span>
                    <span className="text-xs text-gray-300">
                      {a.time}
                    </span>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${config.badge}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400">
                      {getAuditRoleLabel(a)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {getAuditActionSummary(a)}
                  </p>
                  {details.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {details.map((detail) => (
                        <span key={detail} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-lg">
                          {detail}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sortedAudit.length === 0 && (
            <p className="text-xs text-gray-400 py-3">No audit entries match your search.</p>
          )}
        </div>
      </div>
      </>
      )}

      {adminSection === "analytics" && (
      <>
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
      </>
      )}
    </div>
  );
}
