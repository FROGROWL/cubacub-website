import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Building, MapPin, Calendar, Search, Filter,
  PieChart as PieChartIcon, BarChart2, ExternalLink, ArrowUpDown
} from "lucide-react";
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getPublicProjects, getSystemSettings, getBudgetSummary, type PublicProject, type BudgetSummary } from "../api/services";

const roadImg = "https://images.unsplash.com/photo-1655651381741-6e599389603a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3Zlcm5tZW50JTIwaW5mcmFzdHJ1Y3R1cmUlMjByb2FkJTIwY29uc3RydWN0aW9uJTIwUGhpbGlwcGluZXN8ZW58MXx8fHwxNzc0ODQ2MDg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const waterImg = "https://images.unsplash.com/photo-1566577909536-f9cf960727a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjB3YXRlciUyMHN5c3RlbSUyMHByb2plY3R8ZW58MXx8fHwxNzc0ODQ2MDg5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const parkImg = "https://images.unsplash.com/photo-1771169204750-3b1b20d98053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdWJsaWMlMjBwYXJrJTIwcGxheWdyb3VuZCUyMHJlbm92YXRpb258ZW58MXx8fHwxNzc0ODQ2MDg5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

/* Image mapping for projects — DJANGO: replace with image URLs from the database */
const PROJECT_IMAGES: Record<string, string> = {
  "PRJ-001": roadImg, "PRJ-002": waterImg, "PRJ-003": parkImg,
  "PRJ-004": waterImg, "PRJ-005": roadImg,
};

type Project = PublicProject;

/* OLD HARDCODED PROJECTS — kept as fallback reference only.
 * The component now loads from services.ts via getPublicProjects() in useEffect.
 * DJANGO: Delete this entire constant once the API is connected. */
