import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../Toast";
import { History, Package, Search, Shield, ChevronDown, Clock, MapPin, Eye, ArrowRight, X, ImageIcon, User, Check, DollarSign } from "lucide-react";
import {
  getIncidents, updateIncidentStatus,
  getCases, updateCaseStatus as apiUpdateCaseStatus, deleteCase,
  getLostFoundItems, updateLostFoundStatus, deleteLostFoundItem,
  deleteIncident, createAuditLogEntry, getCurrentUser,
  getDocumentRequests, API_BASE_URL,
  type Incident, type CaseRecord, type LostFoundItem, type DocRequest
} from "../../api/services";

export default function ReportHandler() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [anonymousOnly, setAnonymousOnly] = useState(false);
  const [reviewReport, setReviewReport] = useState<Incident | null>(null);
  const [rejectReport, setRejectReport] = useState<Incident | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [gcashDocuments, setGcashDocuments] = useState<DocRequest[]>([]);
  const { showToast } = useToast();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [showCaseManager, setShowCaseManager] = useState(true);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseUrgencyFilter, setCaseUrgencyFilter] = useState("all");
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const [showRefundManager, setShowRefundManager] = useState(false);
  const [refundSearch, setRefundSearch] = useState("");
  const [showGcashTracking, setShowGcashTracking] = useState(false);
  const [gcashSearch, setGcashSearch] = useState("");
  const [gcashStatusFilter, setGcashStatusFilter] = useState("all");
  const [nonAnonymousOnlyCase, setNonAnonymousOnlyCase] = useState(false);
  const [showLostFoundManager, setShowLostFoundManager] = useState(false);
  const [lfItems, setLfItems] = useState<LostFoundItem[]>([]);
  const [lfSearch, setLfSearch] = useState("");
  const [lfStatusFilter, setLfStatusFilter] = useState<"all" | LostFoundItem["status"]>("all");
  const [lfTypeFilter, setLfTypeFilter] = useState<"all" | LostFoundItem["item_type"]>("all");
  const [lfSortDirection, setLfSortDirection] = useState<"desc" | "asc">("desc");
  const [lfAnonymousOnly, setLfAnonymousOnly] = useState(false);
  const [nonAnonymousOnlyLF, setNonAnonymousOnlyLF] = useState(false);
  const [reviewLF, setReviewLF] = useState<LostFoundItem | null>(null);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const isOlderThanOneDay = (timestamp?: string | null) => {
    if (!timestamp) return false;
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) return false;
    return Date.now() - time >= oneDayMs;
  };
  const getEffectiveIncidentStatus = (incident: Incident) => {
    if (incident.status === "new" && isOlderThanOneDay(incident.created_at)) {
      return "investigating";
    }
    return incident.status;
  };

  /* Load data from services.ts on mount */
  useEffect(() => {
    const loadAll = () => {
      getIncidents().then(setIncidents);
      getCases().then(setCases);
      getLostFoundItems().then(setLfItems);
      getDocumentRequests().then(setGcashDocuments);
    };
    loadAll();
    window.addEventListener("reportHandlerUpdate", loadAll as EventListener);
    return () => window.removeEventListener("reportHandlerUpdate", loadAll as EventListener);
  }, []);

  const refreshLostFound = () => getLostFoundItems().then(setLfItems);

  const getPriorityKey = (value?: string) => {
    const v = (value || "").toLowerCase();
    if (v === "critical") return "critical";
    if (v === "high") return "high";
    if (v === "medium") return "medium";
    if (v === "low") return "low";
    return "medium";
  };

  const formatExactTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatShortDate = (value?: string | null) => {
    if (!value) return "Pending";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const normalizeReceiptUrl = (value?: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("http")) return trimmed;
    if (trimmed.startsWith("/")) return `${API_BASE_URL}${trimmed}`;
    if (/^\/9j\//.test(trimmed)) return `data:image/jpeg;base64,${trimmed}`;
    if (/^iVBOR/.test(trimmed)) return `data:image/png;base64,${trimmed}`;
    if (/^R0lGOD/.test(trimmed)) return `data:image/gif;base64,${trimmed}`;
    if (/^UklGR/.test(trimmed)) return `data:image/webp;base64,${trimmed}`;
    return `data:image/jpeg;base64,${trimmed}`;
  };

  const getPriorityFilterKey = (r: Incident) => {
    const key = getPriorityKey(r.urgency || r.priority);
    return key === "critical" ? "high" : key;
  };

  const filtered = incidents.filter(r => {
    const effectiveStatus = getEffectiveIncidentStatus(r);
    const matchSearch = r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.details.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "pending" ? effectiveStatus === "new" : effectiveStatus === statusFilter);
    const priorityFilterKey = getPriorityFilterKey(r);
    const matchPriority = priorityFilter === "all" || priorityFilterKey === priorityFilter;
    const matchAnon = !anonymousOnly || r.is_anonymous;
    return matchSearch && matchStatus && matchPriority && matchAnon;
  });

  const filteredCaseManagement = incidents.filter(r => {
    const isRefund = r.category === "Document Refund" || (r.subcategory || "").toLowerCase().includes("refund");
    if (isRefund) return false;
    const effectiveStatus = getEffectiveIncidentStatus(r);
    const matchSearch = r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.details.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "pending" ? effectiveStatus === "new" : effectiveStatus === statusFilter);
    const priorityFilterKey = getPriorityFilterKey(r);
    const matchPriority = priorityFilter === "all" || priorityFilterKey === priorityFilter;
    const urgencyKey = getPriorityKey(r.urgency || r.priority);
    const matchUrgency = caseUrgencyFilter === "all" || urgencyKey === caseUrgencyFilter;
    const matchAnon = !anonymousOnly || r.is_anonymous;
    const matchNonAnon = !nonAnonymousOnlyCase || !r.is_anonymous;
    return matchSearch && matchStatus && matchPriority && matchUrgency && matchAnon && matchNonAnon;
  });
  const sortedCaseManagement = [...filteredCaseManagement].sort((a, b) => {
    const aTime = new Date(a.created_at || a.incident_date || "").getTime() || 0;
    const bTime = new Date(b.created_at || b.incident_date || "").getTime() || 0;
    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });
  const sortedReports = [...filtered].sort((a, b) => {
    const aTime = new Date(a.created_at || a.incident_date || "").getTime() || 0;
    const bTime = new Date(b.created_at || b.incident_date || "").getTime() || 0;
    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });
  const refundReports = sortedReports.filter(r =>
    r.category === "Document Refund" || (r.subcategory || "").toLowerCase().includes("refund")
  );
  const generalReports = sortedReports.filter(r => !refundReports.includes(r));

  const filteredCases = cases.filter(c => {
    const matchSearch = c.subject_name.toLowerCase().includes(caseSearch.toLowerCase()) || c.crime_description.toLowerCase().includes(caseSearch.toLowerCase()) || c.id.toLowerCase().includes(caseSearch.toLowerCase());
    return matchSearch;
  });

  const logAudit = (action: string, type: "success" | "info" | "warning" | "error" = "info") => {
    const user = getCurrentUser();
    createAuditLogEntry({
      time: new Date().toLocaleString("en-PH"),
      user: user?.name || "Report Handler",
      action,
      type,
    }).catch(() => {});
  };

  const updateStatus = (id: string, status: "new" | "investigating" | "resolved" | "rejected", rejectionReason?: string) => {
    const target = incidents.find(r => r.id === id);
    updateIncidentStatus(id, status, rejectionReason).then(() => {
      setIncidents(prev => prev.map(r => r.id === id ? { ...r, status, rejectionReason: status === "rejected" ? rejectionReason : null } : r));
      logAudit(
        `Updated report ${id}${target ? ` (${target.category}${target.subcategory ? ` - ${target.subcategory}` : ""}) from ${target.reporter_name || "Unknown reporter"}` : ""} from ${target ? getEffectiveIncidentStatus(target) : "unknown"} to ${status}`,
        status === "resolved" ? "success" : status === "rejected" ? "error" : status === "investigating" ? "warning" : "info",
      );
      showToast(`Case ${id} marked as ${status}!`);
      window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
    });
  };

  const openRejectReport = (report: Incident) => {
    setRejectReport(report);
    setRejectReason(report.rejectionReason || "");
  };

  const submitRejectReport = () => {
    if (!rejectReport) return;
    const reason = rejectReason.trim();
    if (!reason) {
      showToast("Rejection reason is required.");
      return;
    }
    updateStatus(rejectReport.id, "rejected", reason);
    setRejectReport(null);
    setRejectReason("");
    setReviewReport(null);
  };

  const updateCaseStatus = (id: string, status: CaseRecord["status"]) => {
    const target = cases.find(c => c.id === id);
    apiUpdateCaseStatus(id, status).then(() => {
      setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      logAudit(
        `Updated case record ${id}${target ? ` for ${target.subject_name}; ${target.crime_description}` : ""} from ${target?.status || "unknown"} to ${status}`,
        status === "resolved" || status === "closed" ? "success" : status === "investigating" ? "warning" : "info",
      );
      showToast(`${id} status updated to ${status}!`);
      window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
    });
  };

  const updateLostFound = (id: string, status: LostFoundItem["status"]) => {
    const target = lfItems.find(item => item.id === id);
    updateLostFoundStatus(id, status).then(() => {
      setLfItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      logAudit(
        `Updated lost & found item ${id}${target ? ` (${target.item_type}: ${target.item_name}) reported by ${target.is_anonymous ? "Anonymous" : target.reporter_name || "Unknown"}` : ""} from ${target?.status || "unknown"} to ${status}`,
        status === "resolved" || status === "solved" ? "success" : status === "post" ? "info" : "warning",
      );
      showToast(`Item ${id} updated to ${status}!`);
      window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
    });
  };

  const deleteLostFound = async (id: string) => {
    if (!confirm(`Delete item ${id}? This action cannot be undone.`)) return;
    try {
      const target = lfItems.find(item => item.id === id);
      await deleteLostFoundItem(id);
      setLfItems(prev => prev.filter(item => item.id !== id));
      logAudit(`Deleted lost & found item ${id}${target ? ` (${target.item_type}: ${target.item_name}); last status: ${target.status}` : ""}`, "error");
      showToast(`Item ${id} deleted.`);
      window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
    } catch {
      showToast(`Failed to delete ${id}`);
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    new: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
    investigating: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
    resolved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    rejected: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-400" },
  };
  const incidentStatusOptions: Array<Incident["status"]> = ["new", "investigating", "resolved", "rejected"];
  const isTerminalIncidentStatus = (status: Incident["status"]) => status === "resolved" || status === "rejected";
  const statusFilterOptions = [
    { key: "all", label: "All", count: incidents.length },
    { key: "pending", label: "Pending", count: incidents.filter(r => getEffectiveIncidentStatus(r) === "new").length },
    { key: "investigating", label: "Investigating", count: incidents.filter(r => getEffectiveIncidentStatus(r) === "investigating").length },
    { key: "resolved", label: "Resolved", count: incidents.filter(r => getEffectiveIncidentStatus(r) === "resolved").length },
    { key: "rejected", label: "Rejected", count: incidents.filter(r => getEffectiveIncidentStatus(r) === "rejected").length },
  ];
  const priorityConfig: Record<string, string> = {
    critical: "text-red-600 bg-red-50",
    high: "text-rose-500 bg-rose-50",
    medium: "text-amber-500 bg-amber-50",
    low: "text-gray-400 bg-gray-50",
  };
  const caseStatusConfig: Record<string, { bg: string; text: string }> = {
    open: { bg: "bg-blue-50", text: "text-blue-600" },
    investigating: { bg: "bg-amber-50", text: "text-amber-600" },
    resolved: { bg: "bg-emerald-50", text: "text-emerald-600" },
    closed: { bg: "bg-gray-100", text: "text-gray-500" },
  };
  const lfStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
    post: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
    resolved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  };
  const documentStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
    approved: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
    processing: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-400" },
    ready_to_pickup: { bg: "bg-[#008080]/10", text: "text-[#008080]", dot: "bg-[#008080]" },
    claimed: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    unclaimed: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-400" },
    rejected: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  };

  const allRefundReports = incidents.filter(r =>
    r.category === "Document Refund" || (r.subcategory || "").toLowerCase().includes("refund")
  );
  const allCaseMgmtReports = incidents.filter(r => !allRefundReports.includes(r));

  const caseMgmtTotal = allCaseMgmtReports.length;
  const caseMgmtPending = allCaseMgmtReports.filter(r => getEffectiveIncidentStatus(r) === "new").length;
  const caseMgmtInvestigating = allCaseMgmtReports.filter(r => getEffectiveIncidentStatus(r) === "investigating").length;
  const caseMgmtResolved = allCaseMgmtReports.filter(r => getEffectiveIncidentStatus(r) === "resolved").length;

  const refundTotal = allRefundReports.length;
  const refundPending = allRefundReports.filter(r => getEffectiveIncidentStatus(r) === "new").length;
  const refundInvestigating = allRefundReports.filter(r => getEffectiveIncidentStatus(r) === "investigating").length;
  const refundResolved = allRefundReports.filter(r => getEffectiveIncidentStatus(r) === "resolved").length;

  const gcashPaidDocuments = gcashDocuments.filter((doc) => (doc.payment || "").toLowerCase() === "gcash");
  const filteredGcashDocuments = gcashPaidDocuments.filter((doc) => {
    const query = gcashSearch.toLowerCase();
    const matchSearch = [doc.id, doc.name, doc.type, doc.status, doc.date, doc.pickupDeadline, doc.requirementType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchStatus = gcashStatusFilter === "all" || doc.status === gcashStatusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const aTime = new Date(a.date || "").getTime() || 0;
    const bTime = new Date(b.date || "").getTime() || 0;
    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });

  const filteredLostFound = lfItems.filter((item) => {
    const matchSearch = [item.id, item.item_name, item.reporter_name, item.category, item.location, item.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(lfSearch.toLowerCase()));
    const itemStatus = item.status === "solved" ? "resolved" : item.status;
    const matchStatus = lfStatusFilter === "all" || itemStatus === lfStatusFilter;
    const matchType = lfTypeFilter === "all" || item.item_type === lfTypeFilter;
    const matchAnon = !lfAnonymousOnly || item.is_anonymous;
    const matchNonAnon = !nonAnonymousOnlyLF || !item.is_anonymous;
    return matchSearch && matchStatus && matchType && matchAnon && matchNonAnon;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at || a.date_reported || "").getTime() || 0;
    const bTime = new Date(b.created_at || b.date_reported || "").getTime() || 0;
    return lfSortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });

  const lfPending = lfItems.filter((item) => item.status === "pending").length;
  const lfPosted = lfItems.filter((item) => item.status === "post").length;
  const lfResolved = lfItems.filter((item) => item.status === "resolved").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs tracking-widest uppercase text-gray-400 mb-3">Total Reports</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Case Management:</span><span className="text-[#1B263B] font-semibold">{caseMgmtTotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Document Refund:</span><span className="text-[#1B263B] font-semibold">{refundTotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Lost & Found:</span><span className="text-[#1B263B] font-semibold">{lfItems.length}</span></div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-semibold"><span className="text-gray-700">Total:</span><span className="text-[#1B263B]">{caseMgmtTotal + refundTotal + lfItems.length}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs tracking-widest uppercase text-gray-400 mb-3">Pending Reports</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Case Management:</span><span className="text-[#1B263B] font-semibold">{caseMgmtPending}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Document Refund:</span><span className="text-[#1B263B] font-semibold">{refundPending}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Lost & Found:</span><span className="text-[#1B263B] font-semibold">{lfPending}</span></div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-semibold"><span className="text-gray-700">Total:</span><span className="text-amber-600">{caseMgmtPending + refundPending + lfPending}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs tracking-widest uppercase text-gray-400 mb-3">Investigation Reports</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Case Management:</span><span className="text-[#1B263B] font-semibold">{caseMgmtInvestigating}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Document Refund:</span><span className="text-[#1B263B] font-semibold">{refundInvestigating}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Lost & Found:</span><span className="text-[#1B263B] font-semibold">{lfPosted}</span></div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-semibold"><span className="text-gray-700">Total:</span><span className="text-amber-600">{caseMgmtInvestigating + refundInvestigating + lfPosted}</span></div>
          </div>
        </div>
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
           <h3 className="text-xs tracking-widest uppercase text-gray-400 mb-3">Resolved Reports</h3>
           <div className="space-y-2 text-sm">
             <div className="flex justify-between"><span className="text-gray-600">Case Management:</span><span className="text-[#1B263B] font-semibold">{caseMgmtResolved}</span></div>
             <div className="flex justify-between"><span className="text-gray-600">Document Refund:</span><span className="text-[#1B263B] font-semibold">{refundResolved}</span></div>
             <div className="flex justify-between"><span className="text-gray-600">Lost & Found:</span><span className="text-[#1B263B] font-semibold">{lfResolved}</span></div>
             <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-semibold"><span className="text-gray-700">Total:</span><span className="text-emerald-600">{caseMgmtResolved + refundResolved + lfResolved}</span></div>
           </div>
         </div>
      </div>

      {/* Management Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <button onClick={() => setShowCaseManager(!showCaseManager)} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 ${showCaseManager ? "bg-[#1B263B] text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
          <History className="w-3.5 h-3.5" /> Case Management
        </button>
        <button onClick={() => setShowRefundManager(!showRefundManager)} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 ${showRefundManager ? "bg-amber-600 text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
          <DollarSign className="w-3.5 h-3.5" /> Document Refunds
        </button>
        <button onClick={() => setShowLostFoundManager(!showLostFoundManager)} className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 ${showLostFoundManager ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
          <Package className="w-3.5 h-3.5" /> Lost &amp; Found
        </button>
      </div>

      {/* Case Management */}
      <AnimatePresence>
        {showCaseManager && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-[#1B263B] flex items-center gap-2"><Shield className="w-5 h-5 text-amber-600" /> Case Management</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none" value={caseSearch} onChange={e => setCaseSearch(e.target.value)} />
                  </div>
                  <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={caseUrgencyFilter} onChange={e => setCaseUrgencyFilter(e.target.value)}>
                    <option value="all">All Urgency</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button onClick={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                    className="text-xs bg-white text-gray-500 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
                    {sortDirection === "desc" ? "Newest first" : "Oldest first"}
                  </button>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={anonymousOnly} onChange={e => setAnonymousOnly(e.target.checked)} className="accent-amber-500" />
                    Anonymous only
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={nonAnonymousOnlyCase} onChange={e => setNonAnonymousOnlyCase(e.target.checked)} className="accent-blue-500" />
                    Non-anonymous only
                  </label>
                </div>
              </div>

              <div className="space-y-3 max-h-[17rem] overflow-y-auto pr-2">
                <AnimatePresence>
                  {sortedCaseManagement.length > 0 ? sortedCaseManagement.map((r, i) => {
                    const reportStatus = getEffectiveIncidentStatus(r);
                    const sc = statusConfig[reportStatus] || statusConfig.new;
                    const priorityLabel = r.urgency || r.priority || "Medium";
                    const priorityKey = getPriorityKey(priorityLabel);
                    return (
                      <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-[#FAFBFC] rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setReviewReport(r)}>
                        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#008080]">{r.id}</span>
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {r.status}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[priorityKey] || priorityConfig.medium}`}>{priorityLabel}</span>
                            <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">{r.category}{r.subcategory ? ` — ${r.subcategory}` : ""}</span>
                            {r.evidence_photo_count && <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full flex items-center gap-1"><ImageIcon className="w-3 h-3" />{r.evidence_photo_count}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Clock className="w-3 h-3" />{formatExactTimestamp(r.created_at || r.incident_date)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">{r.details}</p>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">{r.reporter_name === "Anonymous" ? <Shield className="w-3.5 h-3.5 text-[#008080]" /> : <User className="w-3.5 h-3.5" />}{r.reporter_name}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.location}</span>
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setReviewReport(r)} className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Review</button>
                            {!isTerminalIncidentStatus(reportStatus) && incidentStatusOptions
                              .filter(status => status !== r.status)
                              .map(status => {
                                const cfg = statusConfig[status] || statusConfig.new;
                                const actionLabel = status === "new"
                                  ? "Set Pending"
                                  : status === "investigating"
                                    ? "Investigate"
                                    : status === "resolved"
                                      ? "Resolve"
                                      : "Reject";
                                return (
                                  <button
                                    key={`${r.id}-${status}`}
                                    onClick={() => status === "rejected" ? openRejectReport(r) : updateStatus(r.id, status)}
                                    className={`text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${cfg.bg} ${cfg.text} hover:opacity-90`}
                                  >
                                    {actionLabel}
                                    {(status === "resolved" || status === "investigating") && <ArrowRight className="w-3.5 h-3.5" />}
                                  </button>
                                );
                              })}
                            <button onClick={async () => {
                              if (!confirm(`Delete report ${r.id}? This action cannot be undone.`)) return;
                              try {
                                await deleteIncident(r.id);
                                setIncidents(prev => prev.filter(x => x.id !== r.id));
                                logAudit(`Deleted report ${r.id} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ""}) from ${r.reporter_name || "Unknown reporter"}; last status: ${reportStatus}`, "error");
                                showToast(`Report ${r.id} deleted.`);
                                window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
                              } catch (err) {
                                showToast(`Failed to delete ${r.id}`);
                              }
                            }} className="text-xs bg-rose-50 text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors">Delete</button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="text-xs text-gray-400">No reports match the current filters.</div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                {filteredCases.map(c => {
                  const cs = caseStatusConfig[c.status];
                  return (
                    <div key={c.id} className="bg-[#FAFBFC] rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs ${c.status === "open" ? "bg-blue-500" : c.status === "investigating" ? "bg-amber-500" : c.status === "resolved" ? "bg-emerald-500" : "bg-gray-400"}`}>
                            {c.subject_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#1B263B]">{c.subject_name}</span>
                              <span className="text-xs text-gray-400">{c.id}</span>
                            </div>
                            <p className="text-xs text-gray-500">{c.crime_description} — {c.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${cs.bg} ${cs.text}`}>{c.status}</span>
                          <motion.div animate={{ rotate: expandedCase === c.id ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-gray-300" /></motion.div>
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedCase === c.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-3">
                              <p className="text-xs text-gray-600 bg-[#FAFBFC] rounded-xl p-3 leading-relaxed">{c.details}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {c.charges && <div className="py-1 border-b border-gray-50"><span className="text-gray-400">Charges: </span><span className="text-[#1B263B]">{c.charges}</span></div>}
                                {c.complainant && <div className="py-1 border-b border-gray-50"><span className="text-gray-400">Complainant: </span><span className="text-[#1B263B]">{c.complainant}</span></div>}
                                {c.respondent && <div className="py-1 border-b border-gray-50"><span className="text-gray-400">Respondent: </span><span className="text-[#1B263B]">{c.respondent}</span></div>}
                                {c.mediator && <div className="py-1 border-b border-gray-50"><span className="text-gray-400">Mediator: </span><span className="text-[#1B263B]">{c.mediator}</span></div>}
                                {c.penalty && <div className="col-span-2 py-1 border-b border-gray-50"><span className="text-gray-400">Penalty/Resolution: </span><span className="text-emerald-600">{c.penalty}</span></div>}
                                {c.date_resolved && <div className="py-1 border-b border-gray-50"><span className="text-gray-400">Date Resolved: </span><span className="text-[#1B263B]">{c.date_resolved}</span></div>}
                                {c.remarks && <div className="col-span-2 py-1 border-b border-gray-50"><span className="text-gray-400">Remarks: </span><span className="text-amber-600">{c.remarks}</span></div>}
                              </div>
                              {/* Prior offenses section removed - backend does not support yet */}
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span><Clock className="w-3 h-3 inline mr-1" />{c.case_date}</span>
                                <span><MapPin className="w-3 h-3 inline mr-1" />{c.location}</span>
                              </div>
                              <div className="flex gap-2 items-center">
                                <label className="text-xs text-gray-400">Update Status:</label>
                                {(["open", "investigating", "resolved", "closed"] as CaseRecord["status"][]).filter(s => s !== c.status).map(s => (
                                  <button key={s} onClick={() => updateCaseStatus(c.id, s)} className={`text-xs px-2.5 py-1 rounded-full capitalize ${caseStatusConfig[s].bg} ${caseStatusConfig[s].text} hover:shadow-sm transition-all`}>{s}</button>
                                ))}
                                <button onClick={async () => {
                                  if (!confirm(`Delete case ${c.id}? This action cannot be undone.`)) return;
                                  try {
                                    await deleteCase(c.id);
                                    setCases(prev => prev.filter(x => x.id !== c.id));
                                    logAudit(`Deleted case record ${c.id} for ${c.subject_name}; ${c.crime_description}; last status: ${c.status}`, "error");
                                    showToast(`Case ${c.id} deleted.`);
                                    window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
                                  } catch (err) {
                                    showToast(`Failed to delete ${c.id}`);
                                  }
                                }} className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">Delete</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Refund Management */}
      <AnimatePresence>
        {showRefundManager && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-[#1B263B] flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-600" /> Document Refund Management</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input placeholder="Search refunds..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none" value={refundSearch} onChange={e => setRefundSearch(e.target.value)} />
                  </div>
                  <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button onClick={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                    className="text-xs bg-white text-gray-500 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
                    {sortDirection === "desc" ? "Newest first" : "Oldest first"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGcashTracking(prev => !prev)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  showGcashTracking
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-gray-100 bg-white text-gray-600 hover:bg-amber-50/40 hover:border-amber-100"
                }`}
              >
                <span className="flex items-center gap-2 text-sm" style={{ fontWeight: 600 }}>
                  <DollarSign className="w-4 h-4 text-amber-600" /> GCash-Paid Document Tracking
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {gcashPaidDocuments.length} GCash-paid document{gcashPaidDocuments.length === 1 ? "" : "s"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showGcashTracking ? "rotate-180" : ""}`} />
                </span>
              </button>

              <AnimatePresence initial={false}>
              {showGcashTracking && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-sm text-[#1B263B] flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" /> GCash-Paid Document Tracking
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Original document requests paid through GCash for refund verification.
                    </p>
                  </div>
                  <span className="text-xs text-amber-700 bg-white border border-amber-100 rounded-full px-3 py-1">
                    {filteredGcashDocuments.length} of {gcashPaidDocuments.length} shown
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      placeholder="Search tracking code, name, document..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-amber-100 rounded-xl text-xs outline-none"
                      value={gcashSearch}
                      onChange={e => setGcashSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="bg-white border border-amber-100 rounded-xl px-3 py-2 text-xs outline-none"
                    value={gcashStatusFilter}
                    onChange={e => setGcashStatusFilter(e.target.value)}
                  >
                    <option value="all">All Document Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="processing">Processing</option>
                    <option value="ready_to_pickup">Ready to Pick Up</option>
                    <option value="claimed">Claimed</option>
                    <option value="unclaimed">Unclaimed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="hidden lg:block overflow-hidden rounded-2xl border border-amber-100 bg-white">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-white border-b border-gray-100">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                          <th className="px-4 py-3">Tracking Code</th>
                          <th className="px-4 py-3">Document</th>
                          <th className="px-4 py-3">Requested</th>
                          <th className="px-4 py-3">Pickup Deadline</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredGcashDocuments.map((doc) => {
                          const docStatus = documentStatusConfig[doc.status] || documentStatusConfig.pending;
                          const receiptUrl = normalizeReceiptUrl(doc.gcashProof);
                          return (
                            <tr key={doc.id} className="hover:bg-amber-50/30">
                              <td className="px-4 py-3">
                                <p className="text-[#008080]" style={{ fontWeight: 600 }}>{doc.id}</p>
                                <p className="text-xs text-gray-400">{doc.name}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-[#1B263B]">{doc.type}</p>
                                <p className="text-xs text-gray-400">{doc.requirementType || "Default requirements"}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-500">{formatShortDate(doc.date)}</td>
                              <td className="px-4 py-3 text-gray-500">{formatShortDate(doc.pickupDeadline)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${docStatus.bg} ${docStatus.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${docStatus.dot}`} /> {doc.status.replaceAll("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {receiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewPhoto(receiptUrl)}
                                    className="inline-flex items-center gap-1.5 text-xs bg-white text-amber-700 border border-amber-100 px-3 py-2 rounded-xl hover:bg-amber-50"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" /> View
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300">No receipt</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:hidden space-y-3 max-h-80 overflow-y-auto pr-1">
                  {filteredGcashDocuments.map((doc) => {
                    const docStatus = documentStatusConfig[doc.status] || documentStatusConfig.pending;
                    const receiptUrl = normalizeReceiptUrl(doc.gcashProof);
                    return (
                      <div key={doc.id} className="bg-white border border-amber-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-[#008080]" style={{ fontWeight: 600 }}>{doc.id}</p>
                            <p className="text-xs text-gray-400">{doc.name}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${docStatus.bg} ${docStatus.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${docStatus.dot}`} /> {doc.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-400 uppercase tracking-wider">Document</p>
                            <p className="text-[#1B263B] mt-1">{doc.type}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wider">Requirement Type</p>
                            <p className="text-[#1B263B] mt-1">{doc.requirementType || "Default"}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wider">Requested</p>
                            <p className="text-[#1B263B] mt-1">{formatShortDate(doc.date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wider">Pickup Deadline</p>
                            <p className="text-[#1B263B] mt-1">{formatShortDate(doc.pickupDeadline)}</p>
                          </div>
                        </div>
                        {receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewPhoto(receiptUrl)}
                            className="w-full flex items-center justify-center gap-1.5 text-xs bg-amber-50 text-amber-700 px-3 py-2.5 rounded-xl"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> View GCash Receipt
                          </button>
                        ) : (
                          <p className="text-xs text-gray-300">No receipt image attached.</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredGcashDocuments.length === 0 && (
                  <p className="text-center py-6 text-gray-300 text-xs bg-white rounded-2xl border border-amber-100">
                    No GCash-paid document requests found.
                  </p>
                )}
              </div>
              </motion.div>
              )}
              </AnimatePresence>

              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
                {refundReports.filter(r => {
                  const matchSearch = r.reporter_name.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.category.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.id.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.details.toLowerCase().includes(refundSearch.toLowerCase());
                  const reportStatus = getEffectiveIncidentStatus(r);
                  const matchStatus = statusFilter === "all" || (statusFilter === "pending" ? reportStatus === "new" : reportStatus === statusFilter);
                  const matchAnon = !anonymousOnly || r.is_anonymous;
                  return matchSearch && matchStatus && matchAnon;
                }).map((r, i) => {
                  const reportStatus = getEffectiveIncidentStatus(r);
                  const sc = statusConfig[reportStatus] || statusConfig.new;
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer mb-3 last:mb-0" onClick={() => setReviewReport(r)}>
                      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-[#008080]">{r.id}</span>
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {reportStatus}
                          </span>
                          <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">{r.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Clock className="w-3 h-3" />{formatExactTimestamp(r.created_at || r.incident_date)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">{r.details}</p>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1.5">{r.reporter_name === "Anonymous" ? <Shield className="w-3.5 h-3.5 text-[#008080]" /> : <User className="w-3.5 h-3.5" />}{r.reporter_name}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Suspect: -</span>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setReviewReport(r)} className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Review</button>
                          {!isTerminalIncidentStatus(reportStatus) && incidentStatusOptions
                            .filter(status => status !== r.status)
                            .map(status => {
                              const cfg = statusConfig[status] || statusConfig.new;
                              const actionLabel = status === "new"
                                ? "Set Pending"
                                : status === "investigating"
                                  ? "Investigate"
                                  : status === "resolved"
                                    ? "Resolve"
                                    : "Reject";
                              return (
                                <button
                                  key={`${r.id}-${status}`}
                                  onClick={() => status === "rejected" ? openRejectReport(r) : updateStatus(r.id, status)}
                                  className={`text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${cfg.bg} ${cfg.text} hover:opacity-90`}
                                >
                                  {actionLabel}
                                  {(status === "resolved" || status === "investigating") && <ArrowRight className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          <button onClick={async () => {
                            if (!confirm(`Delete report ${r.id}? This action cannot be undone.`)) return;
                            try {
                              await deleteIncident(r.id);
                              setIncidents(prev => prev.filter(x => x.id !== r.id));
                              logAudit(`Deleted refund report ${r.id} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ""}) from ${r.reporter_name || "Unknown reporter"}; last status: ${reportStatus}`, "error");
                              showToast(`Report ${r.id} deleted.`);
                              window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
                            } catch (err) {
                              showToast(`Failed to delete ${r.id}`);
                            }
                          }} className="text-xs bg-rose-50 text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors">Delete</button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {refundReports.filter(r => {
                  const matchSearch = r.reporter_name.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.category.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.id.toLowerCase().includes(refundSearch.toLowerCase()) ||
                    r.details.toLowerCase().includes(refundSearch.toLowerCase());
                  const matchStatus = statusFilter === "all" || (statusFilter === "pending" ? r.status === "new" : r.status === statusFilter);
                  const matchAnon = !anonymousOnly || r.is_anonymous;
                  return matchSearch && matchStatus && matchAnon;
                }).length === 0 && <p className="text-center py-6 text-gray-300 text-xs">No refund reports found.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lost & Found Management */}
      <AnimatePresence>
        {showLostFoundManager && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-[#1B263B] flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /> Lost &amp; Found Management</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input placeholder="Search items..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none" value={lfSearch} onChange={e => setLfSearch(e.target.value)} />
                  </div>
                  <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={lfStatusFilter} onChange={e => setLfStatusFilter(e.target.value as typeof lfStatusFilter)}>
                    <option value="all">All Status</option><option value="pending">Pending</option><option value="post">Post</option><option value="resolved">Resolved</option>
                  </select>
                  <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={lfTypeFilter} onChange={e => setLfTypeFilter(e.target.value as typeof lfTypeFilter)}>
                    <option value="all">All Type</option><option value="lost">Lost</option><option value="found">Found</option>
                  </select>
                  <button onClick={() => setLfSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                    className="text-xs bg-white text-gray-500 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
                    {lfSortDirection === "desc" ? "Newest first" : "Oldest first"}
                  </button>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={lfAnonymousOnly} onChange={e => setLfAnonymousOnly(e.target.checked)} className="accent-blue-500" />
                    Anonymous only
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={nonAnonymousOnlyLF} onChange={e => setNonAnonymousOnlyLF(e.target.checked)} className="accent-blue-500" />
                    Non-Anonymous only
                  </label>
                </div>
              </div>

              <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-2">
                {filteredLostFound.length > 0 ? filteredLostFound.map((item, i) => {
                  const itemStatus = item.status === "solved" ? "resolved" : item.status;
                  const sc = lfStatusConfig[itemStatus] || lfStatusConfig.pending;
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#FAFBFC] rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setReviewLF(item)}>
                      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-[#008080]">{item.id}</span>
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {itemStatus}
                          </span>
                          <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full capitalize">{item.item_type}</span>
                          <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">{item.category || "—"}</span>
                          {(item.image_urls?.length || item.image_url) && <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full flex items-center gap-1"><ImageIcon className="w-3 h-3" />{item.image_urls?.length || 1} photo{(item.image_urls?.length || 1) === 1 ? "" : "s"}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Clock className="w-3 h-3" />{formatExactTimestamp(item.created_at || item.date_reported)}
                        </div>
                      </div>
                      <p className="text-sm text-[#1B263B] mb-1 leading-relaxed line-clamp-1" style={{ fontWeight: 600 }}>{item.item_name}</p>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">{item.description || "No description provided."}</p>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1.5">{item.is_anonymous ? <Shield className="w-3.5 h-3.5 text-[#008080]" /> : <User className="w-3.5 h-3.5" />}{item.is_anonymous ? "Anonymous" : item.reporter_name || "—"}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{item.location || "—"}</span>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setReviewLF(item)} className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Review</button>
                          {itemStatus !== "resolved" && (
                            <button onClick={() => updateLostFound(item.id, "resolved")} className="text-xs bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5">Resolve <ArrowRight className="w-3.5 h-3.5" /></button>
                          )}
                          {itemStatus !== "post" && (
                            <button onClick={() => updateLostFound(item.id, "post")} className="text-xs bg-amber-50 text-amber-600 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors">Post</button>
                          )}
                          <button onClick={() => deleteLostFound(item.id)} className="text-xs bg-rose-50 text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors">Delete</button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="text-xs text-gray-400">No lost &amp; found items match the current filters.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Report Modal */}
      <AnimatePresence>
        {reviewReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewReport(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>{reviewReport.category === "Document Refund" ? "Document Refunds View" : "Report Review"}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{reviewReport.id} — {formatExactTimestamp(reviewReport.created_at || reviewReport.incident_date)}</p>
                  </div>
                  <button onClick={() => setReviewReport(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  const isRefundReport = reviewReport.category === "Document Refund";
                  const priorityLabel = reviewReport.urgency || reviewReport.priority || "Medium";
                  const priorityKey = getPriorityKey(priorityLabel);
                  const reviewStatus = getEffectiveIncidentStatus(reviewReport);
                  return (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${statusConfig[reviewStatus]?.bg} ${statusConfig[reviewStatus]?.text}`}>{reviewStatus}</span>
                  {!isRefundReport && <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[priorityKey] || priorityConfig.medium}`}>{priorityLabel} priority</span>}
                  {!isRefundReport && reviewReport.urgency && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Urgency: {reviewReport.urgency}</span>}
                </div>
                  );
                })()}

                <div className="space-y-2.5 text-sm">
                  <p className="text-xs text-rose-500 uppercase tracking-wider">Reporter</p>
                  {[["Name", reviewReport.reporter_name], ["Phone", reviewReport.reporter_phone || (reviewReport.reporter_name === "Anonymous" ? "Hidden" : "—")], ["Relation", reviewReport.reporter_relation || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  <p className="text-xs text-rose-500 uppercase tracking-wider mt-3">Incident</p>
                  {[["Category", `${reviewReport.category}${reviewReport.subcategory ? " — " + reviewReport.subcategory : ""}`], ["Date", reviewReport.incident_date], ["Time", reviewReport.incident_time || "—"], ["Location", reviewReport.location], ["Landmark", reviewReport.landmark || "—"], ["Suspect", reviewReport.category === "Document Refund" ? "-" : (reviewReport.suspect_name || "Unknown")], ["Description", reviewReport.category === "Document Refund" ? "-" : (reviewReport.suspect_description || "—")], ["Victims", reviewReport.victims_involved || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                  ))}
                  <p className="text-xs text-rose-500 uppercase tracking-wider mt-3">Narrative</p>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-[#FAFBFC] rounded-xl p-3">{reviewReport.details}</p>
                  {reviewReport.status === "rejected" && (
                    <>
                      <p className="text-xs text-rose-500 uppercase tracking-wider mt-3">Rejection Reason</p>
                      <p className="text-xs text-rose-700 leading-relaxed whitespace-pre-wrap bg-rose-50 border border-rose-100 rounded-xl p-3">{reviewReport.rejectionReason || "No reason provided."}</p>
                    </>
                  )}
                </div>

                {((reviewReport.evidence_photos && reviewReport.evidence_photos.length > 0) || reviewReport.evidence_photo_count) && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Evidence Photos ({reviewReport.evidence_photos?.length || reviewReport.evidence_photo_count || 0})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(reviewReport.evidence_photos || []).map((photo, i) => (
                        <button key={i} onClick={() => setViewPhoto(photo)} className="w-full h-20 rounded-xl border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={photo} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-gray-50 flex-wrap" onClick={e => e.stopPropagation()}>
                {!isTerminalIncidentStatus(reviewReport.status) && incidentStatusOptions
                  .filter(status => status !== reviewReport.status)
                  .map(status => {
                    const cfg = statusConfig[status] || statusConfig.new;
                    const label = status === "investigating"
                      ? "Investigate"
                      : status === "resolved"
                        ? "Resolve"
                        : status === "rejected"
                          ? "Reject"
                          : "Set Pending";
                    return (
                      <button
                        key={`${reviewReport.id}-${status}`}
                        onClick={() => {
                          if (status === "rejected") {
                            openRejectReport(reviewReport);
                            return;
                          }
                          updateStatus(reviewReport.id, status);
                          setReviewReport(null);
                        }}
                        className={`flex-1 min-w-[10rem] py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${cfg.bg} ${cfg.text} hover:opacity-90`}
                      >
                        {status === "investigating" && <Eye className="w-4 h-4" />}
                        {status === "resolved" && <Check className="w-4 h-4" />}
                        {status === "rejected" && <X className="w-4 h-4" />}
                        {label}
                      </button>
                    );
                  })}
                {isTerminalIncidentStatus(reviewReport.status) && (
                  <p className="w-full text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    This report is in a final status and can no longer be changed.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Lost & Found Modal */}
      <AnimatePresence>
        {reviewLF && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewLF(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Lost &amp; Found Review</h3>
                    <p className="text-white/50 text-xs mt-0.5">{reviewLF.id} — {formatExactTimestamp(reviewLF.created_at || reviewLF.date_reported)}</p>
                  </div>
                  <button onClick={() => setReviewLF(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="space-y-2.5 text-sm">
                  <p className="text-xs text-blue-500 uppercase tracking-wider">Reporter</p>
                  {[ ["Name", reviewLF.is_anonymous ? "Anonymous" : reviewLF.reporter_name || "—"], ["Phone", reviewLF.is_anonymous ? "Hidden" : reviewLF.reporter_phone || "—"], ["Relation", reviewLF.reporter_relation || "—"] ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  <p className="text-xs text-blue-500 uppercase tracking-wider mt-3">Item</p>
                  {[ ["Item Name", reviewLF.item_name || "—"], ["Type", reviewLF.item_type === "lost" ? "Lost Item" : "Found Item"], ["Category", reviewLF.category || "—"], ["Location", reviewLF.location || "—"], ["Landmark", reviewLF.landmark || "—"], ["Person Involved", reviewLF.person_involved || "—"], ["Victims", reviewLF.victims_involved || "—"] ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                  ))}
                  <p className="text-xs text-blue-500 uppercase tracking-wider mt-3">Narrative</p>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-[#FAFBFC] rounded-xl p-3">{reviewLF.description || "—"}</p>
                </div>

                {((reviewLF.image_urls && reviewLF.image_urls.length > 0) || reviewLF.image_url) && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Evidence ({reviewLF.image_urls?.length || 1})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(reviewLF.image_urls?.length ? reviewLF.image_urls : [reviewLF.image_url]).filter(Boolean).map((photo, i) => (
                        <button key={i} onClick={() => setViewPhoto(photo || null)} className="w-full h-32 rounded-xl border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={photo || ""} alt={`${reviewLF.item_name} ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#FFF8E7] border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                  <span>ℹ️</span>
                  <span>This item is currently <strong>{reviewLF.status === "solved" ? "resolved" : reviewLF.status}</strong>.</span>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-gray-50">
                <button onClick={() => setReviewLF(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2">Close</button>
                {reviewLF.status !== "resolved" && reviewLF.status !== "solved" && (
                  <button onClick={() => { updateLostFound(reviewLF.id, "resolved"); setReviewLF(null); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Resolve</button>
                )}
                {reviewLF.status !== "post" && (
                  <button onClick={() => { updateLostFound(reviewLF.id, "post"); setReviewLF(null); }} className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-xl hover:bg-amber-100 transition-colors text-sm flex items-center justify-center gap-2">Post</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Report Modal */}
      <AnimatePresence>
        {rejectReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setRejectReport(null); setRejectReason(""); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Reject Pending Report</h3>
                    <p className="text-white/60 text-xs mt-0.5">{rejectReport.id} - {rejectReport.category}</p>
                  </div>
                  <button onClick={() => { setRejectReport(null); setRejectReason(""); }} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs text-rose-700">
                  This will mark the report as rejected and show the reason in the public report tracker.
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Reason for rejection</label>
                  <textarea
                    rows={5}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why this pending report cannot be accepted."
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm outline-none resize-none border border-gray-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setRejectReport(null); setRejectReason(""); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                  <button onClick={submitRejectReport} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl hover:shadow-lg transition-all text-sm">Reject Report</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox Modal */}
      <AnimatePresence>
        {viewPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewPhoto(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="max-w-2xl max-h-[90vh] relative">
              <img src={viewPhoto} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
              <button onClick={() => setViewPhoto(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X className="w-6 h-6" /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
