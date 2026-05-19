import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut, FileText, AlertCircle, Heart, Shield, Menu, X, Home,
  ChevronDown, Sparkles, TrendingUp, Users, Clock,
  PanelLeftClose, PanelLeftOpen, DollarSign
} from "lucide-react";
import DocumentHandler from "./dashboard/DocumentHandler";
import ReportHandler from "./dashboard/ReportHandler";
import ClinicHandler from "./dashboard/ClinicHandler";
import SuperAdmin from "./dashboard/SuperAdmin";
import TreasurerHandler from "./dashboard/TreasurerHandler";
import { 
  getDocumentSummary, getReportSummary, getSuperAdminSummary,
  getPatientQueue, getProjects, getSystemSettings
} from "../api/services";

const ROLE_CONFIG: Record<string, { label: string; shortLabel: string; gradient: string; iconBg: string; icon: React.ReactNode; accentColor: string }> = {
  document_handler: {
    label: "Document Handler", shortLabel: "Documents",
    gradient: "from-[#1B263B] to-[#2d4a6e]", iconBg: "bg-[#1B263B]",
    icon: <FileText className="w-5 h-5" />, accentColor: "#1B263B",
  },
  report_handler: {
    label: "Report & Complaint Handler", shortLabel: "Reports",
    gradient: "from-amber-700 to-orange-500", iconBg: "bg-amber-700",
    icon: <AlertCircle className="w-5 h-5" />, accentColor: "#B45309",
  },
  clinic_handler: {
    label: "Clinic Handler", shortLabel: "Clinic",
    gradient: "from-[#008080] to-[#00a89d]", iconBg: "bg-[#008080]",
    icon: <Heart className="w-5 h-5" />, accentColor: "#008080",
  },
  treasurer: {
    label: "Treasurer", shortLabel: "Finance",
    gradient: "from-emerald-600 to-green-500", iconBg: "bg-emerald-600",
    icon: <DollarSign className="w-5 h-5" />, accentColor: "#059669",
  },
  super_admin: {
    label: "Super Admin", shortLabel: "Admin",
    gradient: "from-violet-600 to-purple-500", iconBg: "bg-violet-600",
    icon: <Shield className="w-5 h-5" />, accentColor: "#7C3AED",
  },
};

// Dashboard stat cards per role
interface RoleStat {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}