const _LEGACY_PROJECTS: Project[] = [
  {
    id: "PRJ-001", name: "Road Improvement Phase 2", status: "ongoing",
    budget: 2450000, spent: 1592500, progress: 65, image: roadImg,
    description: "Rehabilitation and concreting of interior barangay roads from Purok 3 to Purok 6 to improve connectivity and reduce flooding during rainy season.",
    location: "Purok 3 – Purok 6", startDate: "2026-01-15", endDate: "2026-06-30",
    contractor: "RDG Construction Co.", source: "20% Development Fund",
    category: "Infrastructure",
    milestones: [
      { label: "Site clearing & preparation", date: "2026-01-20", done: true },
      { label: "Phase 1 concreting (Purok 3-4)", date: "2026-02-28", done: true },
      { label: "Phase 2 concreting (Purok 5-6)", date: "2026-04-15", done: false },
      { label: "Drainage installation", date: "2026-05-30", done: false },
      { label: "Final inspection & turnover", date: "2026-06-30", done: false },
    ]
  },
  {
    id: "PRJ-002", name: "Community Water System Upgrade", status: "ongoing",
    budget: 1800000, spent: 720000, progress: 40, image: waterImg,
    description: "Installation of new deep well pump and distribution pipes to address water supply issues in Purok 1, 2, and 7. Includes water testing and quality assurance.",
    location: "Purok 1, 2, 7", startDate: "2026-02-01", endDate: "2026-08-31",
    contractor: "Mandaue City Water District", source: "Congressman's Fund / DILG Grant",
    category: "Water & Sanitation",
    milestones: [
      { label: "Well drilling & testing", date: "2026-02-28", done: true },
      { label: "Pump installation", date: "2026-03-31", done: true },
      { label: "Pipe laying (Purok 1-2)", date: "2026-05-15", done: false },
      { label: "Pipe laying (Purok 7)", date: "2026-07-15", done: false },
      { label: "Water quality testing & commissioning", date: "2026-08-31", done: false },
    ]
  },
  {
    id: "PRJ-003", name: "Cubacub Mini Park & Playground", status: "upcoming",
    budget: 950000, spent: 0, progress: 0, image: parkImg,
    description: "Construction of a community mini-park and children's playground at the vacant lot beside the barangay hall. Includes benches, LED lighting, and landscaping.",
    location: "Beside Barangay Hall", startDate: "2026-07-01", endDate: "2026-10-31",
    contractor: "To be awarded (bidding June 2026)", source: "Barangay General Fund",
    category: "Community Facilities",
    milestones: [
      { label: "Bidding process", date: "2026-06-15", done: false },
      { label: "Site preparation", date: "2026-07-15", done: false },
      { label: "Playground equipment installation", date: "2026-09-01", done: false },
      { label: "Landscaping & lighting", date: "2026-10-15", done: false },
      { label: "Grand opening", date: "2026-10-31", done: false },
    ]
  },
  {
    id: "PRJ-004", name: "Barangay Health Center Renovation", status: "completed",
    budget: 1200000, spent: 1150000, progress: 100, image: waterImg,
    description: "Complete renovation of the Cubacub Health Center including new examination rooms, pharmacy storage, patient waiting area, and ADA-compliant facilities.",
    location: "Barangay Health Center", startDate: "2025-08-01", endDate: "2025-12-15",
    contractor: "Cebu Build Corp.", source: "DOH / LGU Fund",
    category: "Health",
    milestones: [
      { label: "Demolition & clearing", date: "2025-08-15", done: true },
      { label: "Structural works", date: "2025-09-30", done: true },
      { label: "Interior finishing", date: "2025-11-15", done: true },
      { label: "Equipment installation", date: "2025-12-01", done: true },
      { label: "Turnover & inauguration", date: "2025-12-15", done: true },
    ]
  },
  {
    id: "PRJ-005", name: "Street Lighting Program (Phase 1)", status: "completed",
    budget: 450000, spent: 430000, progress: 100, image: roadImg,
    description: "Installation of 50 LED streetlights along main roads and dark alleys in Purok 1-4 to improve security and reduce nighttime incidents.",
    location: "Purok 1 – Purok 4", startDate: "2025-10-01", endDate: "2026-01-15",
    contractor: "Bright Solutions Inc.", source: "20% Development Fund",
    category: "Infrastructure",
    milestones: [
      { label: "Pole installation", date: "2025-10-31", done: true },
      { label: "Wiring & connection", date: "2025-11-30", done: true },
      { label: "LED fixture mounting", date: "2025-12-20", done: true },
      { label: "Testing & final inspection", date: "2026-01-15", done: true },
    ]
  },
];

