import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, UserCheck, Clock, ChevronLeft, ChevronRight, Activity, Stethoscope, Syringe, Play, CheckCircle2, Plus, X, Eye, AlertCircle, Heart, MapPin, Phone, Shield, Calendar as CalIcon, Trash2 } from "lucide-react";
import { useToast } from "../Toast";
import {
  getPatientQueue, updatePatientStatus, deletePatient,
  getClinicUnavailableSlots, createClinicUnavailableSlot, deleteClinicUnavailableSlot,
  getSystemSettings, updateSystemSettings,
  getCalendarEvents, createCalendarEvent, deleteCalendarEvent,
  createAuditLogEntry, getCurrentUser,
  type Patient, type CalendarEvent, type ClinicUnavailableSlot
} from "../../api/services";

const toInputDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ClinicHandler() {
  const [queue, setQueue] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Patient["status"] | "all">("all");
  const [dateBookedSort, setDateBookedSort] = useState<"newest" | "oldest">("newest");
  const [clinicOpen, setClinicOpen] = useState<boolean | null>(null); // null = loading
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scheduleDate, setScheduleDate] = useState(toInputDate());
  const [unavailableSlots, setUnavailableSlots] = useState<ClinicUnavailableSlot[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: "", title: "", icon: "\u{1F3E5}", type: "event" as "event" | "closure" });
  const [reviewPatient, setReviewPatient] = useState<Patient | null>(null);
  const [rejectPatient, setRejectPatient] = useState<Patient | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { showToast } = useToast();

  const year = 2026;
  const clinicSlots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const todayDate = toInputDate();
  const slotToMinutes = (slot: string) => {
    const [time, period] = slot.split(" ");
    const [hourText, minuteText] = time.split(":");
    let hour = Number(hourText);
    const minute = Number(minuteText);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isPastScheduleSlot = (slot: string) => scheduleDate < todayDate || (scheduleDate === todayDate && slotToMinutes(slot) <= currentMinutes);
  const getDateBookedRaw = (p: Patient) => p.dateBooked || p.date_booked || p.created_at || "";
  const getPreferredDate = (p: Patient) => p.queueDate || p.queue_date || "—";
  const formatDateBooked = (p: Patient) => {
    const raw = getDateBookedRaw(p);
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  const formatApptId = (p: Patient) => {
    if (p.appointmentId) return p.appointmentId;
    if (p.appointment_id) return p.appointment_id;
    if (p?.id) return `CLN-${String(p.id).padStart(6, "0")}`;
    return `CLN-${Date.now().toString().slice(-6)}`;
  };
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  /* Load data from services.ts on mount */
  useEffect(() => {
    getPatientQueue().then(setQueue);
    /* Load clinic status from system settings — DJANGO: GET /api/settings/ */
    getSystemSettings().then(s => setClinicOpen(s.clinic_status === "open"));
    const handler = () => getPatientQueue().then(setQueue);
    window.addEventListener("clinicUpdate", handler);
    return () => window.removeEventListener("clinicUpdate", handler);
  }, []);

  useEffect(() => {
    getClinicUnavailableSlots(scheduleDate).then(setUnavailableSlots).catch(() => setUnavailableSlots([]));
  }, [scheduleDate]);

  /* Calendar events sync */
  useEffect(() => {
    const loadEvents = () => getCalendarEvents().then(setEvents);
    loadEvents();
    const handler = () => { loadEvents(); };
    window.addEventListener("calendarUpdate", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("calendarUpdate", handler); window.removeEventListener("storage", handler); };
  }, []);

  const filtered = queue.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.reason.toLowerCase().includes(search.toLowerCase()) || formatApptId(p).toLowerCase().includes(search.toLowerCase());
    const matchFilter = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchFilter;
  }).sort((a, b) => {
    const aTime = new Date(getDateBookedRaw(a)).getTime() || 0;
    const bTime = new Date(getDateBookedRaw(b)).getTime() || 0;
    return dateBookedSort === "newest" ? bTime - aTime : aTime - bTime;
  });

  const updateStatus = async (id: number, status: Patient["status"], rejectionReason?: string) => {
    const previousQueue = queue;
    setQueue(prev => prev.map(p => p.id === id ? { ...p, status, ...(status === "rejected" ? { rejectionReason: rejectionReason?.trim() || "" } : {}) } : p));
    const user = getCurrentUser();
    const patient = queue.find(p => p.id === id);
    try {
      await updatePatientStatus(id, status, rejectionReason);
      if (patient) {
        createAuditLogEntry({
          time: new Date().toLocaleString("en-PH"),
          user: user?.name || "Clinic Handler",
          action: status === "completed"
            ? `Completed patient ${patient.name}`
            : status === "rejected"
              ? `Rejected appointment ${formatApptId(patient)} for ${patient.name}${rejectionReason?.trim() ? `; reason: ${rejectionReason.trim()}` : ""}`
              : `Started serving ${patient.name}`,
          type: status === "completed" ? "success" : status === "rejected" ? "warning" : "info",
        });
      }
      showToast(status === "completed" ? "Patient completed!" : status === "rejected" ? "Patient rejected." : "Now serving patient", status === "rejected" ? "warning" : "success");
      window.dispatchEvent(new CustomEvent("clinicUpdate"));
    } catch {
      setQueue(previousQueue);
      showToast("Failed to update patient status. Please check your account permission.", "error");
    }
  };

  const openRejectPatient = (patient: Patient) => {
    setRejectPatient(patient);
    setRejectReason(patient.rejectionReason || "");
  };

  const submitRejectPatient = async () => {
    if (!rejectPatient) return;
    const reason = rejectReason.trim();
    if (!reason) {
      showToast("Rejection reason is required.", "error");
      return;
    }
    await updateStatus(rejectPatient.id, "rejected", reason);
    setRejectPatient(null);
    setRejectReason("");
    setReviewPatient(prev => prev && prev.id === rejectPatient.id ? null : prev);
  };

  const handleDeletePatient = async (p: Patient) => {
    setQueue(prev => prev.filter(item => item.id !== p.id));
    if (reviewPatient?.id === p.id) setReviewPatient(null);
    try {
      await deletePatient(p.id);
      const user = getCurrentUser();
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: user?.name || "Clinic Handler",
        action: `Deleted appointment ${formatApptId(p)} for ${p.name}`,
        type: "warning",
      });
      showToast(`Deleted ${formatApptId(p)}`);
    } catch {
      getPatientQueue().then(setQueue);
      showToast("Failed to delete appointment.");
    }
  };

  const handleAddEvent = () => {
    const title = newEvent.title.trim();
    if (newEvent.date && title) {
      if (newEvent.date < todayDate) {
        showToast("Health calendar events cannot be scheduled on a previous date.", "error");
        return;
      }
      const eventPayload = {
        date: newEvent.date,
        title,
        color: newEvent.type === "closure" ? "bg-rose-500" : "bg-[#008080]",
        source: "clinic_handler",
        icon: newEvent.icon,
        type: newEvent.type,
      };
      createCalendarEvent(eventPayload).then((createdEvent) => {
        getCalendarEvents().then(setEvents);
        const user = getCurrentUser();
        createAuditLogEntry({
          time: new Date().toLocaleString("en-PH"),
          user: user?.name || "Clinic Handler",
          action: `Created clinic calendar ${eventPayload.type} ${createdEvent.id}: "${eventPayload.title}" scheduled on ${eventPayload.date}; source: ${eventPayload.source}; icon: ${eventPayload.icon}; color: ${eventPayload.color}`,
          type: eventPayload.type === "closure" ? "warning" : "info",
        });
        setNewEvent({ date: "", title: "", icon: "\u{1F3E5}", type: "event" });
        setShowAddEvent(false);
        showToast("Event added to health calendar!");
      }).catch(() => {
        showToast("Failed to add health calendar event.", "error");
      });
    }
  };

  const handleRemoveEvent = (id: string) => {
    const target = events.find(e => e.id === id);
    if (!window.confirm(`Delete clinic calendar event${target ? ` "${target.title}"` : ""}? This cannot be undone.`)) return;
    deleteCalendarEvent(id).then(() => {
      getCalendarEvents().then(setEvents);
      const user = getCurrentUser();
      createAuditLogEntry({
        time: new Date().toLocaleString("en-PH"),
        user: user?.name || "Clinic Handler",
        action: `Deleted clinic calendar event ${id}: "${target?.title || "Unknown event"}" scheduled on ${target?.date || "unknown date"}; type: ${target?.type || "event"}; source: ${target?.source || "clinic_handler"}; icon: ${target?.icon || "none"}`,
        type: "warning",
      });
      showToast("Health calendar event deleted.");
    }).catch(() => {
      showToast("Failed to delete health calendar event.", "error");
    });
  };

  const bookingCountsForScheduleDate = queue
    .filter(p => (p.queueDate || p.queue_date) === scheduleDate && p.status !== "canceled" && p.status !== "rejected")
    .reduce<Record<string, number>>((counts, patient) => {
      counts[patient.time] = (counts[patient.time] || 0) + 1;
      return counts;
    }, {});

  const toggleUnavailableSlot = async (slot: string) => {
    const existing = unavailableSlots.find(item => item.date === scheduleDate && item.time === slot);
    try {
      if (existing) {
        await deleteClinicUnavailableSlot(existing.id);
        setUnavailableSlots(prev => prev.filter(item => item.id !== existing.id));
        showToast(`${slot} is now available.`);
        return;
      }
      const created = await createClinicUnavailableSlot({ date: scheduleDate, time: slot, reason: "Marked unavailable by clinic handler" });
      setUnavailableSlots(prev => [...prev, created]);
      showToast(`${slot} marked unavailable.`);
    } catch {
      showToast("Failed to update slot availability.", "error");
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    waiting: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400", label: "Waiting" },
    "in-progress": { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400", label: "In Progress" },
    completed: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400", label: "Done" },
    rejected: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-400", label: "Rejected" },
  };

  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const sortedMonthEvents = [...monthEvents].sort((a, b) => a.date.localeCompare(b.date));
  const eventsByDate = sortedMonthEvents.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    groups[event.date] = groups[event.date] || [];
    groups[event.date].push(event);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Clinic Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={async () => {
              if (clinicOpen === null) return;
              const newStatus = !clinicOpen;
              try {
              /* Persist to services.ts — DJANGO: PATCH /api/settings/ */
              await updateSystemSettings({ clinic_status: newStatus ? "open" : "closed" });
              setClinicOpen(newStatus);
              const user = getCurrentUser();
              createAuditLogEntry({
                time: new Date().toLocaleString("en-PH"),
                user: user?.name || "Clinic Handler",
                action: `Updated clinic status to ${newStatus ? "OPEN" : "CLOSED"}`,
                type: newStatus ? "success" : "info",
              });
              window.dispatchEvent(new Event("clinicStatusUpdate"));
              showToast(newStatus ? "Clinic is now OPEN" : "Clinic is now CLOSED", newStatus ? "success" : "error");
              } catch {
                showToast("Failed to update clinic status. Please check your account permission.", "error");
              }
            }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all ${clinicOpen === null ? "bg-gray-100 text-gray-300" : clinicOpen ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20" : "bg-gray-100 text-gray-400"}`}>
            <Activity className={`w-5 h-5 ${clinicOpen ? "animate-pulse" : ""}`} />
            <span className="text-sm">{clinicOpen === null ? "Loading..." : clinicOpen ? "Clinic Open" : "Clinic Closed"}</span>
            <div className={`w-3 h-3 rounded-full ${clinicOpen ? "bg-white/50" : "bg-gray-300"}`} />
          </motion.button>
        </div>
      </div>

      {clinicOpen === false && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
          <p className="text-rose-600 text-sm">Clinic is currently closed. No patients are being accepted.</p>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[#1B263B] flex items-center gap-2"><Clock className="w-5 h-5 text-[#008080]" /> Time Slot Availability</h3>
            <p className="text-xs text-gray-400 mt-1">Mark appointment slots unavailable for public booking.</p>
          </div>
          <div className="relative w-full sm:w-56">
            <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="date" min={todayDate} className="w-full bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080]/20" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {clinicSlots.map(slot => {
            const manual = unavailableSlots.find(item => item.date === scheduleDate && item.time === slot);
            const bookingCount = bookingCountsForScheduleDate[slot] || 0;
            const isPast = isPastScheduleSlot(slot);
            const locked = isPast;
            const statusText = isPast ? "Past" : manual ? "Unavailable" : "Available";
            return (
              <button
                key={slot}
                onClick={() => !locked && toggleUnavailableSlot(slot)}
                disabled={locked}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  isPast ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through" :
                  manual ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100" :
                  "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                }`}
                title={locked ? `${slot} is ${statusText.toLowerCase()}` : `Click to ${manual ? "make available" : "mark unavailable"}`}
              >
                <span className="block text-sm">{slot}</span>
                <span className="block text-[10px] mt-1 uppercase tracking-wide">{statusText}</span>
                <span className={`block text-[10px] mt-1 ${bookingCount > 0 ? "text-blue-500" : "text-gray-300"}`}>{bookingCount} booking{bookingCount === 1 ? "" : "s"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments Area (scrollable) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {["all", "waiting", "in-progress", "completed", "rejected"].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all capitalize ${statusFilter === f ? "bg-[#008080] text-white shadow-md" : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"}`}>
                  {f === "all" ? "All" : f === "in-progress" ? "In Progress" : f}
                </button>
              ))}
              <select value={dateBookedSort} onChange={e => setDateBookedSort(e.target.value as "newest" | "oldest")}
                className="px-3 py-1.5 rounded-xl text-xs bg-white text-gray-500 border border-gray-100 outline-none focus:ring-2 focus:ring-[#008080]/20">
                <option value="newest">Date Booked: Newest</option>
                <option value="oldest">Date Booked: Oldest</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input placeholder="Search appointments..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#008080]/20 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-4 max-h-[460px] overflow-y-auto">
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((p, i) => {
            const sc = statusConfig[p.status] || statusConfig.waiting;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow ${p.status === "in-progress" ? "ring-2 ring-blue-200 ring-offset-2" : ""}`}
                onClick={() => setReviewPatient(p)}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#008080] to-[#00a89d] flex items-center justify-center text-white text-sm shadow-md">
                      {p.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs text-gray-500 shadow-sm border border-gray-100">{i + 1}</div>
                  </div>
                  <div>
                    <p className="text-sm text-[#1B263B]">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {formatApptId(p)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {p.time}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {p.reason}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                      <span className="text-xs text-gray-400">Preferred Date: {getPreferredDate(p)}</span>
                      <span className="text-xs text-gray-400">Date Booked: {formatDateBooked(p)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {sc.label}
                  </span>
                  <button onClick={() => setReviewPatient(p)} className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Review"><Eye className="w-4 h-4" /></button>
                  {p.status !== "completed" && (
                    <div className="flex gap-1.5">
                      {p.status === "waiting" && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateStatus(p.id, "in-progress")}
                          className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Start serving">
                          <Play className="w-4 h-4" />
                        </motion.button>
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => updateStatus(p.id, "completed")}
                        className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors" title="Mark complete">
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.button>
                      {p.status !== "rejected" && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => openRejectPatient(p)}
                          className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors" title="Reject appointment">
                          <X className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  )}
                  <button onClick={() => handleDeletePatient(p)} className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors" title="Delete appointment"><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Health Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setMonth(m => Math.max(0, m - 1))} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
          <h3 className="text-[#008080] flex items-center gap-2"><Syringe className="w-5 h-5" /> Health Calendar - {monthNames[month]} {year}</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAddEvent(true)} className="px-3 py-1.5 rounded-xl bg-[#008080] text-white text-xs flex items-center gap-1 hover:shadow-md transition-all"><Plus className="w-3.5 h-3.5" /> Add Event</button>
            <button onClick={() => setMonth(m => Math.min(11, m + 1))} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="text-gray-300 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateStr] || [];
            const ev = dayEvents[0];
            return (
              <div key={day} className={`relative min-h-12 text-center py-3 rounded-xl text-xs transition-all ${ev ? ev.type === "closure" ? "bg-rose-500 text-white shadow-sm" : "bg-gradient-to-br from-[#008080] to-[#00a89d] text-white shadow-sm" : "hover:bg-gray-50"}`} title={dayEvents.map(item => item.title).join(", ")}>
                {day}
                {dayEvents.length > 1 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-white text-[10px] leading-5 text-[#1B263B] shadow-sm border border-gray-100">
                    {dayEvents.length}
                  </span>
                )}
              </div>
            );
          })}
            </div>
        </div>
          <div className="rounded-2xl bg-[#FAFBFC] border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-gray-400">Health Events</p>
              <span className="text-xs text-[#008080]">{sortedMonthEvents.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
          {sortedMonthEvents.map(e => (
            <div key={e.id} className={`flex items-center justify-between ${e.type === "closure" ? "bg-rose-50" : "bg-white"} rounded-xl p-3 min-w-0`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{e.icon || "📅"}</span>
                <div className="min-w-0">
                  <p className={`text-xs truncate ${e.type === "closure" ? "text-rose-600" : "text-[#1B263B]"}`}>{e.title}</p>
                  <p className="text-xs text-gray-400">{monthNames[month]} {new Date(e.date).getDate()}, {year}</p>
                </div>
              </div>
              <button type="button" onClick={() => handleRemoveEvent(e.id)} className="text-gray-300 hover:text-rose-500 transition-colors shrink-0" title="Delete health calendar event" aria-label={`Delete ${e.title}`}><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
            </div>
            {sortedMonthEvents.length === 0 && <div className="py-10 text-center text-sm text-gray-300">No health events this month.</div>}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddEvent(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#008080] to-[#00a89d] px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-sm" style={{ fontFamily: "Montserrat" }}>Add Health Calendar Event</h3>
                  <button onClick={() => setShowAddEvent(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Date of Schedule</label>
                  <div className="relative">
                    <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="date" min={todayDate} className="w-full bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080]/20" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Event Title</label>
                  <input className="w-full bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="e.g. Dengue Vaccination Drive" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Event Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setNewEvent({ ...newEvent, type: "event" })} className={`py-2 rounded-xl text-xs border-2 transition-all ${newEvent.type === "event" ? "border-[#008080] bg-[#008080]/5 text-[#008080]" : "border-gray-200 text-gray-400"}`}>Health Event</button>
                    <button onClick={() => setNewEvent({ ...newEvent, type: "closure" })} className={`py-2 rounded-xl text-xs border-2 transition-all ${newEvent.type === "closure" ? "border-rose-500 bg-rose-50 text-rose-600" : "border-gray-200 text-gray-400"}`}>Clinic Closure</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Icon</label>
                  <div className="flex gap-2">
                    {["💉", "🏥", "🩺", "🦷", "❌", "🎯"].map(icon => (
                      <button key={icon} onClick={() => setNewEvent({ ...newEvent, icon })} className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center ${newEvent.icon === icon ? "ring-2 ring-[#008080] bg-[#008080]/10" : "bg-gray-50 hover:bg-gray-100"}`}>{icon}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleAddEvent} disabled={!newEvent.date || !newEvent.title.trim() || newEvent.date < todayDate} className="w-full bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-2.5 rounded-xl text-sm disabled:opacity-40 hover:shadow-md transition-all">Add Event</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Patient Modal */}
      <AnimatePresence>
        {reviewPatient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewPatient(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#008080] to-[#00a89d] px-6 py-5 shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-sm">{reviewPatient.name.split(" ").map(n => n[0]).join("")}</div>
                    <div>
                      <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>{reviewPatient.name}</h3>
                      <p className="text-white/50 text-xs">Appointment: {reviewPatient.time} — {reviewPatient.reason}</p>
                      <p className="text-white/50 text-xs">Appointment ID: {formatApptId(reviewPatient)}</p>
                    </div>
                  </div>
                  <button onClick={() => setReviewPatient(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="space-y-2.5 text-sm">
                  <p className="text-xs text-[#008080] uppercase tracking-wider">Patient Information</p>
                  {[["Appointment ID", formatApptId(reviewPatient)], ["Preferred Date", getPreferredDate(reviewPatient)], ["Date Booked", formatDateBooked(reviewPatient)], ["Name", reviewPatient.name], ["Birthdate", reviewPatient.birthdate || "—"], ["Sex", reviewPatient.sex || "—"], ["Phone", reviewPatient.phone || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                  ))}
                  <p className="text-xs text-[#008080] uppercase tracking-wider mt-3">Chief Complaint</p>
                  <p className="text-xs text-gray-600 bg-[#FAFBFC] rounded-xl p-3">{reviewPatient.chiefComplaint || "—"}</p>
                  <p className="text-xs text-[#008080] uppercase tracking-wider mt-3">Health History</p>
                  {[["Known Allergies", reviewPatient.allergies || "None"], ["Current Medications", reviewPatient.medications || "None"], ["Pre-existing Conditions", reviewPatient.conditions || "None"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                  ))}
                </div>
                {reviewPatient.allergies && reviewPatient.allergies !== "None" && (
                  <div className="bg-rose-50 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Allergy Alert:</strong> Patient is allergic to <strong>{reviewPatient.allergies}</strong>. Ensure no conflicting medications are administered.</span>
                  </div>
                )}
                <div className="bg-[#F5F7FA] rounded-xl p-3 text-xs text-gray-400 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
                  <span>Patient health records are confidential. Handle with care per DOH data privacy guidelines.</span>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                {reviewPatient.status !== "completed" && reviewPatient.status !== "rejected" && (
                  <>
                    {reviewPatient.status === "waiting" && (
                      <button onClick={() => { updateStatus(reviewPatient.id, "in-progress"); setReviewPatient(null); }} className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Start Serving</button>
                    )}
                    <button onClick={() => { updateStatus(reviewPatient.id, "completed"); setReviewPatient(null); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Mark Complete</button>
                    <button onClick={() => openRejectPatient(reviewPatient)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl hover:bg-rose-100 transition-colors text-sm flex items-center justify-center gap-2"><X className="w-4 h-4" /> Reject</button>
                  </>
                )}
                <button onClick={() => handleDeletePatient(reviewPatient)} className="bg-rose-50 text-rose-600 py-3 px-4 rounded-xl hover:bg-rose-100 transition-colors text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Patient Modal */}
      <AnimatePresence>
        {rejectPatient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setRejectPatient(null); setRejectReason(""); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Reject Clinic Appointment</h3>
                    <p className="text-white/60 text-xs mt-0.5">{formatApptId(rejectPatient)} - {rejectPatient.name}</p>
                  </div>
                  <button onClick={() => { setRejectPatient(null); setRejectReason(""); }} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs text-rose-700">
                  This will mark the appointment as rejected and show the reason in the public clinic tracker.
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Reason for rejection</label>
                  <textarea
                    rows={5}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why this clinic appointment cannot be accepted."
                    className="w-full bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm outline-none resize-none border border-gray-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setRejectPatient(null); setRejectReason(""); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                  <button onClick={submitRejectPatient} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl hover:shadow-lg transition-all text-sm">Reject Appointment</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
