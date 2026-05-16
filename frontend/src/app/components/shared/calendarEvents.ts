/**
 * ============================================================================
 * SHARED CALENDAR EVENTS — Cross-Dashboard Event Sync
 * ============================================================================
 * This file provides shared calendar events across ALL dashboards and the
 * public landing page. Uses localStorage for "live" sync.
 *
 * USED BY:
 * - DocumentHandler.tsx (can add/remove events)
 * - ClinicHandler.tsx (can add/remove vaccination events)
 * - LandingPage.tsx > CommunityCalendar (read-only, shows all events)
 *
 * DJANGO REPLACEMENT:
 * Replace ALL functions here with API calls to /api/events/:
 *   getSharedEvents()  → GET  /api/events/
 *   addSharedEvent()   → POST /api/events/
 *   removeSharedEvent() → DELETE /api/events/<id>/
 *
 * After switching to Django, you can remove the localStorage logic and
 * the window.dispatchEvent("calendarUpdate") calls. Instead, just refetch
 * events from the API after each add/remove operation.
 *
 * See /src/app/api/services.ts for ready-to-use API function signatures.
 * ============================================================================
 */
// Shared Calendar Events — uses localStorage for "live" sync across dashboards
export interface SharedEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  color: string;
  source: string; // which handler added it
  icon?: string;
  type?: "event" | "closure";
}

const STORAGE_KEY = "civicflow_shared_events";

const DEFAULT_EVENTS: SharedEvent[] = [
  { id: "ev-1", date: "2026-04-05", title: "Barangay Assembly", color: "bg-[#1B263B]", source: "document_handler" },
  { id: "ev-2", date: "2026-04-12", title: "Youth Sports Fest", color: "bg-[#008080]", source: "document_handler" },
  { id: "ev-3", date: "2026-04-15", title: "Fiesta Celebration", color: "bg-amber-500", source: "document_handler" },
  { id: "ev-4", date: "2026-04-20", title: "Senior Citizen Day", color: "bg-violet-500", source: "super_admin" },
  { id: "ev-5", date: "2026-04-25", title: "Council Meeting", color: "bg-[#1B263B]", source: "document_handler" },
  { id: "ev-6", date: "2026-04-03", title: "Polio Vaccination", color: "bg-[#008080]", source: "clinic_handler", icon: "💉", type: "event" },
  { id: "ev-7", date: "2026-04-10", title: "BCG Vaccination", color: "bg-[#008080]", source: "clinic_handler", icon: "💉", type: "event" },
  { id: "ev-8", date: "2026-04-17", title: "Measles Vaccination", color: "bg-[#008080]", source: "clinic_handler", icon: "🏥", type: "event" },
  { id: "ev-9", date: "2026-04-24", title: "Flu Shot Day", color: "bg-[#008080]", source: "clinic_handler", icon: "🩺", type: "event" },
];

export function getSharedEvents(): SharedEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Initialize with defaults
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EVENTS));
  return DEFAULT_EVENTS;
}

export function addSharedEvent(event: Omit<SharedEvent, "id">): SharedEvent {
  const events = getSharedEvents();
  const newEvent: SharedEvent = { ...event, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  events.push(newEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  // Dispatch storage event for other tabs/components
  window.dispatchEvent(new CustomEvent("calendarUpdate"));
  return newEvent;
}

export function removeSharedEvent(id: string): void {
  const events = getSharedEvents().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent("calendarUpdate"));
}