const formatCurrency = (value: number | string) => {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const logoImg = new URL("./images/logo.png", import.meta.url).href;




export default function Dashboard() {
  const navigate = useNavigate();

  /* ── State variables ────────────────────────────────────────────────── */
  const [role, setRole] = useState<string | null>(null);       // Current user's role (from localStorage)
  const [userName, setUserName] = useState("");                  // Current user's display name
  const [sideOpen, setSideOpen] = useState(() => typeof window === "undefined" ? true : window.innerWidth >= 768); // Sidebar open/collapsed toggle
  const [showProfile, setShowProfile] = useState(false);         // Profile dropdown menu visible
  const [roleStats, setRoleStats] = useState<RoleStat[]>([]);

  /* ── Auth check on page load ────────────────────────────────────────── 
   * DJANGO: Replace localStorage.getItem("role") with a call to 
   * GET /api/auth/me/ to verify the user's session is still valid.
   * If not authenticated, redirect to /login.
   */
  useEffect(() => {
    const r = localStorage.getItem("role");
    const n = localStorage.getItem("userName");
    if (!r) { navigate("/"); return; }
    setRole(r);
    setUserName(n || "Staff");
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSideOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadSummary = () => {
      if (role === "document_handler") {
        getDocumentSummary().then(summary => {
          setRoleStats([
            { label: "Pending Requests", value: summary.pending.toString(), change: "", icon: <FileText /> },
            { label: "Approved Today", value: summary.approved_today.toString(), change: "", icon: <TrendingUp /> },
            { label: "Total This Month", value: summary.total_this_month.toString(), change: "", icon: <Users /> },
          ]);
        });
      } else if (role === "report_handler") {
        getReportSummary().then(summary => {
          setRoleStats([
            { label: "Total Reports", value: String(summary.total_reports ?? summary.open_cases ?? 0), change: "", icon: <AlertCircle /> },
            { label: "Pending Reports", value: String(summary.pending_reports ?? summary.new_reports ?? 0), change: "", icon: <Shield /> },
            { label: "Investigation Reports", value: String(summary.investigation_reports ?? 0), change: "", icon: <Clock /> },
            { label: "Resolved Reports", value: String(summary.resolved_reports ?? 0), change: "", icon: <TrendingUp /> },
          ]);
        });
      } else if (role === "clinic_handler") {
        getPatientQueue().then(queue => {
          setRoleStats([
            { label: "Total Patients", value: queue.length.toString(), change: "", icon: <Users /> },
            { label: "Waiting", value: queue.filter(q => q.status === "waiting").length.toString(), change: "", icon: <Clock /> },
            { label: "In Progress", value: queue.filter(q => q.status === "in-progress").length.toString(), change: "", icon: <Heart /> },
            { label: "Completed", value: queue.filter(q => q.status === "completed").length.toString(), change: "", icon: <TrendingUp /> },
          ]);
        });
      } else if (role === "treasurer") {
        Promise.all([getProjects(), getSystemSettings()]).then(([projects, settings]) => {
          const totalBudget = Number(settings?.annual_budget ?? 0);
          const allocated = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
          const activeProjects = projects.filter(project => project.status === "ongoing").length;

          setRoleStats([
            { label: "Total Budget", value: `PHP ${formatCurrency(totalBudget)}`, change: "", icon: <DollarSign /> },
            { label: "Allocated", value: `PHP ${formatCurrency(allocated)}`, change: "", icon: <TrendingUp /> },
            { label: "Active Projects", value: activeProjects.toString(), change: "", icon: <FileText /> },
          ]);
        });
      } else if (role === "super_admin") {
        getSuperAdminSummary().then(summary => {
          setRoleStats([
            { label: "Total Staff", value: summary.total_staff.toString(), change: "", icon: <Users /> },
            { label: "Online Staff", value: summary.online_staff.toString(), change: "", icon: <TrendingUp /> },
            { label: "Actions Today", value: summary.actions_today.toString(), change: "", icon: <Sparkles /> },
          ]);
        });
      }
    };

    loadSummary();
    window.addEventListener("reportHandlerUpdate", loadSummary as EventListener);
    window.addEventListener("clinicUpdate", loadSummary as EventListener);
    window.addEventListener("treasurerDashboardUpdate", loadSummary as EventListener);
    return () => {
      window.removeEventListener("reportHandlerUpdate", loadSummary as EventListener);
      window.removeEventListener("clinicUpdate", loadSummary as EventListener);
      window.removeEventListener("treasurerDashboardUpdate", loadSummary as EventListener);
    };
  }, [role]);



  /* ── Logout handler ─────────────────────────────────────────────────── 
   * DJANGO: Also call POST /api/auth/logout/ to invalidate the token.
   */
  const logout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/staff-login");
  };

  if (!role) return null;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.document_handler;
  const stats = roleStats || [];
  const summaryGridClass = stats.length >= 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex overflow-x-hidden">
      <AnimatePresence>
        {sideOpen && (
          <motion.button
            type="button"
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSideOpen(false)}
            aria-label="Close sidebar"
          />
        )}
      </AnimatePresence>
      {/* --- Sidebar --- */}
      <motion.aside
        animate={{ width: sideOpen ? 260 : 0, opacity: sideOpen ? 1 : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed md:relative inset-y-0 left-0 z-40 overflow-hidden flex-shrink-0 flex flex-col"
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${config.gradient}`} />
        {/* Decorative orb */}
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full w-[260px]">
          {/* Logo */}
          <div className="px-5 py-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md overflow-hidden">
              <img src={logoImg} alt="Barangay Cubacub logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm text-white tracking-tight" style={{ fontFamily: "Montserrat" }}>Cubacub</p>
              <p className="text-[10px] text-white/30 tracking-widest uppercase">Civic-Flow</p>
            </div>
          </div>

          {/* User card */}
          <div className="mx-4 mb-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-sm" style={{ fontFamily: "Montserrat" }}>
                {userName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{userName}</p>
                <p className="text-[11px] text-white/40 truncate">{config.shortLabel}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-4 space-y-1 flex-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm">
              {config.icon}
              <span>Dashboard</span>
            </button>
            <button onClick={() => { setSideOpen(false); navigate("/"); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 text-sm transition-all">
              <Home className="w-5 h-5" />
              <span>Public Page</span>
            </button>
          </nav>

          {/* Logout */}
          <div className="px-4 pb-6">
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/5 text-sm transition-all">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* --- Main --- */}
      <div className="flex-1 min-w-0 w-full flex flex-col">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-3 sm:px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => setSideOpen(!sideOpen)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
              {sideOpen ? <PanelLeftClose className="w-4 h-4 text-gray-400" /> : <PanelLeftOpen className="w-4 h-4 text-gray-400" />}
            </button>
            <div className="min-w-0">
              <h3 className="text-[#1B263B] tracking-tight truncate" style={{ fontFamily: "Montserrat" }}>{config.label}</h3>
              <p className="text-xs text-gray-400 truncate">{new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Profile */}
            <div className="relative">
              <button onClick={() => { setShowProfile(!showProfile); }} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-xs`}>
                  {userName[0]}
                </div>
                <span className="hidden sm:block text-sm text-gray-600">{userName.split(" ")[0]}</span>
                <ChevronDown className="w-3 h-3 text-gray-300" />
              </button>
              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm text-[#1B263B]">{userName}</p>
                      <p className="text-xs text-gray-400">{config.label}</p>
                    </div>
                    <button onClick={() => navigate("/")} className="w-full px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 text-left flex items-center gap-2">
                      <Home className="w-4 h-4" /> Public Page
                    </button>
                    <button onClick={logout} className="w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 text-left flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-3 sm:p-4 md:p-6 flex-1 min-w-0" onClick={() => { setShowProfile(false); }}>
          {/* Note removed: no automatic 1-day promotion applied anymore */}

          {/* Stat cards */}
          <div className="mb-6">
            <div className={`grid ${summaryGridClass} gap-3`}>
            {stats.map((s, i) => (
              <motion.div 
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-sm shadow-black/5 border border-gray-100 hover:shadow-md transition-shadow overflow-hidden relative"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${config.gradient}`} />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white/85 shrink-0`}>
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide truncate">{s.label}</p>
                    <p className="text-xl text-[#1B263B] mt-0.5 truncate" style={{ fontFamily: "Montserrat" }}>{s.value}</p>
                    {s.change && <p className="text-xs text-[#008080] mt-0.5 truncate">{s.change}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>

          {/* Role content */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {role === "document_handler" && <DocumentHandler />}
            {role === "report_handler" && <ReportHandler />}
            {role === "clinic_handler" && <ClinicHandler />}
            {role === "treasurer" && <TreasurerHandler />}
            {role === "super_admin" && <SuperAdmin />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
