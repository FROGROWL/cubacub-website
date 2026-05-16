/**
 * ============================================================================
 * SHARED LOST & FOUND DATA STORE
 * ============================================================================
 * Manages lost & found items shared between the public page and Report Handler.
 *
 * USED BY:
 * - ReportHandler.tsx (full CRUD — view, add, update status)
 * - LandingPage.tsx > LostFoundSection (read-only public view + submit new)
 *
 * DJANGO REPLACEMENT:
 * Replace ALL functions with API calls to /api/lost-found/:
 *   getLostFoundItems()    → GET   /api/lost-found/
 *   addLostFoundItem()     → POST  /api/lost-found/  (public, no auth)
 *   updateLostFoundStatus() → PATCH /api/lost-found/<id>/ (auth required)
 *   addLostFoundByHandler() → POST  /api/lost-found/  (auth required)
 *
 * See /src/app/api/services.ts for ready-to-use API function signatures.
 * ============================================================================
 */
// Shared Lost & Found Data Store
export interface LostFoundItem {
  id: string;
  type: "lost" | "found";
  reporterName: string;
  reporterPhone: string;
  reporterId: string; // anonymous-friendly ID
  isAnonymous: boolean;
  itemName: string;
  description: string;
  category: string;
  location: string;
  dateReported: string;
  dateOfIncident: string;
  image?: string;
  status: "pending" | "investigating" | "solved" | "canceled";
  handlerNotes?: string;
}

const STORAGE_KEY = "civicflow_lost_found";

const MOCK_ITEMS: LostFoundItem[] = [
  {
    id: "LF-001", type: "lost", reporterName: "Anonymous", reporterPhone: "", reporterId: "ANON-7842",
    isAnonymous: true, itemName: "Brown Leather Wallet", description: "Brown leather wallet with Philippine National ID and BDO ATM card inside. Lost somewhere along Rizal Street near the sari-sari store.",
    category: "Personal Belongings", location: "Rizal Street, Purok 3", dateReported: "2026-03-28", dateOfIncident: "2026-03-27",
    status: "investigating", handlerNotes: "Checking CCTV footage from nearby establishments."
  },
  {
    id: "LF-002", type: "found", reporterName: "Maria Santos", reporterPhone: "09171234567", reporterId: "RPT-3291",
    isAnonymous: false, itemName: "Orange Tabby Cat", description: "Found an orange tabby cat with a blue collar near the barangay hall. Appears well-fed and domesticated. No name tag.",
    category: "Pets / Animals", location: "Near Barangay Hall", dateReported: "2026-03-27", dateOfIncident: "2026-03-27",
    status: "pending"
  },
  {
    id: "LF-003", type: "lost", reporterName: "Juan Reyes", reporterPhone: "09281234567", reporterId: "RPT-5513",
    isAnonymous: false, itemName: "Samsung Galaxy A54", description: "Black Samsung Galaxy A54 with cracked screen protector. Last seen at the basketball court in Purok 5. Has a green phone case.",
    category: "Electronics", location: "Basketball Court, Purok 5", dateReported: "2026-03-26", dateOfIncident: "2026-03-25",
    status: "solved", handlerNotes: "Phone found by maintenance staff and returned to owner on March 27."
  },
  {
    id: "LF-004", type: "lost", reporterName: "Anonymous", reporterPhone: "", reporterId: "ANON-1156",
    isAnonymous: true, itemName: "Gold Necklace with Cross Pendant", description: "18k gold necklace with small cross pendant. Sentimental value — family heirloom. Possibly lost near Cubacub Chapel during Sunday mass.",
    category: "Jewelry", location: "Cubacub Chapel area", dateReported: "2026-03-25", dateOfIncident: "2026-03-24",
    status: "investigating"
  },
  {
    id: "LF-005", type: "found", reporterName: "Pedro Garcia", reporterPhone: "09361234567", reporterId: "RPT-8874",
    isAnonymous: false, itemName: "Child's School Bag (Blue)", description: "Blue Jansport backpack found at the waiting area of the health center. Contains school notebooks and a pencil case. Name 'Angela' written on one notebook.",
    category: "Personal Belongings", location: "Health Center Waiting Area", dateReported: "2026-03-24", dateOfIncident: "2026-03-24",
    status: "pending"
  },
];

export function getLostFoundItems(): LostFoundItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ITEMS));
  return MOCK_ITEMS;
}

export function addLostFoundItem(item: Omit<LostFoundItem, "id" | "reporterId" | "dateReported" | "status">): LostFoundItem {
  const items = getLostFoundItems();
  const newItem: LostFoundItem = {
    ...item,
    id: `LF-${String(items.length + 1).padStart(3, "0")}`,
    reporterId: item.isAnonymous ? `ANON-${Math.floor(1000 + Math.random() * 9000)}` : `RPT-${Math.floor(1000 + Math.random() * 9000)}`,
    dateReported: new Date().toISOString().split("T")[0],
    status: "pending",
  };
  items.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return newItem;
}

export function updateLostFoundStatus(id: string, status: LostFoundItem["status"], notes?: string): void {
  const items = getLostFoundItems().map(i =>
    i.id === id ? { ...i, status, handlerNotes: notes || i.handlerNotes } : i
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addLostFoundByHandler(item: Omit<LostFoundItem, "id" | "dateReported">): LostFoundItem {
  const items = getLostFoundItems();
  const newItem: LostFoundItem = {
    ...item,
    id: `LF-${String(items.length + 1).padStart(3, "0")}`,
    dateReported: new Date().toISOString().split("T")[0],
  };
  items.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return newItem;
}