/**
 * ============================================================================
 * Copyright (c) 2026 Martin James Anog. All Rights Reserved.
 * Project:  Barangay Cubacub Civic-Flow
 * Author:   Martin James Anog (@Develofer1)
 * Contact:  martin.anog187@gmail.com
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying, distribution, or modification of this file,
 * via any medium, is strictly prohibited.
 * See the LICENSE file in the project root for full terms.
 * ============================================================================
 * CIVIC-FLOW API SERVICE LAYER — SINGLE SOURCE OF TRUTH
 * ============================================================================
 *
 * PURPOSE:
 * This file is the ONLY place where data operations happen.
 * ALL components import from HERE. No component has its own mock data.
 *
 * HOW TO CONNECT TO DJANGO:
 * 1. Replace each function body with a fetch() call to your Django REST API
 * 2. The function signatures (inputs/outputs) stay EXACTLY the same
 * 3. Components don't need to change AT ALL — they just call these functions
 *
 * EXAMPLE - Converting getDocumentRequests() to Django:
 *
 *   BEFORE (localStorage):
 *     export async function getDocumentRequests() {
 *       return getOrSeed("civicflow_documents", MOCK_DOCUMENTS);
 *     }
 *
 *   AFTER (Django REST API):
 *     export async function getDocumentRequests() {
 *       return apiFetch("/documents/");
 *     }
 *
 * DJANGO URL PATTERNS (for your urls.py):
 *   /auth/login/                  POST   - Login, returns token
 *   /auth/refresh/                POST   - Refresh access token
 *   /api/documents/               GET    - List all document requests
 *   /api/documents/               POST   - Create new document request
 *   /api/documents/<id>/          PATCH  - Update status
 *   /api/documents/public-request/ POST  - Public form (no auth)
 *   /api/doc-cases/               GET    - List document case history
 *   /api/incidents/               GET    - List incidents/reports
 *   /api/incidents/               POST   - Create incident
 *   /api/incidents/<id>/          PATCH  - Update incident status
 *   /api/incidents/public-report/ POST   - Public form (no auth)
 *   /api/cases/                   GET    - List case records
 *   /api/cases/                   POST   - Create case
 *   /api/cases/<id>/              PATCH  - Update case status
 *   /api/patients/                GET    - List patient queue
 *   /api/patients/                POST   - Add patient
 *   /api/patients/<id>/           PATCH  - Update patient status
 *   /api/projects/                GET    - List projects
 *   /api/projects/                POST   - Create project
 *   /api/projects/<id>/           PUT    - Update project
 *   /api/projects/<id>/           DELETE - Delete project
 *   /api/staff/                   GET    - List staff accounts
 *   /api/staff/                   POST   - Create staff
 *   /api/staff/<id>/              PUT    - Update staff
 *   /api/staff/<id>/              DELETE - Delete staff
 *   /api/events/                  GET    - List calendar events
 *   /api/events/                  POST   - Create event
 *   /api/events/<id>/             DELETE - Delete event
 *   /api/lost-found/              GET    - List lost & found items
 *   /api/lost-found/              POST   - Create item
 *   /api/lost-found/<id>/         PATCH  - Update item status
 *   /api/audit-log/               GET    - List audit trail entries
 *   /api/audit-log/               POST   - Create audit entry (usually via Django signal)
 *   /api/analytics/summary/       GET    - Get analytics summary counts
 *   /api/analytics/monthly-spending/ GET - Monthly spending data (Treasurer chart)
 *   /api/analytics/budget-summary/   GET - Budget by category + quarterly (Finance page)
 *   /api/projects/public/         GET    - List projects with milestones (public, no auth)
 *   /api/settings/                GET    - Get system settings
 *   /api/settings/                PATCH  - Update system settings
 *   /api/auth/profile/            GET    - Get current user's profile
 *   /api/auth/profile/            PATCH  - Update current user's profile
 *   /api/documents/track/         GET    - Public document status lookup (no auth, ?id=BRG-001)
 *   /api/patients/booked-slots/   GET    - Booked clinic slots for a date (no auth, ?date=YYYY-MM-DD)
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

/** DJANGO: Change VITE_API_BASE_URL if your backend is not on localhost:8000 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}
export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem("auth_token", data.access);
  return data.access;
}
/** Authenticated fetch helper — use for ALL Django API calls */
export async function apiFetch(path: string, options: RequestInit = {}) {
  let token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(`Network error while calling ${path}`);
  }

  // If token expired, try refresh once
  if (response.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      const retryHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      });
    } else if (headers.Authorization) {
      // Refresh failed: drop auth and retry once for public endpoints.
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      const retryHeaders = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errorData = await response.clone().json();
      detail = errorData?.detail || errorData?.error || JSON.stringify(errorData);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`API error ${response.status} for ${path}${detail ? `: ${detail}` : ""}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}


// ---------------------------------------------------------------------------
// HELPER: localStorage with auto-seeding
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// AUTHENTICATION
// ---------------------------------------------------------------------------


export interface AuthUser {
  username: string;
  name: string;
  role: string;
  token?: string;
}

/** DJANGO: POST /auth/login/ */
export async function login(username: string, password: string) {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("role");
  localStorage.removeItem("userName");

  const data = await apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), password }),
  });

  if (data?.access && data?.refresh) {
    localStorage.setItem("auth_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    // Fetch user profile separately
    const profile = await apiFetch("/api/me/");
    if (!profile?.role) {
      throw new Error("Login succeeded but profile did not include a role.");
    }

    localStorage.setItem("role", profile.role);
    localStorage.setItem("userName", profile.name || profile.username || username.trim());

    return { ...profile, token: data.access };
  }

  return null;
}


export async function logout(): Promise<void> {
  localStorage.removeItem("role");
  localStorage.removeItem("userName");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
}

export function getCurrentUser(): { role: string; name: string } | null {
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("userName");
  if (!role) return null;
  return { role, name: name || "Staff" };
}

// ---------------------------------------------------------------------------
// DOCUMENT REQUESTS
// ---------------------------------------------------------------------------

export interface DocRequest {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  history: string;
  address?: string;
  phone?: string;
  email?: string;
  purpose?: string;
  civilStatus?: string;
  sex?: string;
  birthdate?: string;
  validId?: string;
  validIdNo?: string;
  payment?: string;
  idPhoto?: string;
  selfiePhoto?: string;
  gcashProof?: string;
  yearsResiding?: string;
  notes?: string;
  rejectionReason?: string;
  statusUpdatedAt?: string | null;
  requirements?: Record<string, string>;
  copies?: string;
  pickupDeadline?: string;
}

/** DJANGO: GET /api/documents/ */
export async function getDocumentRequests(): Promise<DocRequest[]> {
  return apiFetch("/api/documents/");
}

/** DJANGO: POST /api/documents/ */
export async function createDocumentRequest(
  doc: Omit<DocRequest, "id">
): Promise<DocRequest> {
  return apiFetch("/api/documents/", {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

/** DJANGO: PATCH /api/documents/<id>/ */
export async function updateDocumentStatus(
  id: string,
  status: string,
  rejectionReason?: string
): Promise<void> {
  const payload: Partial<DocRequest> = { status };

  if (status === "rejected") {
    payload.rejectionReason = rejectionReason || "";
  }

  // If you want Django to calculate deadlines, just send status.
  // If you want to keep the 5‑day pickup deadline logic client‑side:
  if (status === "ready_to_pickup") {
    payload.pickupDeadline = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString().split("T")[0];
  }

  await apiFetch(`/api/documents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DJANGO: DELETE /api/documents/<id>/ */
export async function deleteDocumentRequest(id: string): Promise<void> {
  await apiFetch(`/api/documents/${id}/`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// DOCUMENT CASE HISTORY (for Document Handler verification)
// ---------------------------------------------------------------------------

export interface DocCaseRecord {
  id: string; name: string; type: string; date: string;
  status: "cleared" | "flagged" | "under_review";
  details: string; requestId: string;
}

/** DJANGO: GET /api/doc-cases/ */
export async function getDocCases(): Promise<DocCaseRecord[]> {
  return apiFetch("/api/doc-cases/");
}

// ---------------------------------------------------------------------------
// INCIDENTS / REPORTS
// ---------------------------------------------------------------------------

export interface Incident {
  id: string;
  reporter_name: string;
  is_anonymous: boolean;
  category: string;
  subcategory?: string;
  details: string;
  incident_date: string;
  status: "new" | "investigating" | "resolved";
  location: string;
  priority: "low" | "medium" | "high";
  incident_time?: string;
  landmark?: string;
  suspect_name?: string;
  suspect_description?: string;
  urgency?: "Low" | "Medium" | "High" | "Critical";
  evidence_photo_count?: number;
  evidence_photos?: string[];
  victims_involved?: string;
  reporter_phone?: string;
  reporter_relation?: "Victim" | "Witness" | "Concerned Neighbor";
  source?: "staff" | "public";
  handled_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** DJANGO: GET /api/incidents/ */
export async function getIncidents(): Promise<Incident[]> {
  return apiFetch("/api/incidents/");
}

/** DJANGO: POST /api/incidents/ */
export async function createIncident(
  incident: Omit<Incident, "id">
): Promise<Incident> {
  return apiFetch("/api/incidents/", {
    method: "POST",
    body: JSON.stringify(incident),
  });
}

/** DJANGO: PATCH /api/incidents/<id>/ */
export async function updateIncidentStatus(
  id: string,
  status: string
): Promise<void> {
  await apiFetch(`/api/incidents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** DJANGO: DELETE /api/incidents/<id>/ */
export async function deleteIncident(id: string): Promise<void> {
  await apiFetch(`/api/incidents/${id}/`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// CASE MANAGEMENT (Report Handler — formal legal cases)
// ---------------------------------------------------------------------------

export interface CaseRecord {
  id: string;
  subject_name: string;
  crime_description: string;
  case_date: string;
  status: "open" | "investigating" | "resolved" | "closed";
  details?: string;
  location?: string;
  charges?: string;
  penalty?: string;
  complainant?: string;
  respondent?: string;
  date_resolved?: string;
  mediator?: string;
  remarks?: string;
  handled_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** DJANGO: GET /api/cases/ */
export async function getCases(): Promise<CaseRecord[]> {
  return apiFetch("/api/cases/");
}

/** DJANGO: POST /api/cases/ */
export async function createCase(
  caseData: Omit<CaseRecord, "id" | "case_date" | "created_at" | "updated_at">
): Promise<CaseRecord> {
  return apiFetch("/api/cases/", {
    method: "POST",
    body: JSON.stringify(caseData),
  });
}

/** DJANGO: PATCH /api/cases/<id>/ */
export async function updateCaseStatus(
  id: string,
  status: CaseRecord["status"]
): Promise<void> {
  await apiFetch(`/api/cases/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** DJANGO: DELETE /api/cases/<id>/ */
export async function deleteCase(id: string): Promise<void> {
  await apiFetch(`/api/cases/${id}/`, {
    method: "DELETE",
  });
}


// ---------------------------------------------------------------------------
// CLINIC / PATIENTS
// ---------------------------------------------------------------------------

export interface Patient {
  id: number;
  name: string;
  time: string;
  reason: string;
  status: string;
  appointmentId?: string;
  appointment_id?: string;
  dateBooked?: string;
  date_booked?: string;
  created_at?: string;
  phone?: string;
  birthdate?: string;
  sex?: string;
  chiefComplaint?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;
  queueDate?: string; // DJANGO: maps to queue_date in patient_queue table
  queue_date?: string;
}

/** DJANGO: GET /api/patients/ */
export async function getPatientQueue(): Promise<Patient[]> {
  return apiFetch("/api/patients/");
}

/** DJANGO: POST /api/patients/ */
export async function addPatient(
  patient: Omit<Patient, "id">
): Promise<Patient> {
  return apiFetch("/api/patients/", {
    method: "POST",
    body: JSON.stringify(patient),
  });
}

/** DJANGO: PATCH /api/patients/<id>/ */
export async function updatePatientStatus(
  id: number,
  status: string
): Promise<void> {
  await apiFetch(`/api/patients/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** DJANGO: DELETE /api/patients/<id>/ */
export async function deletePatient(id: number): Promise<void> {
  await apiFetch(`/api/patients/${id}/`, {
    method: "DELETE",
  });
}

export interface ClinicUnavailableSlot {
  id: number;
  date: string;
  time: string;
  reason?: string;
  created_at?: string;
}

export async function getClinicUnavailableSlots(date?: string): Promise<ClinicUnavailableSlot[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch(`/api/clinic/unavailable-slots/${query}`);
}

export async function createClinicUnavailableSlot(slot: {
  date: string;
  time: string;
  reason?: string;
}): Promise<ClinicUnavailableSlot> {
  return apiFetch("/api/clinic/unavailable-slots/", {
    method: "POST",
    body: JSON.stringify(slot),
  });
}

export async function deleteClinicUnavailableSlot(id: number): Promise<void> {
  await apiFetch(`/api/clinic/unavailable-slots/${id}/`, {
    method: "DELETE",
  });
}


// ---------------------------------------------------------------------------
// TREASURER / PROJECTS
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  status: "completed" | "ongoing" | "upcoming";
  budget: number;
  spent: number;
  progress: number;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  contractor: string;
  source: string;
  category: string;
  images?: string[];
  milestones?: ProjectMilestone[];
  createdAt?: string;
  updatedAt?: string;
  lastUpdatedByName?: string | null;
  statusUpdatedAt?: string | null;
  statusUpdatedByName?: string | null;
}

function normalizeProject(row: any): Project {
  return {
    ...row,
    budget: Number(row?.budget ?? 0),
    spent: Number(row?.spent ?? 0),
    progress: Number(row?.progress ?? 0),
    milestones: Array.isArray(row?.milestones) ? row.milestones : [],
  } as Project;
}

export interface ProjectQuery {
  status?: "all" | Project["status"];
  category?: string;
  contractor?: string;
  search?: string;
  minBudget?: number;
  maxBudget?: number;
  startDateFrom?: string;
  endDateTo?: string;
  sortBy?: "name" | "budget" | "spent" | "progress" | "startDate" | "endDate" | "status" | "category" | "updatedAt" | "createdAt";
  sortDirection?: "asc" | "desc";
}

/** DJANGO: GET /api/projects/ */
export async function getProjects(query?: ProjectQuery): Promise<Project[]> {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }
  const qs = params.toString();
  const rows = await apiFetch(`/api/projects/${qs ? `?${qs}` : ""}`);
  return (rows || []).map(normalizeProject);
}

/** DJANGO: POST /api/projects/ */
export async function createProject(
  project: Omit<Project, "id">
): Promise<Project> {
  const row = await apiFetch("/api/projects/", {
    method: "POST",
    body: JSON.stringify(project),
  });
  return normalizeProject(row);
}

/** DJANGO: PUT /api/projects/<id>/ */
export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  await apiFetch(`/api/projects/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** DJANGO: DELETE /api/projects/<id>/ */
export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/api/projects/${id}/`, {
    method: "DELETE",
  });
}


// ---------------------------------------------------------------------------
// STAFF ACCOUNTS (Super Admin)
// ---------------------------------------------------------------------------

export interface StaffAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  is_online: boolean;
  phone?: string;
  email?: string;
  address?: string;
  birthdate?: string;
  sex?: string;
}

/** DJANGO: GET /api/staff/ */
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const data = await apiFetch("/api/staff/");
  return data.results || data; // unwrap if paginated
}

// For frontend forms, extend with password
export type StaffAccountForm = Partial<StaffAccount> & { password?: string };

/** DJANGO: POST /api/staff/ */
export async function createStaffAccount(staff: Omit<StaffAccount, "id"> & { password: string }): Promise<StaffAccount> {
  return apiFetch("/api/staff/", {
    method: "POST",
    body: JSON.stringify(staff),
  });
}

/** DJANGO: PUT /api/staff/<id>/ */
export async function updateStaffAccount(
  id: string,
  data: Partial<StaffAccount>
): Promise<void> {
  await apiFetch(`/api/staff/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** DJANGO: DELETE /api/staff/<id>/ */
export async function deleteStaffAccount(
  id: string
): Promise<void> {
  await apiFetch(`/api/staff/${id}/`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// CALENDAR EVENTS (Shared across all dashboards)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  color: string;
  source: string;
  icon?: string;
  type?: "event" | "closure";
}

/** DJANGO: GET /api/events/ */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return apiFetch("/api/events/");
}

/** DJANGO: POST /api/events/ */
export async function createCalendarEvent(
  event: Omit<CalendarEvent, "id">
): Promise<CalendarEvent> {
  const newEvent = await apiFetch("/api/events/", {
    method: "POST",
    body: JSON.stringify(event),
  });

  // Optional: trigger a UI update event if your frontend listens for it
  window.dispatchEvent(new CustomEvent("calendarUpdate"));

  return newEvent;
}

/** DJANGO: DELETE /api/events/<id>/ */
export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch(`/api/events/${id}/`, {
    method: "DELETE",
  });

  // Optional: trigger a UI update event if your frontend listens for it
  window.dispatchEvent(new CustomEvent("calendarUpdate"));
}


// ---------------------------------------------------------------------------
// LOST & FOUND
// ---------------------------------------------------------------------------

export interface LostFoundItem {
  id: string;
  item_type: "lost" | "found";
  reporter_name?: string;
  reporter_phone?: string;
  reporter_id: string;
  is_anonymous: boolean;
  item_name: string;
  description?: string;
  category?: string;
  location?: string;
  date_reported: string;
  date_of_incident?: string;
  image_url?: string;
  landmark?: string;
  person_involved?: string;
  victims_involved?: string;
  reporter_relation?: "Victim" | "Witness" | "Concerned Neighbor" | "Barangay Official" | "Other";
  status: "pending" | "post" | "resolved" | "solved" | "canceled";
  handler_notes?: string;
  handled_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** DJANGO: GET /api/lost-found/ */
export async function getLostFoundItems(): Promise<LostFoundItem[]> {
  return apiFetch("/api/lost-found/");
}

/** DJANGO: POST /api/lost-found/ (public, no auth) */
export async function createLostFoundItem(
  item: Omit<LostFoundItem, "reporter_id" | "status" | "date_reported" | "created_at" | "updated_at"> & {
    id?: string;
    reporter_id?: string;
    status?: LostFoundItem["status"];
  }
): Promise<LostFoundItem> {
  return apiFetch("/api/lost-found/", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

/** DJANGO: POST /api/lost-found/ (handler, with auth) */
export async function createLostFoundByHandler(
  item: Omit<LostFoundItem, "id" | "date_reported" | "created_at" | "updated_at">
): Promise<LostFoundItem> {
  return apiFetch("/api/lost-found/", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

/** DJANGO: PATCH /api/lost-found/<id>/ */
export async function updateLostFoundStatus(
  id: string,
  status: LostFoundItem["status"],
  notes?: string
): Promise<void> {
  await apiFetch(`/api/lost-found/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status, handler_notes: notes }),
  });
}

/** DJANGO: DELETE /api/lost-found/<id>/ */
export async function deleteLostFoundItem(id: string): Promise<void> {
  await apiFetch(`/api/lost-found/${id}/`, {
    method: "DELETE",
  });
}


// ---------------------------------------------------------------------------
// AUDIT LOG (Super Admin)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id?: number;
  time: string;
  user: string;
  action: string;
  type: string;
}

/** DJANGO: GET /api/audit-log/ */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const rows = await apiFetch("/api/audit-log/");
  return (rows || []).map((row: any) => ({
    id: row.id,
    time: row.timestamp
      ? new Date(row.timestamp).toLocaleString("en-PH", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    user: row.user || "System",
    action: row.action || "",
    type: row.status || "info",
  }));
}

/** DJANGO: POST /api/audit-log/ */
export async function createAuditLogEntry(entry: Omit<AuditLogEntry, "id">): Promise<AuditLogEntry> {
  const row = await apiFetch("/api/audit-log/", {
    method: "POST",
    body: JSON.stringify({ action: entry.action, status: entry.type || "info" }),
  });
  return {
    id: row?.id,
    time: row?.timestamp
      ? new Date(row.timestamp).toLocaleString("en-PH", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : entry.time,
    user: row?.user || entry.user || "System",
    action: row?.action || entry.action,
    type: row?.status || entry.type || "info",
  };
}


// ---------------------------------------------------------------------------
// ANALYTICS (Super Admin)
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  serviceVolume: { label: string; value: number; color: string }[];
  documentBreakdown: { name: string; value: number; fill: string }[];
  total_staff: number;
  online_staff: number;
  role_distribution: { role: string; count: number }[];
  audit_actions: { action: string; count: number }[];
  audit_status: { status: string; count: number }[];
}

export async function pingActivity(): Promise<void> {
  await apiFetch("/api/ping/", { method: "POST" });
}

export interface PublicLandingStats {
  documents: number;
  clinic: number;
  case_management: number;
  document_refund: number;
  lost_found: number;
  total_projects: number;
  residents_served: number;
  clinic_status: string;
}

export interface PublicWeather {
  location: string;
  temperature: number | null;
  condition: string;
  high: number | null;
  low: number | null;
  precipitation: number | null;
  source: string;
  source_url: string;
}

/** DJANGO: GET /api/superadmin/summary/ */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return apiFetch("/api/superadmin/summary/");
}

/** DJANGO: GET /api/public/landing-stats/ */
export async function getPublicLandingStats(): Promise<PublicLandingStats> {
  return apiFetch("/api/public/landing-stats/");
}

/** DJANGO: GET /api/public/weather/ */
export async function getPublicWeather(): Promise<PublicWeather> {
  return apiFetch("/api/public/weather/");
}

/** DJANGO: GET /api/analytics/monthly-spending/ */
export async function getAnalyticsMonthlySpending(): Promise<MonthlySpending[]> {
  return apiFetch("/api/analytics/monthly-spending/");
}


/** DJANGO: GET /api/analytics/budget-summary/ */
export async function getAnalyticsBudgetSummary(): Promise<BudgetSummary> {
  return apiFetch("/api/analytics/budget-summary/");
}


// ---------------------------------------------------------------------------
// PUBLIC FORM SUBMISSIONS
// ---------------------------------------------------------------------------

/** DJANGO: POST /api/documents/public-request/ (no auth) */
export async function submitPublicDocumentRequest(data: {
  name: string;
  type: string;
  address: string;
  phone: string;
  yearsResiding?: string;
  purpose: string;
  civilStatus: string;
  sex: string;
  birthdate: string;
  validId: string;
  validIdNo: string;
  payment: string;
  copies: string;
  email?: string;
  idPhoto?: string;
  selfiePhoto?: string;
  gcashProof?: string;
  requirements?: Record<string, string>;
  notes?: string;
}): Promise<{ success: boolean; trackingId: string }> {
  return apiFetch("/api/documents/public-request/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** DJANGO: POST /api/incidents/public-report/ (no auth) */
export async function submitPublicReport(data: {
  id?: string;
  category: string;
  subcategory?: string;
  details: string;
  location: string;
  incidentDate?: string;
  incidentTime?: string;
  urgency?: string;
  reporter: string;
  reporterPhone?: string;
  reporterRelation?: string;
  isAnonymous: boolean;
  landmark?: string;
  suspectName?: string;
  suspectDesc?: string;
  victimsInvolved?: string;
  evidencePhotos?: string[];
}): Promise<{ success: boolean; trackingId: string; id?: string; report?: Incident }> {
  return apiFetch("/api/incidents/public-report/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// FINANCE TRANSPARENCY (Public page — richer project data with milestones)
// ---------------------------------------------------------------------------

export interface ProjectMilestone {
  label: string;
  date: string;
  done: boolean;
}

export interface PublicProject {
  id: string;
  name: string;
  status: "completed" | "ongoing" | "upcoming";
  budget: number;
  spent: number;
  progress: number;
  image: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  contractor: string;
  source: string;
  category: string;
  milestones: ProjectMilestone[];
}

/** DJANGO: GET /api/projects/public/ — returns projects with milestones for transparency page */
export async function getPublicProjects(): Promise<PublicProject[]> {
  const rows = await apiFetch("/api/projects/public/");
  return (rows || []).map((row: any) => ({
    ...row,
    budget: Number(row?.budget ?? 0),
    spent: Number(row?.spent ?? 0),
    progress: Number(row?.progress ?? 0),
    milestones: Array.isArray(row?.milestones) ? row.milestones : [],
  }));
}



// ---------------------------------------------------------------------------
// SYSTEM SETTINGS
// ---------------------------------------------------------------------------

export interface SystemSettings {
  annual_budget: number;
  clinic_status: string;
  pickup_deadline_days: number;
  refund_percentage: number;
}

/** DJANGO: GET /api/settings/ */
export async function getSystemSettings(): Promise<SystemSettings> {
  return apiFetch("/api/settings/");
}

/** DJANGO: PATCH /api/settings/ */
export async function updateSystemSettings(
  data: Partial<SystemSettings>
): Promise<void> {
  await apiFetch("/api/settings/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}


// ---------------------------------------------------------------------------
// MONTHLY SPENDING (Treasurer — monthly spending chart)
// ---------------------------------------------------------------------------

export interface MonthlySpending {
  month: string;
  spent: number;
}

/** DJANGO: GET /api/analytics/monthly-spending/
 *  Django view computes: SELECT month, SUM(spent) FROM monthly_service_volume GROUP BY month
 */
export async function getMonthlySpending(): Promise<MonthlySpending[]> {
  return apiFetch("/api/analytics/monthly-spending/");
}



// ---------------------------------------------------------------------------
// BUDGET SUMMARY (Finance Page — public budget breakdown)
// ---------------------------------------------------------------------------

export interface BudgetCategory {
  name: string;
  value: number;
  color: string;
  fill: string;
}

export interface QuarterlyBudget {
  quarter: string;
  budget: number;
  spent: number;
}

export interface BudgetSummary {
  categories: BudgetCategory[];
  quarterly: QuarterlyBudget[];
}

/** DJANGO: GET /api/analytics/budget-summary/
 *  No auth required — public Finance Transparency page data.
 *  Django view should aggregate project budgets by category + quarterly projections.
 */
export async function getBudgetSummary(): Promise<BudgetSummary> {
  return apiFetch("/api/analytics/budget-summary/");
}



// ---------------------------------------------------------------------------
// ADMIN PROFILE (Super Admin — own account management)
// ---------------------------------------------------------------------------

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/** DJANGO: GET /api/auth/profile/ */
export async function getAdminProfile(): Promise<AdminProfile> {
  return apiFetch("/api/profile/");
}

/** DJANGO: PATCH /api/auth/profile/ */
export async function updateAdminProfile(profile: AdminProfile): Promise<void> {
  await apiFetch("/api/profile/", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}


// ---------------------------------------------------------------------------
// AUDIT LOG — Create Entry
// ---------------------------------------------------------------------------

/** DJANGO: In production, audit entries are auto-created by Django model signals.
 *  In localStorage mode, components call this manually after each user action.
 *
 *  Django signal example (accounts/signals.py):
 *    @receiver(post_save, sender=DocumentRequest)
 *    def log_document_change(sender, instance, created, **kwargs):
 *        AuditLog.objects.create(
 *            user_name=instance.handled_by.name,
 *            action=f"{'Submitted' if created else 'Updated'} document {instance.id}",
 *            log_type="info"
 *        )
 */


// ---------------------------------------------------------------------------
// DOCUMENT TRACKING (Public — no auth required)
// ---------------------------------------------------------------------------

export interface DocumentTrackingStatus {
  found: boolean;
  id: string;
  name: string;
  type: string;
  status: string;
  date: string;
  step: number; // 0=filed, 1=under review, 2=approved/processing, 3=ready_to_pickup/unclaimed, 4=claimed, -1=rejected
  pickupDeadline?: string | null;
  statusUpdatedAt?: string | null;
  rejectionReason?: string | null;
}

/** DJANGO: GET /api/documents/track/?id=BRG-001234 (public, no auth)
 *  Returns minimal document info without exposing personal data.
 */
export async function getDocumentStatus(
  trackingId: string
): Promise<DocumentTrackingStatus | null> {
  return apiFetch(`/api/documents/track/?id=${encodeURIComponent(trackingId)}`);
}


// ---------------------------------------------------------------------------
// BOOKED CLINIC SLOTS (Public — no auth required)
// ---------------------------------------------------------------------------

/** DJANGO: GET /api/patients/booked-slots/?date=2026-04-07 (public, no auth)
 *  Returns already-booked time slots for a given date so the public booking
 *  form can disable unavailable slots in real-time.
 */
export interface ReportTrackingStatus {
  found: boolean;
  id: string;
  type: "Incident Report" | "Request Refund";
  category: string;
  subcategory?: string | null;
  status: "new" | "investigating" | "resolved";
  date: string;
  location?: string | null;
  urgency?: string | null;
  step: number;
  statusUpdatedAt?: string | null;
}

/** DJANGO: GET /api/incidents/track/?id=RPT-001 or RDF-001 (public, no auth)
 *  Tracks only incident reports and document refund requests.
 */
export async function getReportStatus(
  trackingId: string
): Promise<ReportTrackingStatus | null> {
  return apiFetch(`/api/incidents/track/?id=${encodeURIComponent(trackingId)}`);
}

export async function getBookedSlots(date: string): Promise<string[]> {
  if (!date) return [];
  return apiFetch(`/api/patients/booked-slots/?date=${encodeURIComponent(date)}`);
}

export async function getDocumentSummary() {
  return apiFetch("/api/documents/summary/");
}

export async function getReportSummary() {
  return apiFetch("/api/reports/summary/");
}

export async function getClinicSummary() {
  return apiFetch("/api/clinic/summary/");
}

export async function getTreasurerSummary() {
  return apiFetch("/api/treasurer/summary/");
}

export async function getSuperAdminSummary() {
  return apiFetch("/api/superadmin/summary/");
}