/* BUDGET_SUMMARY is now loaded from services.ts via getBudgetSummary()
 * — DJANGO: GET /api/analytics/budget-summary/
 * Removed hardcoded constant. Component uses `budgetSummary` state below. */

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Completed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ongoing: { bg: "bg-blue-50", text: "text-blue-600", label: "Ongoing", icon: <Clock className="w-3.5 h-3.5" /> },
  upcoming: { bg: "bg-amber-50", text: "text-amber-600", label: "Upcoming", icon: <Calendar className="w-3.5 h-3.5" /> },
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "budget" | "spent" | "progress" | "startDate" | "endDate" | "status">("startDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"projects" | "budget">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [annualBudget, setAnnualBudget] = useState(8500000);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);

  /* Load data from services.ts on mount.
   * DJANGO: GET /api/projects/public/, /api/settings/, /api/analytics/budget-summary/ */
  useEffect(() => {
    getPublicProjects().then(loaded => {
      /* Assign images — DJANGO: images come from DB, this mapping won't be needed */
      const withImages = loaded.map(p => ({
        ...p,
        image: p.image || PROJECT_IMAGES[p.id] || roadImg,
      }));
      setProjects(withImages);
    });
    getSystemSettings().then(s => setAnnualBudget(Number(s?.annual_budget ?? 0)));
    /* Load budget breakdown — DJANGO: GET /api/analytics/budget-summary/ */
    getBudgetSummary().then(setBudgetSummary);
  }, []);

  const filtered = projects.filter(p => {
    const matchFilter = filter === "all" || p.status === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const minBudgetValue = Number(minBudget || 0);
    const maxBudgetValue = Number(maxBudget || 0);
    const matchMinBudget = !minBudget || p.budget >= minBudgetValue;
    const matchMaxBudget = !maxBudget || p.budget <= maxBudgetValue;
    return matchFilter && matchSearch && matchCategory && matchMinBudget && matchMaxBudget;
  });

  const filteredSorted = [...filtered].sort((a, b) => {
    let left: string | number = a[sortBy] as string | number;
    let right: string | number = b[sortBy] as string | number;

    if (sortBy === "startDate" || sortBy === "endDate") {
      left = new Date(String(left)).getTime();
      right = new Date(String(right)).getTime();
    }

    if (typeof left === "string" && typeof right === "string") {
      const result = left.localeCompare(right);
      return sortDirection === "asc" ? result : -result;
    }

    const result = Number(left) - Number(right);
    return sortDirection === "asc" ? result : -result;
  });

  const categories = Array.from(new Set(projects.map((p) => p.category))).sort();
  const overspentProjects = projects.filter((p) => p.spent > p.budget).length;

  const totalBudget = projects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = projects.reduce((a, p) => a + p.spent, 0);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl tracking-tight" style={{ fontFamily: "Montserrat" }}>Finance Transparency Portal</h1>
              <p className="text-white/50 text-xs">Barangay Cubacub, Mandaue City — Open Governance Initiative</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Annual Budget", value: `PHP ${formatCurrency(annualBudget)}`, icon: <DollarSign className="w-4 h-4" /> },
              { label: "Allocated", value: `PHP ${formatCurrency(totalBudget)}`, icon: <PieChartIcon className="w-4 h-4" /> },
              { label: "Total Spent", value: `PHP ${formatCurrency(totalSpent)}`, icon: <TrendingUp className="w-4 h-4" /> },
              { label: "Remaining", value: `PHP ${formatCurrency(totalBudget - totalSpent)}`, icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">{s.icon}{s.label}</div>
                <p className="text-lg text-white" style={{ fontFamily: "Montserrat" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveTab("projects")} className={`px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "projects" ? "bg-[#1B263B] text-white shadow-md" : "bg-white text-gray-500 border border-gray-100"}`}>
            Projects ({projects.length})
          </button>
          <button onClick={() => setActiveTab("budget")} className={`px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "budget" ? "bg-[#1B263B] text-white shadow-md" : "bg-white text-gray-500 border border-gray-100"}`}>
            Budget Overview
          </button>
        </div>

        {activeTab === "projects" && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                {["all", "ongoing", "upcoming", "completed"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs capitalize transition-all ${filter === f ? "bg-[#008080] text-white shadow-md" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"}`}>
                    {f === "all" ? `All (${projects.length})` : `${f} (${projects.filter(p => p.status === f).length})`}
                  </button>
                ))}
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input placeholder="Search projects..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080]/20" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {(overspentProjects > 0 || totalSpent > annualBudget) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-900">
                  {overspentProjects > 0 && <p>{overspentProjects} project(s) currently exceed their approved budget.</p>}
                  {totalSpent > annualBudget && <p>Total spending has exceeded the annual budget cap.</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-5">
              <select className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input type="number" placeholder="Min Budget" className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={minBudget} onChange={e => setMinBudget(e.target.value)} />
              <input type="number" placeholder="Max Budget" className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} />
              <select className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="startDate">Start Date</option>
                <option value="endDate">End Date</option>
                <option value="name">Name</option>
                <option value="budget">Budget</option>
                <option value="spent">Spent</option>
                <option value="progress">Progress</option>
                <option value="status">Status</option>
              </select>
              <button onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50">
                <ArrowUpDown className="w-4 h-4" /> {sortDirection.toUpperCase()}
              </button>
            </div>

            {/* Project Cards */}
            <div className="space-y-4">
              {filteredSorted.map((p, i) => {
                const sc = statusConfig[p.status];
                const isExpanded = expanded === p.id;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-48 h-40 md:h-auto relative shrink-0">
                        <ImageWithFallback src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.icon}{sc.label}</span>
                        </div>
                      </div>
                      <div className="flex-1 p-5">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                          <div>
                            <p className="text-xs text-[#008080]">{p.id} — {p.category}</p>
                            <h3 className="text-[#1B263B] mt-0.5" style={{ fontFamily: "Montserrat" }}>{p.name}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>PHP {formatCurrency(p.budget)}</p>
                            <p className="text-xs text-gray-400">Budget</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.startDate} — {p.endDate}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 1 }}
                              className={`h-full rounded-full ${p.status === "completed" ? "bg-emerald-500" : "bg-gradient-to-r from-[#008080] to-[#00a89d]"}`} />
                          </div>
                          <span className="text-xs text-[#008080] w-10 text-right">{p.progress}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Spent: PHP {formatCurrency(p.spent)}</span>
                          <span>Remaining: PHP {formatCurrency(p.budget - p.spent)}</span>
                        </div>
                        <button onClick={() => setExpanded(isExpanded ? null : p.id)} className="mt-3 text-xs text-[#008080] flex items-center gap-1 hover:underline">
                          {isExpanded ? "Hide Details" : "View Full Details"} {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 pt-3 border-t border-gray-50 grid md:grid-cols-2 gap-5">
                            <div className="space-y-3">
                              <p className="text-xs text-[#008080] uppercase tracking-wider">Project Details</p>
                              {[["Contractor", p.contractor], ["Funding Source", p.source], ["Category", p.category], ["Start Date", p.startDate], ["Target End", p.endDate]].map(([l, v]) => (
                                <div key={l} className="flex justify-between text-xs py-1 border-b border-gray-50">
                                  <span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span>
                                </div>
                              ))}
                              <div className="bg-[#F5F7FA] rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Budget Utilization</p>
                                <div className="flex justify-between text-xs">
                                  <span className="text-[#1B263B]">PHP {formatCurrency(p.spent)} spent</span>
                                  <span className="text-emerald-600">PHP {formatCurrency(p.budget - p.spent)} left</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-[#008080] uppercase tracking-wider mb-3">Milestones</p>
                              <div className="space-y-0">
                                {p.milestones.map((m, j) => (
                                  <div key={j} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${m.done ? "bg-emerald-500 border-emerald-500" : "border-gray-200 bg-white"}`}>
                                        {m.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                      {j < p.milestones.length - 1 && <div className={`w-px flex-1 min-h-[24px] ${m.done ? "bg-emerald-300" : "bg-gray-100"}`} />}
                                    </div>
                                    <div className="pb-4">
                                      <p className={`text-xs ${m.done ? "text-[#1B263B]" : "text-gray-400"}`}>{m.label}</p>
                                      <p className="text-[10px] text-gray-300">{m.date}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "budget" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Budget Allocation Pie */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-[#1B263B] mb-4 text-sm" style={{ fontFamily: "Montserrat" }}>Budget Allocation by Category</h3>
                <div className="flex items-center justify-center" style={{ height: 250 }}>
                  <svg viewBox="0 0 200 200" width="180" height="180">
                    {(() => {
                      const cats = budgetSummary?.categories || [];
                      const total = cats.reduce((a, c) => a + c.value, 0);
                      let cumulative = 0;
                      return cats.map((c) => {
                        const pct = c.value / total;
                        const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                        cumulative += pct;
                        const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                        const largeArc = pct > 0.5 ? 1 : 0;
                        const gap = 0.02;
                        const s = startAngle + gap;
                        const e = endAngle - gap;
                        const r1 = 55, r2 = 85, cx = 100, cy = 100;
                        const d = `M ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} L ${cx + r2 * Math.cos(s)} ${cy + r2 * Math.sin(s)} A ${r2} ${r2} 0 ${largeArc} 1 ${cx + r2 * Math.cos(e)} ${cy + r2 * Math.sin(e)} L ${cx + r1 * Math.cos(e)} ${cy + r1 * Math.sin(e)} A ${r1} ${r1} 0 ${largeArc} 0 ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} Z`;
                        return <path key={c.name} d={d} fill={c.fill} />;
                      });
                    })()}
                  </svg>
                  <div className="ml-4 space-y-2">
                    {(budgetSummary?.categories || []).map(c => {
                      const catTotal = (budgetSummary?.categories || []).reduce((a, x) => a + x.value, 0);
                      return (
                        <div key={c.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-gray-600">{c.name}</span>
                          <span className="text-gray-400 ml-auto">{catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(0) : 0}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Quarterly Spend */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-[#1B263B] mb-4 text-sm" style={{ fontFamily: "Montserrat" }}>Quarterly Budget vs Spending</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={budgetSummary?.quarterly || []} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(Number(v))} />
                    <Tooltip formatter={(v: number) => `PHP ${formatCurrency(v)}`} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="budget" fill="#1B263B" radius={[6, 6, 0, 0]} name="Budget" />
                    <Bar dataKey="spent" fill="#008080" radius={[6, 6, 0, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Budget Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-[#1B263B] mb-4 text-sm" style={{ fontFamily: "Montserrat" }}>Detailed Budget Breakdown — FY 2026</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs text-gray-400 uppercase">Category</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 uppercase">Allocated</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 uppercase">Spent</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 uppercase">Remaining</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 uppercase">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(budgetSummary?.categories || []).filter(c => c.name !== "Unallocated").map(c => {
                      const catProjects = projects.filter(p => (c.name === "Infrastructure" && p.category === "Infrastructure") || (c.name === "Water & Sanitation" && p.category === "Water & Sanitation") || (c.name === "Community Facilities" && p.category === "Community Facilities") || (c.name === "Health" && p.category === "Health"));
                      const spent = catProjects.reduce((a, p) => a + p.spent, 0);
                      const util = c.value > 0 ? Math.round((spent / c.value) * 100) : 0;
                      return (
                        <tr key={c.name} className="border-b border-gray-50 hover:bg-[#FAFBFC]">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </td>
                          <td className="py-3 px-4 text-right text-[#1B263B]">PHP {formatCurrency(c.value)}</td>
                          <td className="py-3 px-4 text-right text-gray-500">PHP {formatCurrency(spent)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">PHP {formatCurrency(c.value - spent)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-[#008080]" style={{ width: `${util}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-8">{util}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#F5F7FA]">
                      <td className="py-3 px-4 text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>Total</td>
                      <td className="py-3 px-4 text-right text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>PHP {formatCurrency(totalBudget)}</td>
                      <td className="py-3 px-4 text-right text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>PHP {formatCurrency(totalSpent)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600" style={{ fontFamily: "Montserrat" }}>PHP {formatCurrency(totalBudget - totalSpent)}</td>
                      <td className="py-3 px-4 text-right text-xs text-gray-400">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transparency Notice */}
            <div className="bg-gradient-to-r from-[#008080]/10 to-[#008080]/5 rounded-2xl p-5 text-center">
              <DollarSign className="w-8 h-8 text-[#008080] mx-auto mb-2" />
              <h3 className="text-[#1B263B] mb-1" style={{ fontFamily: "Montserrat" }}>Full Transparency Commitment</h3>
              <p className="text-xs text-gray-500 max-w-lg mx-auto">All budget data is updated regularly by the Barangay Treasurer. For questions or requests for detailed financial documents, please visit the Barangay Hall during office hours (Mon–Fri, 8AM–5PM) or email cubacub@mandauecity.gov.ph.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
