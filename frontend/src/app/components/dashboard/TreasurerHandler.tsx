import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Edit2, DollarSign, TrendingUp, X, CheckCircle2, AlertCircle, PieChart as PieChartIcon, Save, Trash2, Image as ImageIcon, ArrowUpDown } from "lucide-react";
import { useToast } from "../Toast";
import {
  getProjects, createProject, updateProject, deleteProject as apiDeleteProject,
  getSystemSettings, updateSystemSettings, getMonthlySpending, createAuditLogEntry, getCurrentUser,
  type Project, type MonthlySpending, type ProjectMilestone
} from "../../api/services";

const COLORS = ["#1B263B", "#008080", "#00a89d", "#FF6B6B", "#FFD93D"];

const computeProgress = (milestones: ProjectMilestone[]) => {
  if (!milestones.length) return 0;
  const completed = milestones.filter(m => m.done).length;
  return Math.round((completed / milestones.length) * 100);
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCurrencyInput = (value: number) =>
  value.toLocaleString("en-PH", { maximumFractionDigits: 0 });

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/,/g, "").trim();
  return Number(normalized || 0);
};

export default function TreasurerHandler() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [contractorFilter, setContractorFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "budget" | "spent" | "progress" | "startDate" | "status" | "updatedAt">("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Project>>({});
  const { showToast } = useToast();
  const [annualBudget, setAnnualBudget] = useState(8500000);
  const [budgetDraft, setBudgetDraft] = useState("8500000");
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpending[]>([]);

  /* Load data from services.ts on mount */
  useEffect(() => {
    getProjects().then(setProjects);
    getSystemSettings().then(s => {
      const parsedAnnualBudget = Number(s?.annual_budget ?? 0);
      setAnnualBudget(parsedAnnualBudget);
      setBudgetDraft(formatCurrencyInput(parsedAnnualBudget));
    });
    /* Load monthly spending chart data — DJANGO: GET /api/analytics/monthly-spending/ */
    getMonthlySpending().then(setMonthlySpend);
  }, []);

  /* Budget computed values — these auto-update when projects change */
  const totalAllocated = projects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = projects.reduce((a, p) => a + p.spent, 0);
  const budgetLeft = annualBudget - totalAllocated;
  const overspentProjects = projects.filter(p => p.spent > p.budget).length;
  const budgetUsage = annualBudget > 0 ? (totalAllocated / annualBudget) * 100 : 0;

  const filtered = projects.filter(p => {
    const matchFilter = filter === "all" || p.status === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      || p.location.toLowerCase().includes(search.toLowerCase())
      || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchContractor = !contractorFilter || p.contractor.toLowerCase().includes(contractorFilter.toLowerCase());
    return matchFilter && matchSearch && matchCategory && matchContractor;
  });

  const filteredSorted = [...filtered].sort((a, b) => {
    let left: string | number = a[sortBy] as string | number;
    let right: string | number = b[sortBy] as string | number;

    if (sortBy === "startDate" || sortBy === "updatedAt") {
      left = new Date(String(left || 0)).getTime();
      right = new Date(String(right || 0)).getTime();
    }

    if (typeof left === "string" && typeof right === "string") {
      const result = left.localeCompare(right);
      return sortDirection === "asc" ? result : -result;
    }

    const result = Number(left) - Number(right);
    return sortDirection === "asc" ? result : -result;
  });

  const startEdit = (p: Project) => {
    setForm({ ...p, milestones: p.milestones || [] });
    setEditProject(p);
    setShowForm(true);
  };
  const startNew = () => {
    setForm({
      name: "",
      status: "upcoming",
      budget: 0,
      spent: 0,
      progress: 0,
      description: "",
      location: "",
      startDate: "",
      endDate: "",
      contractor: "",
      source: "",
      category: "Infrastructure",
      milestones: [{ label: "", date: "", done: false }],
    });
    setEditProject(null);
    setShowForm(true);
  };

  const formMilestones: ProjectMilestone[] = Array.isArray(form.milestones) ? form.milestones : [];
  const computedProgress = computeProgress(formMilestones.filter(m => (m.label || "").trim().length > 0));

  const saveProject = () => {
    if (!form.name) {
      showToast("Project name is required.", "error");
      return;
    }

    const budget = Number(form.budget || 0);
    const spent = Number(form.spent || 0);
    const cleanedMilestones = formMilestones
      .map(m => ({ label: (m.label || "").trim(), date: m.date || "", done: Boolean(m.done) }))
      .filter(m => m.label.length > 0);

    if (budget < 0 || spent < 0) {
      showToast("Budget and spent must be non-negative.", "error");
      return;
    }

    if (spent > budget) {
      showToast("Spent amount cannot exceed budget.", "error");
      return;
    }

    if (!cleanedMilestones.length) {
      showToast("Please add at least one milestone.", "error");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      showToast("End date cannot be earlier than start date.", "error");
      return;
    }

    const payload: Partial<Project> = {
      ...form,
      budget,
      spent,
      milestones: cleanedMilestones,
      progress: computeProgress(cleanedMilestones),
    };

    const user = getCurrentUser();
    if (editProject) {
      updateProject(editProject.id, payload)
        .then(() => {
          getProjects().then(setProjects);
          window.dispatchEvent(new Event("treasurerDashboardUpdate"));
          createAuditLogEntry({
            time: new Date().toLocaleString("en-PH"),
            user: user?.name || "Treasurer",
            action: `Updated project ${editProject.id}: ${form.name}; budget PHP ${formatCurrency(editProject.budget)} -> PHP ${formatCurrency(budget)}, spent PHP ${formatCurrency(editProject.spent)} -> PHP ${formatCurrency(spent)}, status ${editProject.status} -> ${payload.status}`,
            type: "info",
          });
          showToast("Project updated!");
        })
        .catch(() => {
          showToast("Failed to update project. Please review input values.", "error");
        });
    } else {
      createProject(payload as Omit<Project, "id">)
        .then(newP => {
          setProjects(prev => [...prev, newP]);
          getProjects().then(setProjects);
          window.dispatchEvent(new Event("treasurerDashboardUpdate"));
          createAuditLogEntry({
            time: new Date().toLocaleString("en-PH"),
            user: user?.name || "Treasurer",
            action: `Created project ${newP.id}: ${newP.name}; budget PHP ${formatCurrency(newP.budget)}, spent PHP ${formatCurrency(newP.spent)}, status ${newP.status}`,
            type: "success",
          });
          showToast("Project created!");
        })
        .catch(() => {
          showToast("Failed to create project. Please review input values.", "error");
        });
    }
    setShowForm(false); setEditProject(null);
  };

  const saveAnnualBudget = () => {
    const value = parseCurrencyInput(budgetDraft);
    if (value <= 0) {
      showToast("Annual budget must be greater than zero.", "error");
      return;
    }
    updateSystemSettings({ annual_budget: value })
      .then(() => {
        setAnnualBudget(value);
        setBudgetDraft(formatCurrencyInput(value));
        window.dispatchEvent(new Event("treasurerDashboardUpdate"));
        createAuditLogEntry({
          time: new Date().toLocaleString("en-PH"),
          user: getCurrentUser()?.name || "Treasurer",
          action: `Updated annual budget from PHP ${formatCurrency(annualBudget)} to PHP ${formatCurrency(value)}`,
          type: "info",
        });
        showToast("Annual budget updated.");
      })
      .catch(() => showToast("Failed to update annual budget.", "error"));
  };

  const deleteProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    const user = getCurrentUser();
    apiDeleteProject(id).then(() => {
      setProjects(prev => prev.filter(p => p.id !== id));
      window.dispatchEvent(new Event("treasurerDashboardUpdate"));
      if (target) createAuditLogEntry({ time: new Date().toLocaleString("en-PH"), user: user?.name || "Treasurer", action: `Deleted project ${id}: ${target.name}`, type: "error" });
    });
    showToast("Project deleted!", "error");
  };

  // Charts data — computed from live project data
  const catData = ["Infrastructure", "Water & Sanitation", "Community", "Health"].map((cat, i) => ({
    name: cat, value: projects.filter(p => p.category === cat).reduce((a, p) => a + p.budget, 0), color: COLORS[i], fill: COLORS[i],
  })).filter(c => c.value > 0);

  /* monthlySpend is now loaded from services.ts via getMonthlySpending()
   * — displayed for the first 6 months (Jan–Jun) only */
  const displayMonthlySpend = monthlySpend.slice(0, 6);

  const statusColors: Record<string, string> = { completed: "bg-emerald-500", ongoing: "bg-blue-500", upcoming: "bg-amber-500" };
  const categories = Array.from(new Set(projects.map(p => p.category))).sort();

  return (
    <div className="space-y-6">
      {/* Budget Overview Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase">Annual Budget Setting</p>
          <p className="text-sm text-gray-400">Treasurer can adjust this value and cards update immediately.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            className="bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none w-48"
            value={budgetDraft}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              const numeric = Number(raw || 0);
              setBudgetDraft(raw ? formatCurrencyInput(numeric) : "");
            }}
          />
          <button onClick={saveAnnualBudget} className="px-4 py-2.5 rounded-xl bg-[#1B263B] text-white text-sm">Save Budget</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Annual Budget", value: `PHP ${formatCurrency(annualBudget)}`, color: "from-[#1B263B] to-[#2d4a6e]", icon: <DollarSign className="w-5 h-5" /> },
          { label: "Allocated", value: `PHP ${formatCurrency(totalAllocated)}`, color: "from-[#008080] to-[#00a89d]", icon: <PieChartIcon className="w-5 h-5" /> },
          { label: "Total Spent", value: `PHP ${formatCurrency(totalSpent)}`, color: "from-amber-500 to-orange-500", icon: <TrendingUp className="w-5 h-5" /> },
          { label: "Remaining", value: `PHP ${formatCurrency(budgetLeft)}`, color: budgetLeft >= 0 ? "from-emerald-500 to-green-600" : "from-rose-500 to-red-600", icon: <CheckCircle2 className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-md`}>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-2">{s.icon}</div>
            <p className="text-lg" style={{ fontFamily: "Montserrat" }}>{s.value}</p>
            <p className="text-xs text-white/60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[#1B263B] mb-3 text-sm">Budget by Category</h3>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <svg viewBox="0 0 200 200" width="160" height="160">
              {(() => {
                const total = catData.reduce((a, c) => a + c.value, 0);
                let cumulative = 0;
                return catData.map((c) => {
                  const pct = c.value / total;
                  const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                  cumulative += pct;
                  const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                  const largeArc = pct > 0.5 ? 1 : 0;
                  const gap = 0.02;
                  const s = startAngle + gap;
                  const e = endAngle - gap;
                  const r1 = 70, r2 = 95, cx = 100, cy = 100;
                  const d = `M ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} L ${cx + r2 * Math.cos(s)} ${cy + r2 * Math.sin(s)} A ${r2} ${r2} 0 ${largeArc} 1 ${cx + r2 * Math.cos(e)} ${cy + r2 * Math.sin(e)} L ${cx + r1 * Math.cos(e)} ${cy + r1 * Math.sin(e)} A ${r1} ${r1} 0 ${largeArc} 0 ${cx + r1 * Math.cos(s)} ${cy + r1 * Math.sin(s)} Z`;
                  return <path key={c.name} d={d} fill={c.color} />;
                });
              })()}
            </svg>
            <div className="ml-4 space-y-1.5">
              {catData.map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-gray-500">{c.name}</span>
                  <span className="text-gray-400 ml-auto">PHP {formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[#1B263B] mb-3 text-sm">Monthly Spending (2026)</h3>
          <div style={{ height: 200 }} className="relative">
            <svg width="100%" height="100%" viewBox="0 0 300 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="treasurerSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008080" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                </linearGradient>
              </defs>
              {(() => {
                const maxVal = Math.max(...displayMonthlySpend.map(d => d.spent), 1);
                const w = 300, h = 140, pad = 10;
                const divisor = Math.max(displayMonthlySpend.length - 1, 1);
                const points = displayMonthlySpend.map((d, i) => ({
                  x: pad + (i / divisor) * (w - 2 * pad),
                  y: h - pad - ((d.spent / maxVal) * (h - 2 * pad)),
                }));
                if (points.length === 0) return null;
                const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                const area = `${line} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;
                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(f => (
                      <line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - 2 * pad)} y2={h - pad - f * (h - 2 * pad)} stroke="#f0f0f0" strokeDasharray="3 3" />
                    ))}
                    <path d={area} fill="url(#treasurerSpendGrad)" />
                    <path d={line} fill="none" stroke="#008080" strokeWidth={2} />
                    {points.map((p, i) => (
                      <circle key={displayMonthlySpend[i].month} cx={p.x} cy={p.y} r={3} fill="#008080" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-3 text-[10px] text-gray-400">
              {displayMonthlySpend.map(d => <span key={d.month}>{d.month}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Project Management */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          {["all", "ongoing", "upcoming", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs capitalize transition-all ${filter === f ? "bg-emerald-600 text-white shadow-md" : "bg-white text-gray-500 border border-gray-100"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input placeholder="Search..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm outline-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={startNew} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"><Plus className="w-4 h-4" /> New Project</button>
        </div>
      </div>

      {(overspentProjects > 0 || budgetUsage >= 90) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-900">
            {overspentProjects > 0 && <p>{overspentProjects} project(s) are overspent and need immediate budget review.</p>}
            {budgetUsage >= 90 && <p>Annual allocation usage is at {budgetUsage.toFixed(1)}%. Consider capping new project budgets.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <input placeholder="Contractor..." className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} />
        <div className="flex items-center gap-2">
          <select className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="updatedAt">Updated</option>
            <option value="name">Name</option>
            <option value="budget">Budget</option>
            <option value="spent">Spent</option>
            <option value="progress">Progress</option>
            <option value="startDate">Start Date</option>
            <option value="status">Status</option>
          </select>
          <button onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")} className="px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-gray-600">
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Project</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Budget</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Spent</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Remaining</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Progress</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map(p => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-[#1B263B]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category} — {p.location}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[#1B263B]">PHP {formatCurrency(p.budget)}</td>
                  <td className="px-5 py-3.5 text-gray-500">PHP {formatCurrency(p.spent)}</td>
                  <td className="px-5 py-3.5 text-emerald-600">PHP {formatCurrency(p.budget - p.spent)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5"><div className={`h-full rounded-full ${p.status === "completed" ? "bg-emerald-500" : "bg-[#008080]"}`} style={{ width: `${p.progress}%` }} /></div>
                      <span className="text-xs text-gray-400">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full capitalize ${p.status === "completed" ? "bg-emerald-50 text-emerald-600" : p.status === "ongoing" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors[p.status]}`} />{p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteProject(p.id)} className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Project Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>{editProject ? "Edit" : "New"} Project</h3>
                  <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-3 overflow-y-auto flex-1">
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Project Name*</label><input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Category</label><select className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })}><option>Infrastructure</option><option>Water & Sanitation</option><option>Community</option><option>Health</option><option>Education</option></select></div>
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Status</label><select className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.status || "upcoming"} onChange={e => setForm({ ...form, status: e.target.value as Project["status"] })}><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></div>
                </div>
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Description</label><textarea rows={2} className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none resize-none" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Budget (PHP)</label><input type="number" className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.budget || ""} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Spent (PHP)</label><input type="number" className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.spent || ""} onChange={e => setForm({ ...form, spent: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Progress (%)</label>
                    <input type="number" className="w-full bg-[#E8F5F3] rounded-xl px-4 py-2.5 text-sm outline-none" value={computedProgress} readOnly />
                    <p className="text-[10px] text-gray-400 mt-1">Auto-computed from completed milestones.</p>
                  </div>
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Location</label><input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">Start Date</label><input type="date" className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.startDate || ""} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 uppercase mb-1 block">End Date</label><input type="date" className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.endDate || ""} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Contractor</label><input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.contractor || ""} onChange={e => setForm({ ...form, contractor: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Funding Source</label><input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" value={form.source || ""} onChange={e => setForm({ ...form, source: e.target.value })} /></div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Milestones*</label>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, milestones: [...(Array.isArray(prev.milestones) ? prev.milestones : []), { label: "", date: "", done: false }] }))}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  {formMilestones.map((milestone, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-5 bg-[#F5F7FA] rounded-xl px-3 py-2 text-sm outline-none"
                        placeholder="Milestone title"
                        value={milestone.label || ""}
                        onChange={(e) => {
                          const next = [...formMilestones];
                          next[index] = { ...next[index], label: e.target.value };
                          setForm({ ...form, milestones: next });
                        }}
                      />
                      <input
                        type="date"
                        className="col-span-3 bg-[#F5F7FA] rounded-xl px-3 py-2 text-sm outline-none"
                        value={milestone.date || ""}
                        onChange={(e) => {
                          const next = [...formMilestones];
                          next[index] = { ...next[index], date: e.target.value };
                          setForm({ ...form, milestones: next });
                        }}
                      />
                      <label className="col-span-2 flex items-center gap-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={Boolean(milestone.done)}
                          onChange={(e) => {
                            const next = [...formMilestones];
                            next[index] = { ...next[index], done: e.target.checked };
                            setForm({ ...form, milestones: next });
                          }}
                        />
                        Done
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = formMilestones.filter((_, idx) => idx !== index);
                          setForm({ ...form, milestones: next });
                        }}
                        className="col-span-2 text-xs px-2 py-2 rounded-xl bg-rose-50 text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!formMilestones.length && <p className="text-xs text-rose-500">At least one milestone is required.</p>}
                </div>
                
                {/* Project Images */}
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1.5 block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Project Images (Current / Expected Look)
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {(form.images || []).map((img, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 h-24">
                        <img src={img} alt={`Project ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setForm({ ...form, images: (form.images || []).filter((_, j) => j !== i) })}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {(form.images || []).length < 6 && (
                      <label className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                        <span className="text-[9px] text-gray-400">Add Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = () => setForm(prev => ({ ...prev, images: [...(prev.images || []), reader.result as string] }));
                            reader.readAsDataURL(f);
                          }
                        }} />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">Upload up to 6 images showing current progress or expected project outcome</p>
                </div>

                <button onClick={saveProject} disabled={!form.name} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl disabled:opacity-40 hover:shadow-lg transition-all flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editProject ? "Update" : "Create"} Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
