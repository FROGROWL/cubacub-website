import { Fragment, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Check, X, FileText, AlertTriangle, ChevronLeft, ChevronRight, Calendar as CalIcon, Eye, Plus, Clock, User, MapPin, CreditCard, Camera, Wallet, Shield, Filter, History, Edit2, Trash2 } from "lucide-react";
import { useToast } from "../Toast";
import {
  getDocumentRequests, updateDocumentStatus, deleteDocumentRequest, getDocCases,
  getCalendarEvents, createCalendarEvent, deleteCalendarEvent,
  createAuditLogEntry, getCurrentUser,
  type DocRequest, type DocCaseRecord, type CalendarEvent
} from "../../api/services";

export default function DocumentHandler() {
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"id" | "requestor" | "document" | "date" | "record" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortMode, setSortMode] = useState<"normal" | "grouped">("normal");
  const { showToast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth());
  const year = 2026;
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: "", title: "", color: "bg-[#1B263B]" });
  const [reviewReq, setReviewReq] = useState<DocRequest | null>(null);
  const [cases, setCases] = useState<DocCaseRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [historySortDirection, setHistorySortDirection] = useState<"asc" | "desc">("desc");
  const [showHistory, setShowHistory] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const normalizeFileUrl = (value: string, fallbackMime: string) => {
    if (!value) return "";
    if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("/")) {
      return value;
    }
    return `data:${fallbackMime};base64,${value}`;
  };

  const isImageUrl = (value: string) =>
    value.startsWith("data:image") || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(value);

  const isPdfUrl = (value: string) =>
    value.startsWith("data:application/pdf") || /\.pdf(\?|$)/i.test(value);

  /* Load data from services.ts on mount */
  useEffect(() => {
    getDocumentRequests().then(setRequests);
    getDocCases().then(setCases);
  }, []);

  /* Calendar events sync */
  useEffect(() => {
    const loadEvents = () => getCalendarEvents().then(setEvents);
    loadEvents();
    const handler = () => { loadEvents(); };
    window.addEventListener("calendarUpdate", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("calendarUpdate", handler); window.removeEventListener("storage", handler); };
  }, []);

  /* SEARCH & FILTER LOGIC
   * Filters the requests array based on search text and status filter.
   * This runs client-side. DJANGO: You can keep this as-is (filter after fetch)
   * OR add query params to the API: GET /api/documents/?status=pending&search=pedro
   * ══════════════════════════════════════════════════════════════════════ */
  
  const activeStatuses = ["pending", "approved", "processing", "ready_to_pickup"];
  const historyOnlyStatuses = ["rejected", "claimed", "unclaimed"];
  const activeRequests = requests.filter(r => activeStatuses.includes(r.status));

  const filtered = activeRequests.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase());

    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const statusOrder = ["pending", "approved", "processing", "ready_to_pickup"];
  const activeRequestStatuses = ["all", ...activeStatuses];
  const historyStatuses = ["all", "claimed", "unclaimed", "rejected"];

  const getRequestSortValue = (request: DocRequest, key: typeof sortKey) => {
    switch (key) {
      case "id":
        return request.id;
      case "requestor":
        return request.name;
      case "document":
        return request.type;
      case "date":
        return request.date || "";
      case "record":
        return request.history || "";
      case "status":
        return request.status || "";
      default:
        return request.date || "";
    }
  };

  const compareText = (left: string, right: string) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });

  const sortRequests = (items: DocRequest[]) => {
    return [...items].sort((left, right) => {
      if (sortKey === "status") {
        const leftRank = statusOrder.indexOf(left.status);
        const rightRank = statusOrder.indexOf(right.status);
        const rankDiff = leftRank - rightRank;
        if (rankDiff !== 0) {
          return sortDirection === "asc" ? rankDiff : -rankDiff;
        }
      }

      const leftValue = getRequestSortValue(left, sortKey);
      const rightValue = getRequestSortValue(right, sortKey);
      const result = compareText(String(leftValue ?? ""), String(rightValue ?? ""));
      return sortDirection === "asc" ? result : -result;
    });
  };

  const sortedRequests = sortMode === "grouped"
    ? statusOrder.flatMap(status => sortRequests(filtered.filter(request => request.status === status)))
    : sortRequests(filtered);

  const historyItems = requests.filter(r => historyOnlyStatuses.includes(r.status));
  const filteredHistory = historyItems.filter(r =>
    (historyFilter === "all" || r.status === historyFilter) &&
    (
      r.name.toLowerCase().includes(historySearch.toLowerCase())
      || r.id.toLowerCase().includes(historySearch.toLowerCase())
      || r.type.toLowerCase().includes(historySearch.toLowerCase())
    )
  );
  const sortedHistory = [...filteredHistory].sort((left, right) => {
    const leftValue = left.statusUpdatedAt || left.date || "";
    const rightValue = right.statusUpdatedAt || right.date || "";
    const result = compareText(String(leftValue), String(rightValue));
    return historySortDirection === "asc" ? result : -result;
  });

  const logAudit = (action: string, type: "success" | "info" | "warning" | "error" = "info") => {
    const user = getCurrentUser();
    createAuditLogEntry({
      time: new Date().toLocaleString("en-PH"),
      user: user?.name || "Document Handler",
      action,
      type,
    }).catch(() => {});
  };

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    let reason = rejectionReason;
    const target = requests.find(r => r.id === id);
    if (status === "rejected" && !reason) {
      reason = window.prompt("Reason for rejection:")?.trim() || "";
      if (!reason) {
        showToast("Rejection reason is required.");
        return false;
      }
    }

    try {
      await updateDocumentStatus(id, status, reason);
      getDocumentRequests().then(setRequests); // reload from backend
      const statusLabel = statusConfig[status]?.label || status.replace("_", " ");
      logAudit(
        `Updated document request ${id}${target ? ` (${target.type}) for ${target.name}` : ""} from ${target?.status?.replace("_", " ") || "unknown"} to ${statusLabel}${status === "rejected" && reason ? `; reason: ${reason}` : ""}`,
        status === "rejected" ? "warning" : status === "approved" || status === "claimed" ? "success" : "info",
      );
      showToast(`${id} status updated to ${status.replace("_", " ")}!`);
      setEditingStatus(null);
      return true;
    } catch (error) {
      showToast("Failed to update status. Please try again.");
      return false;
    }
  };
  const approve = (id: string) => updateStatus(id, "approved");
  const reject = (id: string) => updateStatus(id, "rejected");
  const canDeleteRequest = (status: string) => ["rejected", "ready_to_pickup", "claimed", "unclaimed"].includes(status);
  const deleteRequest = (id: string) => {
    if (!window.confirm(`Delete request ${id}? This cannot be undone.`)) return;
    const target = requests.find(r => r.id === id);
    deleteDocumentRequest(id).then(() => {
      getDocumentRequests().then(setRequests);
      logAudit(`Deleted document request ${id}${target ? ` (${target.type}) for ${target.name}; last status: ${target.status.replace("_", " ")}` : ""}`, "error");
      showToast(`${id} deleted.`);
      if (reviewReq?.id === id) {
        setReviewReq(null);
      }
    }).catch(() => {
      showToast(`Failed to delete ${id}. Please refresh and try again.`);
    });
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const addEvent = () => {
    if (newEvent.date && newEvent.title) {
      createCalendarEvent({ date: newEvent.date, title: newEvent.title, color: newEvent.color, source: "document_handler" }).then(() => {
        getCalendarEvents().then(setEvents);
        logAudit(`Added document calendar event "${newEvent.title}" on ${newEvent.date}`, "info");
      });
      setNewEvent({ date: "", title: "", color: "bg-[#1B263B]" });
      setShowAddEvent(false);
      showToast("Event added to calendar!");
    }
  };

  const handleRemoveEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    deleteCalendarEvent(id).then(() => {
      getCalendarEvents().then(setEvents);
      logAudit(`Removed document calendar event${target ? ` "${target.title}" on ${target.date}` : ` ${id}`}`, "warning");
    });
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400", label: "Pending" },
    approved: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400", label: "Approved" },
    processing: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-400", label: "Processing" },
    ready_to_pickup: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400", label: "Ready to Pick Up" },
    claimed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Claimed" },
    unclaimed: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Unclaimed" },
    rejected: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-400", label: "Rejected" },
  };
  const isFlagged = (name: string) => cases.some(c => c.name === name && c.status === "flagged");

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get events for current month
  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  return (
    <div className="space-y-6">
      {/* Document History Section */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-start sm:items-center gap-3 flex-col sm:flex-row">
                  <h3 className="text-[#1B263B] flex items-center gap-2"><Shield className="w-5 h-5 text-amber-600" /> Document History</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input placeholder="Search history..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                    <select value={historySortDirection} onChange={e => setHistorySortDirection(e.target.value as typeof historySortDirection)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none">
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {historyStatuses.map(f => (
                    <button key={f} onClick={() => setHistoryFilter(f)} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all capitalize ${historyFilter === f ? "bg-amber-600 text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
                      {f === "all" ? `All History (${historyItems.length})` : `${statusConfig[f]?.label || f} (${historyItems.filter(r => r.status === f).length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`space-y-2 ${sortedHistory.length > 6 ? "max-h-[24rem] overflow-y-auto pr-2" : ""}`}>
                {sortedHistory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#FAFBFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs bg-gradient-to-br from-[#1B263B] to-[#2d4a6e]">
                        {item.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm text-[#1B263B]">{item.name} <span className="text-xs text-gray-400">({item.id})</span></p>
                        <p className="text-xs text-gray-400">{item.type} — {item.date}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Status updated: {formatTimestamp(item.statusUpdatedAt)}</p>
                        {item.status === "rejected" && item.rejectionReason && (
                          <p className="text-xs text-gray-500 mt-0.5">Reason: {item.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusConfig[item.status]?.bg} ${statusConfig[item.status]?.text}`}>
                        {statusConfig[item.status]?.label || item.status.replace("_", " ")}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteRequest(item.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete history entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-[#1B263B] flex items-center gap-2"><FileText className="w-5 h-5 text-[#008080]" /> Document Request Management</h3>
            <p className="text-xs text-gray-400 mt-1">Manage active document requests here. Claimed, unclaimed, and rejected entries are shown only in Document History.</p>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 ${showHistory ? "bg-amber-600 text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
            <History className="w-3.5 h-3.5" /> Document History
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeRequestStatuses.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-xs transition-all capitalize ${filter === f ? "bg-[#1B263B] text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
                {f === "all" ? `All (${activeRequests.length})` : `${statusConfig[f]?.label || f} (${activeRequests.filter(r => r.status === f).length})`}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input placeholder="Search requests..." className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080]/20 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gray-50/80 border border-gray-100 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-400">Sort requests</span>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as typeof sortKey)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none">
              <option value="id">ID</option>
              <option value="requestor">Requestor</option>
              <option value="document">Document</option>
              <option value="date">Date</option>
              <option value="record">Record</option>
              <option value="status">Status</option>
            </select>
            <button onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </button>
            <button onClick={() => setSortMode(prev => prev === "normal" ? "grouped" : "normal")} className={`rounded-xl px-3 py-2 text-xs border ${sortMode === "grouped" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600"}`}>
              {sortMode === "grouped" ? "Grouped" : "Ungrouped"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400">Grouped mode organizes requests by status while keeping the selected sort inside each group.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
          Document requests are automatically deleted 4 months after the request date. Claimed, unclaimed, and rejected entries remain in Document History until the 4-month deletion rule removes them.
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">ID</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Requestor</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Document</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Date</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Record</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-400 tracking-wide uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortMode === "grouped"
                  ? statusOrder.map(groupStatus => {
                      const groupItems = sortedRequests.filter(request => request.status === groupStatus);
                      if (groupItems.length === 0) return null;
                      return (
                        <Fragment key={groupStatus}>
                          <tr key={`group-${groupStatus}`} className="bg-gray-50/80">
                            <td colSpan={7} className="px-5 py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                              {statusConfig[groupStatus]?.label || groupStatus} ({groupItems.length})
                            </td>
                          </tr>
                          {groupItems.map((r, i) => {
                            const sc = statusConfig[r.status] || statusConfig.pending;
                            const flagged = isFlagged(r.name);
                            return (
                              <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                className={`border-b border-gray-50 last:border-0 hover:bg-[#FAFBFC] transition-colors cursor-pointer ${flagged ? "bg-rose-50/30" : ""}`}
                                onClick={() => setReviewReq(r)}>
                                <td className="px-5 py-4 text-[#008080]">{r.id}</td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B263B] to-[#2d4a6e] flex items-center justify-center text-white text-xs">{r.name[0]}</div>
                                    <div>
                                      <span className="text-sm">{r.name}</span>
                                      {flagged && <span className="ml-1 text-xs bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded-full">Flagged</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-gray-500">{r.type}</td>
                                <td className="px-5 py-4 text-gray-400">{r.date}</td>
                                <td className="px-5 py-4">
                                  {r.history === "clear"
                                    ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Clear</span>
                                    : <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Flagged</span>}
                                </td>
                                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                  <div className="relative">
                                    <button onClick={() => setEditingStatus(editingStatus === r.id ? null : r.id)}
                                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} hover:shadow-sm transition-all`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                      {sc.label}
                                      <Edit2 className="w-3 h-3 ml-1 opacity-50" />
                                    </button>
                                    <AnimatePresence>
                                      {editingStatus === r.id && (
                                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                          className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]">
                                          {Object.entries(statusConfig).filter(([k]) => k !== r.status).map(([key, cfg]) => (
                                            <button key={key} onClick={() => updateStatus(r.id, key)}
                                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                              {cfg.label}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                  <div className="flex gap-1.5">
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setReviewReq(r)} className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Review"><Eye className="w-4 h-4" /></motion.button>
                                    {r.status === "pending" && (<>
                                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => approve(r.id)} className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="w-4 h-4" /></motion.button>
                                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => reject(r.id)} className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-4 h-4" /></motion.button>
                                    </>)}
                                    {canDeleteRequest(r.status) && (
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => deleteRequest(r.id)}
                                        className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </motion.button>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  : sortedRequests.map((r, i) => {
                  const sc = statusConfig[r.status] || statusConfig.pending;
                  const flagged = isFlagged(r.name);
                  return (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className={`border-b border-gray-50 last:border-0 hover:bg-[#FAFBFC] transition-colors cursor-pointer ${flagged ? "bg-rose-50/30" : ""}`}
                      onClick={() => setReviewReq(r)}>
                      <td className="px-5 py-4 text-[#008080]">{r.id}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B263B] to-[#2d4a6e] flex items-center justify-center text-white text-xs">{r.name[0]}</div>
                          <div>
                            <span className="text-sm">{r.name}</span>
                            {flagged && <span className="ml-1 text-xs bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded-full">Flagged</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{r.type}</td>
                      <td className="px-5 py-4 text-gray-400">{r.date}</td>
                      <td className="px-5 py-4">
                        {r.history === "clear"
                          ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Clear</span>
                          : <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Flagged</span>}
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button onClick={() => setEditingStatus(editingStatus === r.id ? null : r.id)}
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} hover:shadow-sm transition-all`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                            <Edit2 className="w-3 h-3 ml-1 opacity-50" />
                          </button>
                          <AnimatePresence>
                            {editingStatus === r.id && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]">
                                {Object.entries(statusConfig).filter(([k]) => k !== r.status).map(([key, cfg]) => (
                                  <button key={key} onClick={() => updateStatus(r.id, key)}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setReviewReq(r)} className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Review"><Eye className="w-4 h-4" /></motion.button>
                          {r.status === "pending" && (<>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => approve(r.id)} className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => reject(r.id)} className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors"><X className="w-4 h-4" /></motion.button>
                          </>)}
                          {canDeleteRequest(r.status) && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteRequest(r.id)}
                              className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-300 text-sm">No requests found matching your criteria.</div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setMonth(m => Math.max(0, m - 1))} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
          <h3 className="text-[#1B263B] flex items-center gap-2"><CalIcon className="w-5 h-5 text-[#008080]" /> {monthNames[month]} {year}</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowAddEvent(true)} className="px-3 py-1.5 rounded-xl bg-[#008080] text-white text-xs flex items-center gap-1 hover:shadow-md transition-all"><Plus className="w-3.5 h-3.5" /> Add Event</button>
            <button onClick={() => setMonth(m => Math.min(11, m + 1))} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="text-gray-300 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const ev = monthEvents.find(e => e.date === dateStr);
            return (
              <div key={day} className={`text-center py-1.5 rounded-xl text-xs transition-all ${ev ? `${ev.color} text-white shadow-sm` : "hover:bg-gray-50"}`} title={ev?.title}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {monthEvents.sort((a, b) => a.date.localeCompare(b.date)).map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${e.color} shrink-0`} />
                <span className="text-gray-400">{monthNames[month]} {new Date(e.date).getDate()}</span>
                <span className="text-gray-600">{e.title}</span>
                <span className="text-[10px] text-gray-300">({e.source.replace("_", " ")})</span>
              </div>
              <button onClick={() => handleRemoveEvent(e.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddEvent(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-sm" style={{ fontFamily: "Montserrat" }}>Add Calendar Event</h3>
                  <button onClick={() => setShowAddEvent(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Date of Schedule</label>
                  <div className="relative">
                    <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="date" className="w-full bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080]/20" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Event Title</label>
                  <input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="e.g. Barangay Meeting" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Color</label>
                  <div className="flex gap-2">
                    {[{ c: "bg-[#1B263B]", l: "Navy" }, { c: "bg-[#008080]", l: "Teal" }, { c: "bg-amber-500", l: "Amber" }, { c: "bg-violet-500", l: "Violet" }, { c: "bg-rose-500", l: "Rose" }].map(opt => (
                      <button key={opt.c} onClick={() => setNewEvent({ ...newEvent, color: opt.c })} className={`w-8 h-8 rounded-lg ${opt.c} ${newEvent.color === opt.c ? "ring-2 ring-offset-2 ring-[#008080]" : ""}`} title={opt.l} />
                    ))}
                  </div>
                </div>
                <button onClick={addEvent} disabled={!newEvent.date || !newEvent.title} className="w-full bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:shadow-md transition-all">Add Event</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Request Modal */}
      <AnimatePresence>
        {reviewReq && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewReq(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Review Request</h3>
                    <p className="text-white/50 text-xs mt-0.5">{reviewReq.id} — {reviewReq.date}</p>
                  </div>
                  <button onClick={() => setReviewReq(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {isFlagged(reviewReq.name) && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Warning:</strong> This user has been flagged in the case history. Review carefully before approving.</span>
                  </div>
                )}

                {/* Status editor in review modal */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Current Status:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <button key={key} onClick={() => { updateStatus(reviewReq.id, key).then(ok => { if (ok) setReviewReq({ ...reviewReq, status: key }); }); }}
                        className={`text-xs px-2.5 py-1 rounded-full transition-all ${reviewReq.status === key ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-current` : `${cfg.bg} ${cfg.text} opacity-50 hover:opacity-100`}`}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <p className="text-xs text-[#008080] uppercase tracking-wider">Personal Information</p>
                  {[["Full Name", reviewReq.name], ["Birthdate", reviewReq.birthdate || "—"], ["Sex", reviewReq.sex || "—"], ["Civil Status", reviewReq.civilStatus || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  <p className="text-xs text-[#008080] uppercase tracking-wider mt-3">Contact & Address</p>
                  {[["Address", reviewReq.address || "—"], ["Phone", reviewReq.phone || "—"], ["Email", reviewReq.email || "—"], ["Years Residing", reviewReq.yearsResiding ? `${reviewReq.yearsResiding} yrs` : "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  <p className="text-xs text-[#008080] uppercase tracking-wider mt-3">Document Details</p>
                  {[["Document Type", reviewReq.type], ["Copies", reviewReq.copies || "1"], ["Purpose", reviewReq.purpose || "—"], ["Additional Notes", reviewReq.notes || "—"], ["Valid ID", `${reviewReq.validId || "—"} — ${reviewReq.validIdNo || "—"}`], ["Payment", reviewReq.payment === "gcash" ? "GCash (Digital)" : "Cash (At pickup)"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  {reviewReq.pickupDeadline && (
                    <div className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-400">Pickup Deadline</span>
                      <span className="text-amber-600">{reviewReq.pickupDeadline}</span>
                    </div>
                  )}
                </div>
                {reviewReq.status === "rejected" && reviewReq.rejectionReason && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600">
                    <span style={{ fontWeight: 600 }}>Rejection Reason:</span> {reviewReq.rejectionReason}
                  </div>
                )}
                {/* Requirements & verification images */}
                {reviewReq.requirements && Object.keys(reviewReq.requirements).length > 0 && (
                  <div>
                    <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Requirement Uploads</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(reviewReq.requirements).map(([label, value]) => {
                        const fileUrl = normalizeFileUrl(value, "application/pdf");
                        const isPdf = isPdfUrl(fileUrl);
                        const isImg = isImageUrl(fileUrl);
                        return (
                          <div key={label} className="rounded-xl border border-gray-200 p-2">
                            {isImg ? (
                              <img src={fileUrl} alt={label} className="w-full h-20 object-cover rounded-lg mb-1.5" />
                            ) : isPdf ? (
                              <div className="w-full h-20 bg-rose-100 rounded-lg mb-1.5 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-rose-400" />
                              </div>
                            ) : (
                              <div className="w-full h-20 bg-gray-100 rounded-lg mb-1.5 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-300" />
                              </div>
                            )}
                            <p className="text-xs text-gray-600 truncate" style={{ fontWeight: 600 }}>{label}</p>
                            {isPdf && (
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-rose-500 hover:underline">Open PDF</a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Verification Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Valid ID", img: reviewReq.idPhoto, allowPdf: true },
                      { label: "Selfie", img: reviewReq.selfiePhoto, allowPdf: true },
                      ...(reviewReq.payment === "gcash"
                        ? [{ label: "GCash Proof", img: reviewReq.gcashProof, allowPdf: false }]
                        : []),
                    ].map((img) => {
                      const fileUrl = img.img
                        ? normalizeFileUrl(img.img, img.allowPdf ? "application/pdf" : "image/jpeg")
                        : "";
                      const isPdf = img.allowPdf && fileUrl ? isPdfUrl(fileUrl) : false;
                      const isImg = fileUrl ? isImageUrl(fileUrl) : false;
                      return (
                      <div key={img.label} className="border border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-1 overflow-hidden">
                        {img.img ? (
                          isImg ? (
                            <img src={fileUrl} alt={img.label} className="w-full h-full object-cover" />
                          ) : isPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <FileText className="w-5 h-5 text-rose-400" />
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-rose-500 hover:underline">Open PDF</a>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <FileText className="w-6 h-6 text-gray-300" />
                              <p className="text-xs text-gray-300">Unsupported</p>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            {img.label === "Valid ID" && <CreditCard className="w-6 h-6 text-gray-300" />}
                            {img.label === "Selfie" && <Camera className="w-6 h-6 text-gray-300" />}
                            {img.label === "GCash Proof" && <Wallet className="w-6 h-6 text-gray-300" />}
                            <p className="text-xs text-gray-300">{img.label}</p>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-300 mt-1">Images submitted by the requestor for identity verification</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Record:</span>
                  {reviewReq.history === "clear"
                    ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">Clear History</span>
                    : <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Flagged</span>}
                </div>
              </div>
              {(reviewReq.status === "pending" || canDeleteRequest(reviewReq.status)) && (
                <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-gray-50">
                  {reviewReq.status === "pending" && (
                    <>
                      <button onClick={() => { reject(reviewReq.id); setReviewReq(null); }} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl hover:bg-rose-100 transition-colors text-sm flex items-center justify-center gap-2"><X className="w-4 h-4" /> Reject</button>
                      <button onClick={() => { approve(reviewReq.id); setReviewReq(null); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Approve</button>
                    </>
                  )}
                  {canDeleteRequest(reviewReq.status) && (
                    <button onClick={() => deleteRequest(reviewReq.id)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl hover:bg-rose-100 transition-colors text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
