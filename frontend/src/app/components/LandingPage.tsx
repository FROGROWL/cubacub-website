/**
 * ============================================================================
 * LANDING PAGE — Public-Facing Homepage
 * ============================================================================
 * The main public page that citizens see. Contains multiple sections:
 */
 
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Search, Calendar, DollarSign, AlertCircle, Clock, ChevronRight, ChevronLeft, Download, X, Shield, MapPin, Phone, Mail, Users, Heart, Building, Stethoscope, ArrowRight, Sparkles, Sun, Zap, TrendingUp, MessageCircle, Star, Send, ExternalLink, Menu, CircleDot, Camera, Upload, CreditCard, Wallet, QrCode, Image as ImageIcon, AlertTriangle, ListChecks, Eye, Info, Check, Package, User } from "lucide-react";
import { useToast } from "./Toast";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  getCalendarEvents, getPublicProjects, getLostFoundItems, createLostFoundItem, submitPublicDocumentRequest, submitPublicReport, addPatient, getDocumentStatus, getReportStatus, getBookedSlots,
  getPublicLandingStats, getPublicWeather,
  type CalendarEvent, type DocumentTrackingStatus, type ReportTrackingStatus, type PublicProject, type LostFoundItem, type PublicLandingStats, type PublicWeather
} from "../api/services";

// Small helpers / placeholders
const heroImg = new URL("./images/hero.jpg", import.meta.url).href;
const logoImg = new URL("./images/logo.png", import.meta.url).href;
const projectImg = "https://images.unsplash.com/photo-1758164281460-bdd4f3bcc471?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jcmV0ZSUyMGJyaWRnZSUyMGNvbnN0cnVjdGlvbiUyMHByb2dyZXNzfGVufDF8fHx8MTc3NDY4NDM5MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const communityImg = "https://images.unsplash.com/photo-1762245832988-82c6ecf9a79f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb21tdW5pdHklMjBjZW50ZXIlMjBidWlsZGluZ3xlbnwxfHx8fDE3NzQ2ODQzOTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const formatCurrency = (value: number | string) => Number(value || 0).toLocaleString();
const normalizePhoneInput = (value: string) => value.replace(/\D/g, "").slice(0, 11);
const isValidPhilippineMobile = (value: string) => /^09\d{9}$/.test(value);
const toInputDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayInputDate = () => toInputDate();
function getStatusBadge(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "completed": return { label: "Completed", bg: "bg-emerald-600" };
    case "ongoing": return { label: "Ongoing", bg: "bg-sky-600" };
    case "paused": return { label: "Paused", bg: "bg-amber-500" };
    default: return { label: status || "Unknown", bg: "bg-gray-400" };
  }
}

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

// --- Animated Counter ---
function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const dur = 2000;
    const step = target / (dur / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

// --- Live Clock ---
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <div className="flex items-center gap-2 text-sm text-white/70">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <Clock className="w-3.5 h-3.5" />
      <span className="tabular-nums">{time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
    </div>
  );
}

// --- Weather Widget ---
function WeatherWidget() {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 text-sm text-white/80">
      <Sun className="w-4 h-4 text-amber-300" />
      <span>32°C</span>
      <span className="text-white/40">|</span>
      <span className="text-xs">Partly Cloudy</span>
    </div>
  );
}

// --- Modal Wrapper ---
function AccuWeatherWidget() {
  const accuweatherUrl = "https://www.accuweather.com/en/ph/cubacub/776048/weather-forecast/776048?type=locality&city=cubacub";
  const [weather, setWeather] = useState<PublicWeather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getPublicWeather()
      .then((data) => {
        setWeather(data);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  const sourceUrl = weather?.source_url || accuweatherUrl;
  const hasTemperature = typeof weather?.temperature === "number";

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noreferrer"
      title="Cubacub, Cebu forecast from AccuWeather"
      className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 text-sm text-white/80 hover:bg-white/15 transition-colors"
    >
      <Sun className="w-4 h-4 text-amber-300" />
      {hasTemperature ? (
        <>
          <span>{weather.temperature}&deg;C</span>
          <span className="text-white/40">|</span>
          <span className="text-xs">{weather.condition}</span>
          {weather.high !== null && weather.low !== null && (
            <>
              <span className="hidden xl:inline text-white/40">|</span>
              <span className="hidden xl:inline text-xs text-white/60">H {weather.high}&deg; L {weather.low}&deg;</span>
            </>
          )}
        </>
      ) : (
        <span className="text-xs">{failed ? "View AccuWeather" : "Loading forecast..."}</span>
      )}
    </a>
  );
}

function ModalWrap({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

// --- Input component ---
function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <input {...props} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 focus:bg-white transition-all outline-none" />
    </div>
  );
}

// --- Select component ---
function Select({ label, required, children, ...props }: { label: string; required?: boolean; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className={`text-xs tracking-wide uppercase mb-1.5 block ${props.disabled ? "text-gray-300" : "text-gray-500"}`}>{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <select {...props} className={`w-full border-0 rounded-xl px-4 py-3 text-sm outline-none ${props.disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60" : "bg-[#F5F7FA] focus:ring-2 focus:ring-[#008080]/30"}`}>{children}</select>
    </div>
  );
}

// --- Textarea component ---
function Textarea({ label, required, ...props }: { label: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <textarea {...props} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-[#008080]/30 outline-none" />
    </div>
  );
}

// --- Requirement File Uploader (image or PDF) ---
function RequirementFileUploader({
  reqLabel, reqNote, index, value, onChange,
}: { reqLabel: string; reqNote: string; index: number; value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  };
  const isPdf = value.startsWith("data:application/pdf");
  const isImage = value.startsWith("data:image");
  const hasValue = Boolean(value);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className={`px-4 py-3 flex items-center gap-3 border-b ${hasValue ? "bg-emerald-50 border-emerald-100" : "bg-[#F5F7FA] border-gray-100"}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs shadow-sm ${hasValue ? "bg-emerald-500 text-white" : "bg-[#008080] text-white"}`} style={{ fontFamily: "Montserrat", fontWeight: 700 }}>
          {hasValue ? <Check className="w-3 h-3" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#1B263B]" style={{ fontWeight: 600 }}>{reqLabel}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{reqNote}</p>
        </div>
        {hasValue && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0" style={{ fontWeight: 600 }}>Uploaded ✓</span>}
      </div>
      <div className="p-3 bg-white">
        {hasValue ? (
          isImage ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={value} alt={reqLabel} className="w-full h-32 object-cover" />
              <button onClick={() => { onChange(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[10px] py-1.5 px-3 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-300" /> Document looks clear
              </div>
            </div>
          ) : isPdf ? (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700" style={{ fontWeight: 600 }}>PDF Uploaded</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Ensure the document is complete and readable</p>
              </div>
              <a href={value} target="_blank" rel="noreferrer" className="text-[10px] text-rose-500 hover:underline">Open PDF</a>
              <button onClick={() => { onChange(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          ) : null
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-[#008080]/50 hover:bg-[#008080]/5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-[#008080]/10 flex items-center justify-center transition-colors">
                <Camera className="w-4 h-4 text-gray-400 group-hover:text-[#008080] transition-colors" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-[#008080]/10 flex items-center justify-center transition-colors">
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#008080] transition-colors" />
              </div>
            </div>
            <span className="text-xs text-gray-500 group-hover:text-[#008080] transition-colors">Tap to upload photo or PDF</span>
            <span className="text-[10px] text-gray-300">JPG · PNG · PDF accepted</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleFile} />
      </div>
    </div>
  );
}

// --- Image Upload component ---
function ImageUploader({ label, required, value, onChange, hint, acceptPdf }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; hint?: string; acceptPdf?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isPdf = acceptPdf && f.type === "application/pdf";
    if (!isImage && !isPdf) {
      setError(acceptPdf ? "Only image or PDF files are allowed." : "Only image files are allowed.");
      if (ref.current) ref.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  };

  const isPdfValue = Boolean(value && value.startsWith?.("data:application/pdf"));

  return (
    <div>
      <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <input ref={ref} type="file" accept={acceptPdf ? "image/*,application/pdf" : "image/*"} className="sr-only" onChange={handleFile} />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#008080]/30 bg-[#F5F7FA]">
          {isPdfValue ? (
            <div className="w-full h-32 flex flex-col items-center justify-center gap-2">
              <FileText className="w-6 h-6 text-rose-400" />
              <a href={value} target="_blank" rel="noreferrer" className="text-[10px] text-rose-500 hover:underline">Open PDF</a>
            </div>
          ) : (
            <img src={value} alt={label} className="w-full h-32 object-cover" />
          )}
          <button onClick={() => { onChange(""); setError(""); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
          <button type="button" onClick={() => ref.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-[#008080]/50 hover:bg-[#008080]/5 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-[#008080]/10 flex items-center justify-center transition-colors">
              <Camera className="w-4 h-4 text-gray-400 group-hover:text-[#008080] transition-colors" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-[#008080]/10 flex items-center justify-center transition-colors">
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#008080] transition-colors" />
            </div>
          </div>
          <span className="text-xs text-gray-500 group-hover:text-[#008080] transition-colors">Tap to upload photo or PDF</span>
          <span className="text-[10px] text-gray-300">JPG · PNG · PDF accepted</span>
        </button>
      )}
    </div>
  );

}

const DOC_PRICING: Record<string, number> = {
    "First-Time Jobseeker Certification": 0,
    "Cedula (Community Tax Certificate)": 20,
    "Barangay ID": 50,
    "Certificate of No Income": 50,
    "Certificate of Late Registration": 100,
    "Barangay Protection Order": 0,
  };

  const DOC_REQUIREMENTS: Record<string, { label: string; note: string }[]> = {
    "Barangay Clearance": [
      { label: "1×1 or 2×2 Photo", note: "Recent, white background" },
    ],
    "Certificate of Residency": [
      { label: "Proof of Residence", note: "Utility bill, lease contract, or land title" },
    ],
    "Certificate of Indigency": [
      { label: "Proof of Residency", note: "Must be a resident of the barangay" },
      { label: "Supporting Documents", note: "Depending on purpose — medical abstract, school enrollment form, etc." },
    ],
    "Business Clearance / Permit": [
      { label: "DTI Business Name Registration", note: "For sole proprietorship" },
      { label: "SEC Registration", note: "For corporations/partnerships" },
      { label: "Valid Government ID", note: "Owner or authorized representative" },
      { label: "Lease Contract or Land Title", note: "Proof of business location" },
      { label: "Sketch or Location Map", note: "Some barangays require this" },
      { label: "Cedula (Community Tax Certificate)", note: "Required for all applicants" },
    ],
    "First-Time Jobseeker Certification": [
      { label: "Proof of Residency", note: "Must be a resident for at least 6 months" },
      { label: "Proof of Education / Training", note: "Diploma, TOR, or certificate of completion" },
      { label: "Signed Oath of Undertaking", note: "Form provided at the barangay hall" },
    ],
    "Certificate of Good Moral Character": [
      { label: "Cedula (Community Tax Certificate)", note: "Must be current year" },
      { label: "Barangay Clearance", note: "Some barangays require this first" },
      { label: "1×1 or 2×2 Photo", note: "Recent, white background" },
    ],
    "Cedula (Community Tax Certificate)": [
      { label: "Proof of Income", note: "For employed individuals — payslip, ITR, or employer certificate" },
      { label: "Business Permit", note: "For business owners" },
      { label: "Real Property Tax Receipt", note: "For property owners" },
    ],
  };
  const DOC_INFO: Record<string, string> = {
    "Barangay Clearance": "Requires a valid government-issued ID, 1×1 or 2×2 photo (white background), and must be a resident of the barangay. Used for employment, travel, or legal transactions.",
    "Certificate of Residency": "Requires proof of residence such as utility bill, lease contract, or land title. Must have been residing in the barangay for at least 6 months.",
    "Certificate of Indigency": "Requires proof of residency and supporting documents depending on purpose (medical abstract for medical assistance, enrollment form for education). Must be verified as indigent by the barangay.",
    "Certificate of Good Moral Character": "Requires Cedula (current year), Barangay Clearance, and 1×1 or 2×2 photo. Commonly needed for employment, scholarship, or school applications.",
    "Business Clearance / Permit": "Requires DTI registration (sole proprietorship) or SEC registration (corporation), valid government ID, lease contract or land title of business location, sketch/location map, and Cedula.",
    "First-Time Jobseeker Certification": "Must be a resident for at least 6 months and a first-time job seeker. Requires proof of education (diploma, TOR) and a signed Oath of Undertaking form available at the barangay hall. Valid only once per individual.",
    "Cedula (Community Tax Certificate)": "Required documents depend on your category: Employed individuals need proof of income (payslip/ITR); Business owners need their business permit; Property owners need the latest real property tax receipt.",
    "Barangay ID": "Requires a valid government-issued ID and proof of residency. Must be a current resident of the barangay. Processing typically takes 1-2 days.",
    "Certificate of No Income": "Requires an affidavit of no income or certification from the barangay captain. Used for loan applications, social welfare assistance, and similar purposes.",
    "Certificate of Late Registration": "Requires supporting documents for the late registration (birth, death, or marriage). Fees vary. Must coordinate with the local civil registrar.",
    "Barangay Protection Order": "Filed by a victim of domestic violence or abuse. Free of charge. Must provide a sworn statement of facts. Immediate issuance within the same day.",
  };

function DocumentRequestForm({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    lastName: "", firstName: "", middleName: "", suffix: "", birthdate: "", sex: "Male",
    houseNo: "", street: "", sitio: "", phone: "", email: "", docType: "Barangay Clearance", numCopies: "1",
    purpose: "", validIdType: "", validIdNo: "", notes: "",
  });
  const u = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const fullName = `${form.firstName || ""} ${form.middleName ? form.middleName + " " : ""}${form.lastName || ""}`.trim();
  const docPrice = (DOC_PRICING[form.docType] || 0) * parseInt(form.numCopies || "1");
  const emailValid = !form.email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email);
  const phoneValid = isValidPhilippineMobile(form.phone);
  

  const handlePrint = async () => {
    if (isSubmitting) return;
    if (submittedTrackingId) {
      showToast("Claim slip already generated.");
      onClose();
      navigate("/");
      return;
    }

    setIsSubmitting(true);
    const w = window.open("", "_blank");
    let tid = "";
    try {
      /* Save to services.ts so Document Handler dashboard can see this request.
       * DJANGO: This will POST to /api/documents/public-request/ */
      const result = await submitPublicDocumentRequest({
        name: fullName,
        type: form.docType,
        address: `${form.houseNo} ${form.street}, ${form.sitio}, Cubacub, Mandaue City`,
        phone: form.phone,
        yearsResiding: form.yearsResiding,
        purpose: form.purpose,
        civilStatus: form.civilStatus,
        sex: form.sex,
        birthdate: form.birthdate,
        validId: form.validIdType,
        validIdNo: form.validIdNo,
        payment: paymentMethod,
        copies: form.numCopies,
        email: form.email,
        notes: form.notes,
        idPhoto: idPhoto || undefined,
        selfiePhoto: selfiePhoto || undefined,
        gcashProof: gcashProof || undefined,
        requirements: reqUploads,
      });
      tid = result?.trackingId || "";
      if (!tid) {
        throw new Error("Missing tracking ID");
      }
      setSubmittedTrackingId(tid);
    } catch (err) {
      w?.close();
      showToast("Failed to submit request. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const flds = [
      ["Tracking Number", tid],
      ["Full Name", fullName],
      ["Birthdate", form.birthdate],
      ["Sex / Civil Status", `${form.sex} / ${form.civilStatus}`],
      ["Address", `${form.houseNo} ${form.street}, ${form.sitio}, Cubacub, Mandaue City`],
      ["Years Residing", form.yearsResiding ? `${form.yearsResiding} yrs` : ""],
      ["Phone", form.phone],
      ["Email", form.email || ""],
      ["Document Type", form.docType],
      ["No. of Copies", form.numCopies],
      ["Purpose", form.purpose],
      ["Additional Notes", form.notes || ""],
      ["Valid ID Used", `${form.validIdType} – ${form.validIdNo}`],
      ["Processing Fee", docPrice === 0 ? "FREE" : `PHP ${docPrice.toLocaleString()}.00`],
      ["Payment Method", paymentMethod === "gcash" ? "GCash (Paid)" : "Cash (At pickup)"],
      ["Date Filed", new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })],
    ].filter(([, value]) => value);
    w?.document.write(`<html><head><title>Claim Slip</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:48px;color:#1B263B;max-width:650px;margin:0 auto}.hdr{text-align:center;padding-bottom:20px;margin-bottom:20px;border-bottom:3px solid #008080}.hdr h1{font-size:20px}.hdr p{color:#666;font-size:12px;margin-top:4px}.badge{display:inline-block;background:#008080;color:white;padding:3px 14px;border-radius:20px;font-size:11px;margin-top:6px}.fld{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e5e7eb}.fld .l{color:#666;font-size:12px}.fld .v{font-weight:600;font-size:12px;text-align:right;max-width:55%}.ft{margin-top:28px;text-align:center;color:#888;font-size:10px;padding-top:16px;border-top:2px dashed #e5e7eb}</style></head><body>`);
    w?.document.write(`<div class="hdr"><h1>BARANGAY CUBACUB</h1><p>Official Document Claim Slip</p><span class="badge">CIVIC-FLOW</span></div>`);
    flds.forEach(([l, v]) => w?.document.write(`<div class="fld"><span class="l">${l}</span><span class="v">${v}</span></div>`));
    w?.document.write(`<div class="ft">Present this slip when claiming your document. Processing takes 3–5 business days.<br/>For inquiries call (032) 345-6789.<br/><strong>We encourage you to screenshot this claim slip for your records.</strong></div></body></html>`);
    w?.document.close(); w?.print();
    showToast(w ? "Claim slip generated successfully!" : `Request submitted. Tracking number: ${tid}. Popups are blocked on this device.`);
    setIsSubmitting(false);
    onClose();
    navigate("/");
  };

  // Payment & Verification images
  const [paymentMethod, setPaymentMethod] = useState<"gcash"|"cash">("cash");
  const [submittedTrackingId, setSubmittedTrackingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gcashProof, setGcashProof] = useState("");
  const [idPhoto, setIdPhoto] = useState("");
  const [selfiePhoto, setSelfiePhoto] = useState("");
  // Requirements uploads: keyed by requirement label
  const [reqUploads, setReqUploads] = useState<Record<string, string>>({});
  const setReqUpload = (label: string, val: string) => setReqUploads(prev => ({ ...prev, [label]: val }));
  // Cedula customer type selector
  const [cedulaType, setCedulaType] = useState<"employed" | "business" | "property">("employed");

  const steps = ["Personal Info", "Residence & Contact", "Document Details", "Requirements Upload", "Payment & Verification", "Review & Submit"];
  const canP1 = form.lastName && form.firstName && form.birthdate;
  const canP2 = form.street && form.sitio && phoneValid && form.phone && emailValid;
  const canP3 = form.purpose && form.validIdNo;

  const CEDULA_REQ_MAP: Record<"employed" | "business" | "property", { label: string; note: string }> = {
    employed: { label: "Proof of Income", note: "Payslip, ITR, or employer certificate" },
    business: { label: "Business Permit", note: "Current year barangay or city business permit" },
    property: { label: "Real Property Tax Receipt", note: "Latest official receipt for owned property" },
  };
  const isCedula = form.docType === "Cedula (Community Tax Certificate)";
  const currentReqs = isCedula
    ? [CEDULA_REQ_MAP[cedulaType]]
    : (DOC_REQUIREMENTS[form.docType] || []);
  const canP4 = currentReqs.length === 0 || currentReqs.every(req => reqUploads[req.label]);
  const canP5 = (paymentMethod === "cash" || gcashProof) && idPhoto && selfiePhoto;
  const isPdfUpload = (val: string) => val.startsWith("data:application/pdf");
  const hasPdfInReview = Object.values(reqUploads).some(isPdfUpload)
    || [idPhoto, selfiePhoto, gcashProof].some(val => Boolean(val) && isPdfUpload(val));

  return (
    <AnimatePresence>
      <ModalWrap onClose={onClose} wide>
        <div className="bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] px-6 py-5 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Document Request</h3>
              <p className="text-white/50 text-xs mt-0.5">Step {step} of 6 — {steps[step - 1]}</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {steps.map((s, i) => (
              <div key={s} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-500 ${step > i ? "bg-[#008080]" : step === i + 1 ? "bg-white/60" : "bg-white/15"}`} /></div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <p className="text-xs text-gray-400">Provide your personal information as it appears on your valid ID.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Last Name" required placeholder="e.g. Dela Cruz" value={form.lastName} onChange={e => u("lastName", e.target.value)} />
                  <Input label="First Name" required placeholder="e.g. Juan" value={form.firstName} onChange={e => u("firstName", e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Middle Name" placeholder="e.g. Reyes" value={form.middleName} onChange={e => u("middleName", e.target.value)} />
                  <Select label="Suffix" value={form.suffix} onChange={e => u("suffix", e.target.value)}>
                    <option value="">None</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option>
                  </Select>
                  <div>
                    <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Birthdate<span className="text-rose-400 ml-0.5">*</span></label>
                    <input type="date" className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 outline-none" value={form.birthdate} onChange={e => u("birthdate", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Select label="Sex" required value={form.sex} onChange={e => u("sex", e.target.value)}>
                    <option>Male</option><option>Female</option>
                  </Select>
                  <Select label="Civil Status" required value={form.civilStatus} onChange={e => u("civilStatus", e.target.value)}>
                    <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option><option>Annulled</option>
                  </Select>
                  <Input label="Nationality" value={form.nationality} onChange={e => u("nationality", e.target.value)} />
                </div>
                <button onClick={() => setStep(2)} disabled={!canP1} className="w-full bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <p className="text-xs text-gray-400">Must be a current resident of Barangay Cubacub, Mandaue City.</p>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="House / Lot No." placeholder="e.g. 24-B" value={form.houseNo} onChange={e => u("houseNo", e.target.value)} />
                  <div className="col-span-2"><Input label="Street" required placeholder="e.g. Rizal Street" value={form.street} onChange={e => u("street", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Purok" required value={form.sitio} onChange={e => u("sitio", e.target.value)}>
                    <option value="" disabled>Select Purok</option>
                    {["Purok 1","Purok 2","Purok 3","Purok 4","Purok 5","Purok 6","Purok 7"].map(s => <option key={s}>{s}</option>)}
                  </Select>
                  <Input label="Years Residing" placeholder="e.g. 10" type="number" value={form.yearsResiding} onChange={e => u("yearsResiding", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Phone Number<span className="text-rose-400 ml-0.5">*</span></label>
                    <input type="tel" placeholder="09XXXXXXXXX" value={form.phone} onChange={e => u("phone", normalizePhoneInput(e.target.value))} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 outline-none" inputMode="numeric" maxLength={11} pattern="09[0-9]{9}" />
                    {form.phone && !phoneValid && <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>}
                  </div>
                  <div>
                    <Input label="Email (optional)" placeholder="juan@gmail.com" type="email" value={form.email} onChange={e => u("email", e.target.value)} />
                    {form.email && !emailValid && <p className="text-xs text-rose-400 mt-1">Enter a valid email (e.g. name@gmail.com)</p>}
                  </div>
                </div>
                <div className="bg-[#F5F7FA] rounded-xl p-3 text-xs text-gray-400 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
                  <span>Fixed Barangay: <strong className="text-gray-600">Cubacub, Mandaue City, Cebu 6014</strong>. Non-residents may be denied.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => setStep(3)} disabled={!canP2} className="flex-1 bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Document Type" required value={form.docType} onChange={e => u("docType", e.target.value)}>
                    {Object.keys(DOC_PRICING).map(d => <option key={d}>{d}</option>)}
                  </Select>
                  <Select label="Number of Copies" value={form.numCopies} onChange={e => u("numCopies", e.target.value)}>
                    {["1","2","3","4","5"].map(n => <option key={n}>{n}</option>)}
                  </Select>
                </div>

                {/* Document Info */}
                {DOC_INFO[form.docType] && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <p className="mb-0.5" style={{ fontWeight: 600 }}>Requirements for {form.docType}:</p>
                      <p className="text-blue-600 leading-relaxed">{DOC_INFO[form.docType]}</p>
                    </div>
                  </div>
                )}

                {/* Document Requirements Panel */}
                <AnimatePresence mode="wait">
                  {(DOC_REQUIREMENTS[form.docType] || isCedula) ? (
                    <motion.div
                      key={form.docType}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border border-[#008080]/20 overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-[#008080]/10 to-[#008080]/5 px-4 py-2.5 flex items-center gap-2 border-b border-[#008080]/10">
                        <ListChecks className="w-3.5 h-3.5 text-[#008080] shrink-0" />
                        <span className="text-xs text-[#008080]" style={{ fontFamily: "Montserrat", fontWeight: 600 }}>
                          Required Documents to Bring
                        </span>
                        <span className="ml-auto text-[10px] text-[#008080]/50 bg-[#008080]/10 px-2 py-0.5 rounded-full">
                          {currentReqs.length} item{currentReqs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="bg-[#F5F7FA] px-4 py-3 space-y-2.5">
                        {/* Cedula type selector */}
                        {isCedula && (
                          <div className="pb-1">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2" style={{ fontWeight: 600 }}>I am a / an:</p>
                            <div className="grid grid-cols-3 gap-2">
                              {(["employed", "business", "property"] as const).map(type => {
                                const labels = { employed: "Employed Individual", business: "Business Owner", property: "Property Owner" };
                                const active = cedulaType === type;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => { setCedulaType(type); setReqUploads({}); }}
                                    className={`py-2 px-2 rounded-xl border-2 text-[10px] transition-all text-center leading-tight ${active ? "border-[#008080] bg-[#008080]/8 text-[#008080]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                                    style={{ fontWeight: active ? 700 : 500 }}
                                  >
                                    {labels[type]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {currentReqs.map((req, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-[#008080] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <span className="text-[9px] text-white" style={{ fontWeight: 700 }}>{i + 1}</span>
                            </div>
                            <div className="text-xs leading-relaxed pt-0.5">
                              <span className="text-[#1B263B]" style={{ fontWeight: 600 }}>{req.label}</span>
                              <span className="text-gray-400"> — {req.note}</span>
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-gray-400 border-t border-gray-200 pt-2 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-[#008080]/60 shrink-0" />
                          Prepare these/this documents.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-req"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-2"
                    >
                      <ListChecks className="w-4 h-4 text-gray-300 shrink-0" />
                      <span className="text-xs text-gray-400">Bring a valid government-issued ID and any relevant supporting documents.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input label="Purpose" required placeholder="e.g. Employment, Loan Application" value={form.purpose} onChange={e => u("purpose", e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Valid ID Presented" required value={form.validIdType} onChange={e => u("validIdType", e.target.value)}>
                    {["Philippine National ID","Driver's License","Passport","SSS ID","PhilHealth ID","Voter's ID","Postal ID","TIN ID","School ID"].map(id => <option key={id}>{id}</option>)}
                  </Select>
                  <Input label="ID Number" required placeholder="e.g. 1234-5678-9012" value={form.validIdNo} onChange={e => u("validIdNo", e.target.value)} />
                </div>
                <Textarea label="Additional Notes (optional)" rows={2} placeholder="Any special requests..." value={form.notes} onChange={e => u("notes", e.target.value)} />
                <div className="bg-gradient-to-r from-[#008080]/10 to-[#008080]/5 rounded-xl p-3 text-sm flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-[#008080]" /> Processing Fee:</span>
                  <span className="text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>{docPrice === 0 ? "FREE" : `PHP ${docPrice.toLocaleString()}.00`}</span>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Estimated processing: <strong>3–5 business days</strong>. {docPrice === 0 ? "This document is free of charge." : "Payment will be collected in the next step."}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>Pickup Deadline:</strong> Your document will only be available for pickup within <strong>5 business days</strong> after it is marked as "Ready to Pick Up." If you fail to collect it within this period, you must file a refund request through the Reports & Complaints section. <strong>Only 60% of the original payment will be refunded.</strong> If you chose cash payment and exceed the deadline, an additional 20% of the price for each previous unclaimed document will be collected at the barangay hall.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => { setReqUploads({}); setStep(4); }} disabled={!canP3} className="flex-1 bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
            {/* --- Step 4: Requirements Upload --- */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {/* Clarity warning banner */}
                <div className="rounded-2xl overflow-hidden border border-amber-200">
                  <div className="bg-amber-500 px-4 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                    <p className="text-xs text-white" style={{ fontWeight: 700 }}>Upload Clarity Requirement</p>
                  </div>
                  <div className="bg-amber-50 px-4 py-3 space-y-1.5">
                    <p className="text-xs text-amber-800">Each uploaded document must be <strong>clear, fully visible, and completely readable</strong>. Blurry, cropped, or illegible files will cause delays or rejection of your request.</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {["✓ Well-lit photo", "✓ All text readable", "✓ No cut-off edges", "✓ Flat, no glare"].map(tip => (
                        <span key={tip} className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{tip}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress indicator */}
                {currentReqs.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      <span className="text-[#008080]" style={{ fontWeight: 600 }}>{currentReqs.filter(r => reqUploads[r.label]).length}</span>
                      <span> of {currentReqs.length} documents uploaded</span>
                    </p>
                    <div className="flex gap-1">
                      {currentReqs.map(r => (
                        <div key={r.label} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${reqUploads[r.label] ? "bg-emerald-400" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload cards */}
                {currentReqs.length > 0 ? (
                  <div className="space-y-3">
                    {currentReqs.map((req, i) => (
                      <RequirementFileUploader
                        key={req.label}
                        index={i}
                        reqLabel={req.label}
                        reqNote={req.note}
                        value={reqUploads[req.label] || ""}
                        onChange={val => setReqUpload(req.label, val)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#008080]/20 bg-[#008080]/5 px-4 py-6 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#008080]/10 flex items-center justify-center">
                      <ListChecks className="w-5 h-5 text-[#008080]" />
                    </div>
                    <p className="text-sm text-[#1B263B]" style={{ fontWeight: 600 }}>No specific document requirements</p>
                    <p className="text-xs text-gray-400">A valid government-issued ID (uploaded in the next step) is sufficient for this document type.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => setStep(5)} disabled={!canP4}
                    className="flex-1 bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                    {canP4 ? <><span>Continue</span><ArrowRight className="w-4 h-4" /></> : <><span>Upload all {currentReqs.length} document{currentReqs.length !== 1 ? "s" : ""}</span></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* --- Step 5: Payment & Verification --- */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <p className="text-xs text-gray-400">Choose your payment method and upload verification photos to confirm your identity.</p>
                {/* Payment Method Toggle */}
                <div>
                  <label className="text-xs tracking-wide text-gray-500 uppercase mb-2 block">Payment Method<span className="text-rose-400 ml-0.5">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod("gcash")} className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${paymentMethod === "gcash" ? "border-[#008080] bg-[#008080]/5" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white"><Wallet className="w-5 h-5" /></div>
                      <div className="text-left">
                        <p className="text-sm text-[#1B263B]">GCash</p>
                        <p className="text-xs text-gray-400">Digital payment</p>
                      </div>
                    </button>
                    <button onClick={() => setPaymentMethod("cash")} className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${paymentMethod === "cash" ? "border-[#008080] bg-[#008080]/5" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white"><CreditCard className="w-5 h-5" /></div>
                      <div className="text-left">
                        <p className="text-sm text-[#1B263B]">Cash</p>
                        <p className="text-xs text-gray-400">Pay at pickup</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* GCash Payment Info */}
                <AnimatePresence>
                  {paymentMethod === "gcash" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-blue-700">Send payment to:</p>
                            <p className="text-lg text-blue-900" style={{ fontFamily: "Montserrat" }}>0962 673 3929</p>
                            <p className="text-xs text-blue-500">Barangay Cubacub - Civic Flow</p>
                          </div>
                        </div>
                        {/* Mock QR Code */}
                        <div className="flex justify-center">
                          <div className="w-36 h-36 bg-white rounded-xl border-2 border-blue-200 flex flex-col items-center justify-center gap-2">
                            <QrCode className="w-16 h-16 text-blue-900" />
                            <p className="text-[9px] text-blue-400">Scan to pay via GCash</p>
                          </div>
                        </div>
                        <p className="text-xs text-blue-500 text-center">Amount to send: <strong>PHP {docPrice.toLocaleString()}.00</strong></p>
                      </div>
                      <ImageUploader label="Proof of GCash Payment" required value={gcashProof} onChange={setGcashProof} hint="Upload screenshot of your GCash payment confirmation" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {paymentMethod === "cash" && (
                  <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-600 flex items-start gap-2">
                    <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Cash payment of <strong>PHP {docPrice.toLocaleString()}.00</strong> will be collected at the barangay hall upon document pickup.</span>
                  </div>
                )}

                {/* ID & Selfie Verification */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs tracking-wide text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#008080]" /> Identity Verification</p>
                  <div className="grid grid-cols-2 gap-4">
                    <ImageUploader label="Photo of Valid ID" required value={idPhoto} onChange={setIdPhoto} hint="Clear photo or PDF of the front of your ID" acceptPdf />
                    <ImageUploader label="Selfie Photo" required value={selfiePhoto} onChange={setSelfiePhoto} hint="Clear selfie photo or PDF for identity verification" acceptPdf />
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Photos are required to prevent fraud and verify your identity. They will only be reviewed by authorized barangay staff.</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(4)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => setStep(6)} disabled={!canP5} className="flex-1 bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Review <ArrowRight className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
            {step === 6 && (
              <motion.div key="s6" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="bg-gradient-to-br from-[#F5F7FA] to-[#E8F0F0] rounded-2xl p-5 space-y-2.5 text-sm">
                  <p className="text-xs text-[#008080] uppercase tracking-wider mb-1">Personal Information</p>
                  {[["Full Name", fullName],["Birthdate", form.birthdate],["Sex", form.sex],["Civil Status", form.civilStatus],["Nationality", form.nationality]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v || "—"}</span></div>
                  ))}
                  <div className="border-t border-gray-200 my-2" />
                  <p className="text-xs text-[#008080] uppercase tracking-wider mb-1">Residence & Contact</p>
                  {[["Address", `${form.houseNo} ${form.street}, ${form.sitio}`],["Barangay","Cubacub, Mandaue City, Cebu"],["Years Residing", form.yearsResiding ? `${form.yearsResiding} yrs` : "—"],["Phone", form.phone],["Email", form.email || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                  ))}
                  <div className="border-t border-gray-200 my-2" />
                  <p className="text-xs text-[#008080] uppercase tracking-wider mb-1">Document & Payment</p>
                  {[["Document", form.docType],["Copies", form.numCopies],["Purpose", form.purpose],["Valid ID", `${form.validIdType} – ${form.validIdNo}`],["Fee", docPrice === 0 ? "FREE" : `PHP ${docPrice.toLocaleString()}.00`],["Payment", paymentMethod === "gcash" ? "GCash (Paid)" : "Cash (At pickup)"],["Tracking #", submittedTrackingId || "Will be generated on submit"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                  ))}
                </div>
                {/* Requirements uploaded summary */}
                {currentReqs.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-[#F5F7FA] px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-[#008080]" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Requirement Uploads</p>
                      <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                        {currentReqs.filter(r => reqUploads[r.label]).length}/{currentReqs.length} uploaded
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2 bg-white">
                      {currentReqs.map(req => {
                        const val = reqUploads[req.label] || "";
                        const isPdf = val.startsWith("data:application/pdf");
                        const isImg = val.startsWith("data:image");
                        return (
                          <div key={req.label} className={`rounded-xl border p-2 ${val ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
                            {isImg ? (
                              <img src={val} alt={req.label} className="w-full h-16 object-cover rounded-lg mb-1.5" />
                            ) : isPdf ? (
                              <div className="w-full h-16 bg-rose-100 rounded-lg mb-1.5 flex flex-col items-center justify-center gap-1">
                                <FileText className="w-6 h-6 text-rose-400" />
                                <a href={val} target="_blank" rel="noreferrer" className="text-[9px] text-rose-500 hover:underline">Open PDF</a>
                              </div>
                            ) : (
                              <div className="w-full h-16 bg-gray-100 rounded-lg mb-1.5 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-gray-300" />
                              </div>
                            )}
                            <p className="text-[10px] text-gray-600 truncate" style={{ fontWeight: 600 }}>{req.label}</p>
                            <p className={`text-[9px] mt-0.5 ${val ? "text-emerald-600" : "text-gray-400"}`}>{val ? (isPdf ? "PDF uploaded" : "Photo uploaded") : "Not uploaded"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasPdfInReview && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>If any PDF opens blank, click "Open PDF" and reload the new tab to view it.</span>
                  </div>
                )}

                {/* Identity & payment image previews */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { img: idPhoto, label: "Valid ID", allowPdf: true },
                    { img: selfiePhoto, label: "Selfie", allowPdf: true },
                    ...(gcashProof ? [{ img: gcashProof, label: "GCash Proof", allowPdf: false }] : []),
                  ].map(p => (
                    <div key={p.label} className="text-center">
                      {p.allowPdf && isPdfUpload(p.img) ? (
                        <div className="w-full h-20 rounded-xl border border-gray-200 bg-rose-50 flex flex-col items-center justify-center gap-1">
                          <FileText className="w-5 h-5 text-rose-400" />
                          <a href={p.img} target="_blank" rel="noreferrer" className="text-[10px] text-rose-500 hover:underline">Open PDF</a>
                        </div>
                      ) : (
                        <img src={p.img} alt={p.label} className="w-full h-20 object-cover rounded-xl border border-gray-200" />
                      )}
                      <p className="text-xs text-gray-400 mt-1">{p.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>After getting your claim slip, a new tab opens on desktop. If a print dialog appears, click Cancel, take a screenshot of the slip, return here, and you'll be redirected back to the Public Page.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(5)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={handlePrint} disabled={isSubmitting || Boolean(submittedTrackingId)} className="flex-1 bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
                    <Download className="w-4 h-4" /> Get Claim Slip
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ModalWrap>
    </AnimatePresence>
  );
}

// --- Document Tracker Modal (Glassmorphism) ---
function TrackerModal({ onClose, trackingId }: { onClose: () => void; trackingId: string }) {
  const [docStatus, setDocStatus] = useState<DocumentTrackingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* Load real document status from services.ts — DJANGO: GET /api/documents/track/?id=... */
    getDocumentStatus(trackingId).then(result => {
      setDocStatus(result);
      setLoading(false);
    });
  }, [trackingId]);

  const currentStep = docStatus?.step ?? 0;

  const statuses = [
    { label: "Request Filed", desc: "Your request has been submitted" },
    { label: "Under Review", desc: "Staff is verifying your information" },
    { label: "Approved", desc: "Document is being prepared" },
    { label: "Ready for Pickup", desc: "Visit the barangay hall to claim" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-2xl bg-white/90 border border-white/50 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-[#008080] to-[#00a89d] px-6 py-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Document Status</h3>
                <p className="text-white/60 text-xs mt-0.5">Tracking #: <strong className="text-white/90">{trackingId}</strong></p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="p-6 space-y-1">
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Document requests are deleted 4 months after the request date.
            </div>
            {loading ? (
              <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-gray-200 border-t-[#008080] rounded-full" />
                <p className="text-sm">Looking up your request...</p>
              </div>
            ) : !docStatus ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto"><X className="w-6 h-6 text-rose-400" /></div>
                <p className="text-sm text-[#1B263B]">Tracking ID not found</p>
                <p className="text-xs text-gray-400">No document request matches <strong>{trackingId}</strong>. Please double-check your claim slip.</p>
              </div>
            ) : (
              <>
                {docStatus.status === "rejected" && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Request Rejected.</strong> {docStatus.rejectionReason || "Your document request was not approved."}
                    </span>
                  </div>
                )}
                {docStatus.status === "claimed" && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Document Claimed.</strong> This request has been marked as completed.</span>
                  </div>
                )}
                {docStatus.status === "unclaimed" && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Document Unclaimed.</strong> Pickup deadline has passed. Visit the barangay hall for assistance.</span>
                  </div>
                )}
                <div className="mb-4 bg-[#F5F7FA] rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-400">Tracking ID</span><span className="text-[#1B263B]">{docStatus.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Document</span><span className="text-[#1B263B] text-right max-w-[60%]">{docStatus.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Date Filed</span><span className="text-[#1B263B]">{docStatus.date}</span></div>
                  {docStatus.statusUpdatedAt && (
                    <div className="flex justify-between"><span className="text-gray-400">Status Updated</span><span className="text-[#1B263B] text-right max-w-[60%]">{new Date(docStatus.statusUpdatedAt).toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`capitalize ${docStatus.status === "rejected" ? "text-rose-500" : docStatus.status === "unclaimed" ? "text-amber-600" : docStatus.status === "claimed" ? "text-emerald-600" : "text-[#008080]"}`}>{docStatus.status.replace("_", " ")}</span></div>
                  {docStatus.status === "ready_to_pickup" && docStatus.pickupDeadline && (
                    <div className="flex justify-between"><span className="text-gray-400">Pickup Deadline</span><span className="text-amber-600">{docStatus.pickupDeadline}</span></div>
                  )}
                </div>
                {statuses.map((s, i) => (
                  <div key={s.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          docStatus.status === "rejected" && i === 0 ? "bg-rose-500 border-rose-500" :
                          i < currentStep ? "bg-[#008080] border-[#008080]" : i === currentStep ? "border-[#008080] bg-white" : "border-gray-200 bg-white"
                        }`}
                      >
                        {i < currentStep && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-white" />}
                        {i === currentStep && docStatus.status !== "rejected" && <div className="w-2 h-2 rounded-full bg-[#008080] animate-pulse" />}
                      </motion.div>
                      {i < 3 && <div className={`w-0.5 h-10 ${i < currentStep ? "bg-[#008080]" : "bg-gray-200"}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm ${i <= currentStep ? "text-[#1B263B]" : "text-gray-300"}`}>{s.label}</p>
                      <p className={`text-xs mt-0.5 ${i <= currentStep ? "text-gray-400" : "text-gray-200"}`}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ReportTrackerModal({ onClose, trackingId }: { onClose: () => void; trackingId: string }) {
  const [reportStatus, setReportStatus] = useState<ReportTrackingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReportStatus(trackingId).then(result => {
      setReportStatus(result);
      setLoading(false);
    }).catch(() => {
      setReportStatus(null);
      setLoading(false);
    });
  }, [trackingId]);

  const currentStep = reportStatus?.step ?? 0;
  const statuses = [
    { label: "Report Filed", desc: "Your report has been submitted" },
    { label: "Under Investigation", desc: "Barangay staff is reviewing the report" },
    { label: "Resolved", desc: "The report has been marked complete" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-2xl bg-white/90 border border-white/50 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Report Status</h3>
                <p className="text-white/60 text-xs mt-0.5">Tracking #: <strong className="text-white/90">{trackingId}</strong></p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="p-6 space-y-1">
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              This tracker is for incident reports and document refund requests only.
            </div>
            {loading ? (
              <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-gray-200 border-t-rose-500 rounded-full" />
                <p className="text-sm">Looking up your report...</p>
              </div>
            ) : !reportStatus?.found ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto"><X className="w-6 h-6 text-rose-400" /></div>
                <p className="text-sm text-[#1B263B]">Tracking ID not found</p>
                <p className="text-xs text-gray-400">No incident or refund request matches <strong>{trackingId}</strong>.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 bg-[#F5F7FA] rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-400">Tracking ID</span><span className="text-[#1B263B]">{reportStatus.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-[#1B263B]">{reportStatus.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="text-[#1B263B] text-right max-w-[60%]">{reportStatus.category}{reportStatus.subcategory ? ` - ${reportStatus.subcategory}` : ""}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Date Filed</span><span className="text-[#1B263B]">{reportStatus.date}</span></div>
                  {reportStatus.location && <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="text-[#1B263B] text-right max-w-[60%]">{reportStatus.location}</span></div>}
                  {reportStatus.statusUpdatedAt && (
                    <div className="flex justify-between"><span className="text-gray-400">Status Updated</span><span className="text-[#1B263B] text-right max-w-[60%]">{new Date(reportStatus.statusUpdatedAt).toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="capitalize text-rose-500">{reportStatus.status}</span></div>
                </div>
                {statuses.map((s, i) => (
                  <div key={s.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i < currentStep ? "bg-rose-500 border-rose-500" : i === currentStep ? "border-rose-500 bg-white" : "border-gray-200 bg-white"}`}
                      >
                        {i < currentStep && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-white" />}
                        {i === currentStep && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      </motion.div>
                      {i < 2 && <div className={`w-0.5 h-10 ${i < currentStep ? "bg-rose-500" : "bg-gray-200"}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm ${i <= currentStep ? "text-[#1B263B]" : "text-gray-300"}`}>{s.label}</p>
                      <p className={`text-xs mt-0.5 ${i <= currentStep ? "text-gray-400" : "text-gray-200"}`}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
// --- Clinic Booking (with patient health info) ---
 
function ClinicBookingModal({ onClose, clinicOpen }: { onClose: () => void; clinicOpen: boolean }) {
  const { showToast } = useToast();
  const [cStep, setCStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<{ id: string; dateBookedText: string } | null>(null);
  const [form, setForm] = useState({
    name: "", birthdate: "", sex: "Male", phone: "",
    consultType: "General Checkup", chiefComplaint: "", otherConsultType: "",
    allergies: "", medications: "", conditions: "",
    preferredDate: "", slot: "",
  });
  const cu = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const slots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const todayDate = todayInputDate();
  const isSelectedToday = form.preferredDate === todayDate;
  const selectedDateIsPast = Boolean(form.preferredDate && form.preferredDate < todayDate);
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
  const isPastSlot = (slot: string) => isSelectedToday && slotToMinutes(slot) <= currentMinutes;
  const appointmentFields = confirmedAppointment ? [
    ["Appointment ID", confirmedAppointment.id],
    ["Patient Name", form.name],
    ["Phone", form.phone],
    ["Birthdate", form.birthdate],
    ["Sex", form.sex],
    ["Consultation Type", form.consultType === "Other" ? form.otherConsultType : form.consultType],
    ["Chief Complaint", form.chiefComplaint],
    ["Known Allergies", form.allergies || "None"],
    ["Current Medications", form.medications || "None"],
    ["Pre-existing Conditions", form.conditions || "None"],
    ["Preferred Date", form.preferredDate],
    ["Time Slot", form.slot],
    ["Date Booked", confirmedAppointment.dateBookedText],
  ] : [];
  const printAppointmentConfirmation = () => {
    if (!confirmedAppointment) return;
    const w = window.open("", "_blank");
    if (!w) {
      showToast("Popup blocked. Your appointment is already saved.");
      return;
    }
    w?.document.write(`<html><head><title>Appointment Confirmation</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:48px;color:#1B263B;max-width:650px;margin:0 auto}.hdr{text-align:center;padding-bottom:20px;margin-bottom:20px;border-bottom:3px solid #008080}.hdr h1{font-size:20px}.hdr p{color:#666;font-size:12px;margin-top:4px}.badge{display:inline-block;background:#008080;color:white;padding:3px 14px;border-radius:20px;font-size:11px;margin-top:6px}.fld{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e5e7eb}.fld .l{color:#666;font-size:12px}.fld .v{font-weight:600;font-size:12px;text-align:right;max-width:55%}.ft{margin-top:28px;text-align:center;color:#888;font-size:10px;padding-top:16px;border-top:2px dashed #e5e7eb}.warn{margin-top:16px;background:#FFF3CD;padding:12px;border-radius:8px;font-size:11px;color:#856404;text-align:center}</style></head><body>`);
    w?.document.write(`<div class="hdr"><h1>CUBACUB HEALTH CENTER</h1><p>Official Appointment Confirmation</p><span class="badge">CIVIC-FLOW</span></div>`);
    appointmentFields.forEach(([l, v]) => w?.document.write(`<div class="fld"><span class="l">${l}</span><span class="v">${v}</span></div>`));
    w?.document.write(`<div class="warn">Please bring this confirmation and a valid ID on your appointment date. Arrive 15 minutes early.</div>`);
    w?.document.write(`<div class="ft">Cubacub Health Center - Mon-Fri 8AM-5PM | (032) 345-6789<br/>This serves as your official proof of appointment.</div></body></html>`);
    w.document.close();
    w.print();
  };

  /* Load booked slots from services.ts when date changes
   * DJANGO: GET /api/patients/booked-slots/?date=YYYY-MM-DD */
  const [taken, setTaken] = useState<string[]>([]);
  useEffect(() => {
    if (form.preferredDate) {
      getBookedSlots(form.preferredDate).then(setTaken);
    } else {
      setTaken([]);
    }
  }, [form.preferredDate]);

  useEffect(() => {
    if (!clinicOpen || selectedDateIsPast || (form.slot && isPastSlot(form.slot)) || (form.slot && taken.includes(form.slot))) {
      cu("slot", "");
    }
  }, [clinicOpen, form.preferredDate, form.slot, selectedDateIsPast, taken]);

  return (
    <AnimatePresence>
      <ModalWrap onClose={onClose} wide>
        <div className="bg-gradient-to-r from-[#008080] to-[#00a89d] px-6 py-5 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Clinic Booking</h3>
                <p className="text-white/50 text-xs">Cubacub Health Center — Step {cStep} of 3</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {["Patient Info", "Health History", "Schedule"].map((s, i) => (
              <div key={s} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-500 ${cStep > i ? "bg-white" : cStep === i + 1 ? "bg-white/60" : "bg-white/15"}`} /></div>
            ))}
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {!clinicOpen && (
              <motion.div key="closed" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>Clinic Is Closed</h3>
                  <p className="text-sm text-gray-400 mt-2">Online clinic booking is temporarily unavailable. Please check again later or contact the barangay health center.</p>
                </div>
                <button onClick={onClose} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Close</button>
              </motion.div>
            )}
            {clinicOpen && confirmedAppointment && (
              <motion.div key="confirmed" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7" />
                  </div>
                  <h3 className="text-[#1B263B]" style={{ fontFamily: "Montserrat" }}>Appointment Confirmed</h3>
                  <p className="text-xs text-gray-400 mt-1">Screenshot this summary or print it when your device allows popups.</p>
                </div>
                <div className="bg-[#F5F7FA] rounded-2xl p-4 space-y-2">
                  {appointmentFields.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 text-sm border-b border-white last:border-0 pb-2 last:pb-0">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-[#1B263B] text-right max-w-[60%] break-words">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 text-amber-700 rounded-xl p-3 text-xs">
                  Please bring this confirmation and a valid ID on your appointment date. Arrive 15 minutes early.
                </div>
                <div className="flex gap-3">
                  <button onClick={printAppointmentConfirmation} className="flex-1 bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-3 rounded-xl flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Print
                  </button>
                  <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Done</button>
                </div>
              </motion.div>
            )}
            {clinicOpen && !confirmedAppointment && cStep === 1 && (
              <motion.div key="c1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <p className="text-xs text-gray-400">Patient details for your medical record.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" required placeholder="Full name" value={form.name} onChange={e => cu("name", e.target.value)} />
                  <div>
                    <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Phone<span className="text-rose-400 ml-0.5">*</span></label>
                    <input type="tel" placeholder="09XXXXXXXXX" value={form.phone} onChange={e => cu("phone", normalizePhoneInput(e.target.value))} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 outline-none" inputMode="numeric" maxLength={11} pattern="09[0-9]{9}" />
                    {form.phone && !isValidPhilippineMobile(form.phone) && <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Birthdate<span className="text-rose-400 ml-0.5">*</span></label>
                    <input type="date" className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 outline-none" value={form.birthdate} onChange={e => cu("birthdate", e.target.value)} />
                  </div>
                  <Select label="Sex" required value={form.sex} onChange={e => cu("sex", e.target.value)}>
                    <option>Male</option><option>Female</option>
                  </Select>
                </div>
                <Select label="Consultation Type" required value={form.consultType} onChange={e => cu("consultType", e.target.value)}>
                  {["General Checkup","Prenatal Checkup","Vaccination","Blood Pressure Monitoring","Dental Checkup","Flu / Fever Consultation","Child Immunization","Family Planning","TB-DOTS Follow-up","Wound Dressing / Minor Surgery","Other"].map(c => <option key={c}>{c}</option>)}
                </Select>
                {form.consultType === "Other" && (
                  <Input label="Please specify consultation type" required placeholder="Describe what kind of consultation you need..." value={form.otherConsultType || ""} onChange={e => cu("otherConsultType", e.target.value)} />
                )}
                <Textarea label="Chief Complaint / Reason for Visit" required rows={2} placeholder="Briefly describe your symptoms or reason for visit..." value={form.chiefComplaint} onChange={e => cu("chiefComplaint", e.target.value)} />
                <button onClick={() => setCStep(2)} disabled={!form.name || !isValidPhilippineMobile(form.phone) || !form.birthdate || !form.chiefComplaint}
                  className="w-full bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            {clinicOpen && !confirmedAppointment && cStep === 2 && (
              <motion.div key="c2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <p className="text-xs text-gray-400">Help our health workers prepare. Leave blank if none.</p>
                <Textarea label="Known Allergies" rows={2} placeholder="e.g. Penicillin, Seafood, Latex, None" value={form.allergies} onChange={e => cu("allergies", e.target.value)} />
                <Textarea label="Current Medications" rows={2} placeholder="e.g. Metformin 500mg daily, Amlodipine 5mg, None" value={form.medications} onChange={e => cu("medications", e.target.value)} />
                <Textarea label="Pre-existing Conditions" rows={2} placeholder="e.g. Hypertension, Diabetes, Asthma, None" value={form.conditions} onChange={e => cu("conditions", e.target.value)} />
                <div className="bg-[#F5F7FA] rounded-xl p-3 text-xs text-gray-400 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#008080] shrink-0 mt-0.5" />
                  <span>Your health information is confidential and will only be accessible to Cubacub Health Center staff.</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCStep(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => setCStep(3)} className="flex-1 bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                    Pick Schedule <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
            {clinicOpen && !confirmedAppointment && cStep === 3 && (
              <motion.div key="c3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                <div>
                  <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Preferred Date<span className="text-rose-400 ml-0.5">*</span></label>
                  <input type="date" min={todayDate} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008080]/30 outline-none" value={form.preferredDate} onChange={e => { cu("preferredDate", e.target.value); cu("slot", ""); }} />
                  {selectedDateIsPast && <p className="text-xs text-rose-400 mt-1">Please choose today or a future date.</p>}
                </div>
                <div>
                  <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Time Slot<span className="text-rose-400 ml-0.5">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(s => {
                      const isTaken = taken.includes(s);
                      const isPast = isPastSlot(s);
                      const isDisabled = isTaken || isPast || selectedDateIsPast || !clinicOpen;
                      return (
                        <button key={s} onClick={() => !isDisabled && cu("slot", s)} disabled={isDisabled}
                          className={`text-xs py-2.5 rounded-xl border transition-all ${
                            isDisabled ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through" :
                            form.slot === s ? "bg-[#008080] text-white border-[#008080] shadow-md shadow-[#008080]/20" : "border-gray-200 hover:border-[#008080] hover:bg-[#008080]/5"
                          }`}>{s}</button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-300 mt-2">Grayed out slots are unavailable, already past, or fully booked.</p>
                </div>
                {/* Summary */}
                <div className="bg-gradient-to-br from-[#F5F7FA] to-[#E8F0F0] rounded-2xl p-4 space-y-2 text-sm">
                  <p className="text-xs text-[#008080] uppercase tracking-wider mb-1">Booking Summary</p>
                  {[["Patient", form.name],["Type", form.consultType],["Complaint", form.chiefComplaint],["Allergies", form.allergies || "None"],["Date", form.preferredDate || "—"],["Time", form.slot || "—"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[60%] truncate">{v}</span></div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCStep(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={async () => {
                    if (!clinicOpen || selectedDateIsPast || !form.slot || isPastSlot(form.slot) || taken.includes(form.slot)) {
                      showToast("Please choose an available current or future schedule.");
                      return;
                    }
                    const apptId = `CLN-${Date.now().toString().slice(-6)}`;
                    const dateBookedIso = new Date().toISOString();
                    const dateBookedText = new Date(dateBookedIso).toLocaleString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    /* Save to services.ts so Clinic Handler dashboard can see this booking.
                     * DJANGO: This will POST to /api/patients/ */
                    try {
                      setIsBooking(true);
                      await addPatient({
                        name: form.name,
                        time: form.slot,
                        reason: form.consultType === "Other" ? form.otherConsultType : form.consultType,
                        status: "waiting",
                        appointmentId: apptId,
                        dateBooked: dateBookedIso,
                        phone: form.phone,
                        birthdate: form.birthdate,
                        sex: form.sex,
                        chiefComplaint: form.chiefComplaint,
                        allergies: form.allergies || "None",
                        medications: form.medications || "None",
                        conditions: form.conditions || "None",
                        queueDate: form.preferredDate,
                      });
                    } catch (error) {
                      getBookedSlots(form.preferredDate).then(setTaken).catch(() => {});
                      const message = error instanceof Error ? error.message : "";
                      showToast(message.includes("already booked") ? "That time slot was just booked. Please choose another slot." : message.includes("clinic_status") ? "Clinic booking is currently closed." : message.includes("401") || message.includes("403") ? "Clinic booking is blocked by backend permissions. Please redeploy the backend." : "Failed to create appointment. Please try again.");
                      setIsBooking(false);
                      return;
                    }
                    setIsBooking(false);
                    window.dispatchEvent(new CustomEvent("clinicUpdate"));
                    setConfirmedAppointment({ id: apptId, dateBookedText });
                    showToast(`Appointment confirmed! ID: ${apptId}`);
                  }} disabled={isBooking || !clinicOpen || !form.preferredDate || !form.slot || selectedDateIsPast || isPastSlot(form.slot) || taken.includes(form.slot)}
                    className="flex-1 bg-gradient-to-r from-[#008080] to-[#00a89d] text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                    <Sparkles className="w-4 h-4" /> {isBooking ? "Saving..." : "Confirm Appointment"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ModalWrap>
    </AnimatePresence>
  );
}

// --- Reports & Complaints (Multi-step) ---
function ReportModal({ onClose, isDocumentRefund }: { onClose: () => void; isDocumentRefund?: boolean }) {
  const { showToast } = useToast();
  const [rStep, setRStep] = useState(1);
  const [anon, setAnon] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState(() => {
    const now = new Date();
    const currentDate = toInputDate(now);
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (isDocumentRefund) {
      return {
        // Reporter info
        reporterName: "", reporterPhone: "", reporterAddress: "", reporterRelation: "Witness",
        // Incident info
        category: "Document Refund", subcategory: "", urgency: "Low", itemName: "",
        incidentDate: currentDate, incidentTime: currentTime, location: "", landmark: "",
        // People involved
        suspectName: "", suspectDescription: "", victimsInvolved: "",
        // Narrative & evidence
        details: "", evidenceDesc: "", otherSubcategory: "", reportCreatedAt: now.toISOString(),
      };
    }
    
    return {
      // Reporter info
      reporterName: "", reporterPhone: "", reporterAddress: "", reporterRelation: "Witness",
      // Incident info
      category: "Noise Complaint", subcategory: "", urgency: "Medium", itemName: "",
      incidentDate: "", incidentTime: "", location: "", landmark: "",
      // People involved
      suspectName: "", suspectDescription: "", victimsInvolved: "",
      // Narrative & evidence
      details: "", evidenceDesc: "", otherSubcategory: "", reportCreatedAt: now.toISOString(),
    };
  });
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [reportDraftId, setReportDraftId] = useState(() => isDocumentRefund ? `RDF-${Math.floor(100000 + Math.random() * 900000)}` : `RPT-${Math.floor(100000 + Math.random() * 900000)}`);
  const evidenceRef = useRef<HTMLInputElement>(null);
  const addEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && evidencePhotos.length < 5) {
      const reader = new FileReader();
      reader.onload = () => setEvidencePhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    }
  };
  const ru = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Refund state
  const [isRefund, setIsRefund] = useState(isDocumentRefund || false);
  const [refundForm, setRefundForm] = useState({ gcashNumber: "", gcashName: "", trackingId: "" });

  useEffect(() => {
    if (isRefund && reportDraftId.startsWith("RPT-")) {
      setReportDraftId(`RDF-${Math.floor(100000 + Math.random() * 900000)}`);
    }
    if (!isRefund && reportDraftId.startsWith("RDF-")) {
      setReportDraftId(`RPT-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [isRefund, reportDraftId]);

  const subcategories: Record<string, string[]> = {
    "Noise Complaint": ["Karaoke / Loud Music", "Construction Noise", "Animal Noise", "Vehicle Noise", "Other"],
    "Road Hazard": ["Pothole", "Fallen Tree / Post", "Flooding", "Broken Signage", "Open Manhole", "Other"],
    "Public Disturbance": ["Loitering / Intimidation", "Street Brawl", "Vandalism", "Drunken Behavior", "Other"],
    "Illegal Activity": ["Gambling", "Drug-related", "Theft / Robbery", "Illegal Vending", "Other"],
    "Domestic Dispute": ["Verbal Abuse", "Physical Abuse", "Property Dispute", "Other"],
    "Environmental": ["Garbage Dumping", "Smoke / Air Pollution", "Stagnant Water / Mosquito Breeding", "Other"],
    "Lost Item": ["Personal Belongings", "Electronics", "Documents / IDs", "Jewelry", "Cash / Wallet", "Pets / Animals", "Other"],
    "Found Item": ["Personal Belongings", "Electronics", "Documents / IDs", "Jewelry", "Cash / Wallet", "Pets / Animals", "Other"],
    "Document Refund": ["Expired Pickup Deadline", "Other"],
    "Other": ["Other"],
  };

  const isRefundCategory = form.category === "Document Refund";
  const isOtherCategory = form.category === "Other";
  const isLostFoundCategory = form.category === "Lost Item" || form.category === "Found Item";
  const needsOtherSpecification = isOtherCategory || form.subcategory === "Other";
  const resolvedSubcategory = needsOtherSpecification ? form.otherSubcategory : form.subcategory;
  const reportToday = todayInputDate();
  const incidentDateIsFuture = Boolean(form.incidentDate && form.incidentDate > reportToday);
  const refundPhoneValid = isValidPhilippineMobile(refundForm.gcashNumber);
  const reporterPhoneValid = isValidPhilippineMobile(form.reporterPhone);
  const canR1 = isRefund
    ? (refundPhoneValid && refundForm.gcashName && refundForm.trackingId)
    : (anon || (form.reporterName && reporterPhoneValid));
  const canR2 = isRefund
    ? (form.subcategory && form.subcategory !== "" && (form.subcategory !== "Other" || form.otherSubcategory.trim().length > 0))
    : (form.category && form.incidentDate && !incidentDateIsFuture && form.location && (!isLostFoundCategory || form.itemName.trim().length > 0) && (!needsOtherSpecification || form.otherSubcategory.trim().length > 0));
  const canR3 = isRefund ? evidencePhotos.length > 0 : form.details.length >= 20;

  return (
    <AnimatePresence>
      <ModalWrap onClose={onClose} wide>
        <div className="bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-5 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>{isRefund ? "Request Document Refund" : "File a Report"}</h3>
              <p className="text-white/50 text-xs">Step {rStep} of 4 — All reports handled confidentially</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {["Reporter", "Incident", "Narrative", "Review"].map((s, i) => (
              <div key={s} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-500 ${rStep > i ? "bg-white" : rStep === i + 1 ? "bg-white/60" : "bg-white/15"}`} /></div>
            ))}
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {/* Step 1 – Reporter Info */}
            {rStep === 1 && (
              <motion.div key="r1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {/* Refund toggle */}
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-sm flex items-center gap-2 text-amber-700"><DollarSign className="w-4 h-4" /> Requesting a Document Refund?</span>
                  <button onClick={() => setIsRefund(!isRefund)} className={`w-12 h-6 rounded-full transition-all ${isRefund ? "bg-amber-500" : "bg-gray-300"} relative`}>
                    <motion.div animate={{ x: isRefund ? 24 : 2 }} className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5" />
                  </button>
                </div>

                {isRefund ? (
                  <div className="space-y-4">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span><strong>Important:</strong> You must provide proof of payment (screenshot or receipt) and the claim slip / invoice in Step 3. <strong>Refund requests without valid evidence will be rejected immediately.</strong> Only 60% of the original payment will be refunded.</span>
                    </div>
                    <Input label="Document Tracking ID" required placeholder="e.g. BRG-001234" value={refundForm.trackingId} onChange={e => setRefundForm({ ...refundForm, trackingId: e.target.value })} />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Information (Required for Refund)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input label="GCash Number" required type="tel" placeholder="09XXXXXXXXX" value={refundForm.gcashNumber} onChange={e => setRefundForm({ ...refundForm, gcashNumber: normalizePhoneInput(e.target.value) })} inputMode="numeric" maxLength={11} pattern="09[0-9]{9}" />
                        {refundForm.gcashNumber && !refundPhoneValid && <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>}
                      </div>
                      <Input label="GCash Account Name" required placeholder="Full name of account owner" value={refundForm.gcashName} onChange={e => setRefundForm({ ...refundForm, gcashName: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-[#F5F7FA] rounded-xl px-4 py-3">
                      <span className="text-sm flex items-center gap-2 text-gray-600"><Shield className="w-4 h-4 text-[#008080]" /> Submit Anonymously</span>
                      <button onClick={() => setAnon(!anon)} className={`w-12 h-6 rounded-full transition-all ${anon ? "bg-[#008080]" : "bg-gray-300"} relative`}>
                        <motion.div animate={{ x: anon ? 24 : 2 }} className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5" />
                      </button>
                    </div>
                    <AnimatePresence>
                      {!anon && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                          <div className="grid grid-cols-2 gap-4">
                            <Input label="Full Name" required placeholder="Your full name" value={form.reporterName} onChange={e => ru("reporterName", e.target.value)} />
                            <div>
                              <Input label="Phone Number" required type="tel" placeholder="09XXXXXXXXX" value={form.reporterPhone} onChange={e => ru("reporterPhone", normalizePhoneInput(e.target.value))} inputMode="numeric" maxLength={11} pattern="09[0-9]{9}" />
                              {form.reporterPhone && !reporterPhoneValid && <p className="text-xs text-rose-400 mt-1">Must be 11 digits starting with 09</p>}
                            </div>
                          </div>
                          <Input label="Address (optional)" placeholder="Your address in Cubacub" value={form.reporterAddress} onChange={e => ru("reporterAddress", e.target.value)} />
                          <Select label="Your Relation to the Incident" value={form.reporterRelation} onChange={e => ru("reporterRelation", e.target.value)}>
                            {["Witness", "Victim", "Concerned Neighbor", "Barangay Official", "Other"].map(r => <option key={r}>{r}</option>)}
                          </Select>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {anon && (
                      <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-600 flex items-start gap-2">
                        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Your identity will be completely hidden. The barangay will not be able to contact you for follow-up.</span>
                      </div>
                    )}
                  </>
                )}
                <button onClick={() => { if (isRefund) { ru("category", "Document Refund"); } setRStep(2); }} disabled={!canR1} className="w-full bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            {/* Step 2 – Incident Details */}
            {rStep === 2 && (
              <motion.div key="r2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {isRefund ? (
                  <>
                    <p className="text-xs text-gray-400">Select the refund reason below. If you choose "Other," provide a short explanation.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Category" value="Document Refund" disabled />
                      <Select label="Sub-category" required value={form.subcategory} onChange={e => { ru("subcategory", e.target.value); ru("otherSubcategory", ""); }}>
                        <option value="">Select...</option>
                        <option value="Expired Pickup Deadline">Expired Pickup Deadline</option>
                        <option value="Other">Other</option>
                      </Select>
                    </div>
                    {form.subcategory === "Other" && (
                      <Input label="Please specify" required placeholder="Describe the refund reason" value={form.otherSubcategory} onChange={e => ru("otherSubcategory", e.target.value)} />
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setRStep(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                      <button onClick={() => setRStep(3)} disabled={!canR2} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400">Describe the incident as accurately as possible.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Category" required value={form.category} onChange={e => {
                        const value = e.target.value;
                        ru("category", value);
                        if ((value === "Lost Item" || value === "Found Item") && !reportDraftId.startsWith("LF-")) {
                          setReportDraftId(`LF-${Math.floor(100000 + Math.random() * 900000)}`);
                        } else if (value !== "Lost Item" && value !== "Found Item" && reportDraftId.startsWith("LF-")) {
                          setReportDraftId(`RPT-${Math.floor(100000 + Math.random() * 900000)}`);
                        }
                        if (value === "Other") {
                          ru("subcategory", "Other");
                        } else if (form.subcategory === "Other") {
                          ru("subcategory", "");
                        }
                        ru("otherSubcategory", "");
                      }}>
                        {Object.keys(subcategories).filter(c => c !== "Document Refund").map(c => <option key={c}>{c}</option>)}
                      </Select>
                      {isOtherCategory ? (
                        <Input label="Sub-category" value="Other" disabled />
                      ) : (
                        <Select label="Sub-category" value={form.subcategory} onChange={e => {
                          ru("subcategory", e.target.value);
                          ru("otherSubcategory", "");
                        }}>
                          <option value="">Select...</option>
                        {(subcategories[form.category] || []).map(s => <option key={s}>{s}</option>)}
                      </Select>
                      )}
                    </div>
                    {isLostFoundCategory && (
                      <Input
                        label="Item Name"
                        required
                        placeholder={form.category === "Lost Item" ? "e.g. Black wallet, school ID, phone" : "e.g. Keys, wallet, pet collar"}
                        value={form.itemName}
                        onChange={e => ru("itemName", e.target.value)}
                      />
                    )}
                    <div className={`grid ${isLostFoundCategory ? "grid-cols-2" : "grid-cols-3"} gap-4`}>
                      {!isLostFoundCategory && (
                        <div>
                          <Select label="Urgency Level" required value={form.urgency} onChange={e => ru("urgency", e.target.value)}>
                            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                          </Select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Date of Incident<span className="text-rose-400 ml-0.5">*</span></label>
                        <input type="date" max={reportToday} className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 outline-none" value={form.incidentDate} onChange={e => ru("incidentDate", e.target.value)} />
                        {incidentDateIsFuture && <p className="text-xs text-rose-400 mt-1">Date of incident cannot be in the future.</p>}
                      </div>
                      <div>
                        <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Approx. Time</label>
                        <input type="time" className="w-full border-0 bg-[#F5F7FA] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 outline-none" value={form.incidentTime} onChange={e => ru("incidentTime", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Exact Location" required placeholder="e.g. Corner of Rizal St & A. Luna" value={form.location} onChange={e => ru("location", e.target.value)} />
                      <Input label="Nearest Landmark" placeholder="e.g. Near Cubacub Chapel" value={form.landmark} onChange={e => ru("landmark", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Suspect / Person Involved (optional)" placeholder="Name if known" value={form.suspectName} onChange={e => ru("suspectName", e.target.value)} />
                      <Input label="Description (optional)" placeholder="e.g. Male, tall, wearing red shirt" value={form.suspectDescription} onChange={e => ru("suspectDescription", e.target.value)} />
                    </div>
                    <Input label="No. of Victims / People Affected (optional)" placeholder="e.g. 3 households" value={form.victimsInvolved} onChange={e => ru("victimsInvolved", e.target.value)} />
                    <AnimatePresence>
                      {needsOtherSpecification && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <Textarea label="Please specify (Other)*" required rows={3} placeholder="Describe the specific category or reason..." value={form.otherSubcategory} onChange={e => ru("otherSubcategory", e.target.value)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex gap-3">
                      <button onClick={() => setRStep(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                      <button onClick={() => setRStep(3)} disabled={!canR2} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
            {/* Step 3 – Narrative & Evidence */}
            {rStep === 3 && (
              <motion.div key="r3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {isRefund ? (
                  <>
                    <p className="text-xs text-gray-400">Upload proof of payment or claim slip images for refund verification.</p>
                    <div>
                      <label className="text-xs tracking-wide text-gray-500 uppercase mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-rose-500" /> Screenshot Evidence (required)</label>
                      <input ref={evidenceRef} type="file" accept="image/*" className="sr-only" onChange={addEvidence} />
                      <div className="grid grid-cols-5 gap-2">
                        {evidencePhotos.map((p, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 h-20">
                            <img src={p} alt={`Evidence ${i+1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setEvidencePhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        {evidencePhotos.length < 5 && (
                          <button type="button" onClick={() => evidenceRef.current?.click()} className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-rose-300 hover:bg-rose-50/50 transition-all">
                            <Camera className="w-4 h-4 text-gray-300" />
                            <span className="text-[9px] text-gray-300">Add</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Upload screenshots of payment receipt, proof of claim, or unclaimed document details.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Textarea label="Detailed Narrative" required rows={4} placeholder="Provide a complete account of what happened — who was involved, sequence of events, and actions taken. (Min 20 characters)" value={form.details} onChange={e => ru("details", e.target.value)} />
                    <p className="text-xs text-gray-300">{form.details.length}/20 characters minimum</p>
                    <Textarea label="Evidence Description (optional)" rows={2} placeholder="Describe any evidence: CCTV footage, witnesses' names, documents, etc." value={form.evidenceDesc} onChange={e => ru("evidenceDesc", e.target.value)} />
                    
                    {/* Photo Evidence Upload */}
                    <div>
                      <label className="text-xs tracking-wide text-gray-500 uppercase mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-rose-500" /> Photo Evidence (up to 5)</label>
                      <input ref={evidenceRef} type="file" accept="image/*" className="sr-only" onChange={addEvidence} />
                      <div className="grid grid-cols-5 gap-2">
                        {evidencePhotos.map((p, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 h-20">
                            <img src={p} alt={`Evidence ${i+1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setEvidencePhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        {evidencePhotos.length < 5 && (
                          <button type="button" onClick={() => evidenceRef.current?.click()} className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-rose-300 hover:bg-rose-50/50 transition-all">
                            <Camera className="w-4 h-4 text-gray-300" />
                            <span className="text-[9px] text-gray-300">Add</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Upload photos of the incident, damage, or any relevant evidence</p>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setRStep(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => setRStep(4)} disabled={!canR3} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">Review <ArrowRight className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
            {/* Step 4 – Review & Submit */}
            {rStep === 4 && (
              <motion.div key="r4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="bg-gradient-to-br from-[#F5F7FA] to-[#FDE8E8] rounded-2xl p-5 space-y-2.5 text-sm">
                  {isRefund ? (
                    <>
                      <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">Refund Request</p>
                      {[["Document Tracking ID", refundForm.trackingId],["GCash Number", refundForm.gcashNumber],["GCash Account Name", refundForm.gcashName]].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                      ))}
                      <div className="border-t border-gray-200 my-2" />
                      <p className="text-xs text-rose-500 uppercase tracking-wider mb-1">Refund Details</p>
                      {[["Category", form.category],["Sub-category", form.subcategory === "Other" ? `Other — ${form.otherSubcategory}` : form.subcategory],["Date & Time", `${form.incidentDate} ${form.incidentTime || ""}`]].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                      ))}
                      <p className="text-xs text-gray-400 mt-2">Report ID: <strong>{reportDraftId}</strong></p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-rose-500 uppercase tracking-wider mb-1">Reporter</p>
                      {[["Name", anon ? "Anonymous" : form.reporterName],["Phone", anon ? "Hidden" : form.reporterPhone],["Relation", anon ? "—" : form.reporterRelation]].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B]">{v}</span></div>
                      ))}
                      <div className="border-t border-gray-200 my-2" />
                      <p className="text-xs text-rose-500 uppercase tracking-wider mb-1">{isLostFoundCategory ? "Item Report" : "Incident"}</p>
                      {[
                        ["Category", `${form.category}${resolvedSubcategory ? " — " + resolvedSubcategory : ""}`],
                        ...(isLostFoundCategory ? [["Item Name", form.itemName]] : [["Urgency", form.urgency]]),
                        ["Incident Date", `${form.incidentDate} ${form.incidentTime || ""}`],
                        ["Reported At", formatExactTimestamp(form.reportCreatedAt)],
                        ["Location", form.location],
                        ["Landmark", form.landmark || "—"],
                        ["Suspect", form.suspectName || "Unknown"],
                        ["Description", form.suspectDescription || "—"],
                        ["Victims", form.victimsInvolved || "—"]
                      ].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-[#1B263B] text-right max-w-[55%]">{v}</span></div>
                      ))}
                      <div className="border-t border-gray-200 my-2" />
                      <p className="text-xs text-rose-500 uppercase tracking-wider mb-1">Narrative</p>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{form.details}</p>
                      {form.evidenceDesc && <>
                        <p className="text-xs text-rose-500 uppercase tracking-wider mt-2 mb-1">Evidence</p>
                        <p className="text-xs text-gray-600">{form.evidenceDesc}</p>
                      </>}
                      <p className="text-xs text-gray-400 mt-2">Report ID: <strong>{reportDraftId}</strong></p>
                    </>
                  )}
                </div>
                {/* Evidence photos in review */}
                {evidencePhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Attached Evidence ({evidencePhotos.length} photo{evidencePhotos.length > 1 ? "s" : ""})</p>
                    <div className="grid grid-cols-5 gap-2">
                      {evidencePhotos.map((p, i) => (
                        <img key={i} src={p} alt={`Evidence ${i+1}`} className="w-full h-16 object-cover rounded-lg border border-gray-200" />
                      ))}
                    </div>
                  </div>
                )}
                {/* Fake report warning */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>Warning:</strong> Filing a false, malicious, or fabricated report is a punishable offense under Barangay Ordinance No. 2024-03. Violators may face fines up to PHP 5,000 and community service. Anonymous reports are still traceable through digital footprints.</span>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 accent-rose-500 w-4 h-4 rounded" />
                  <span className="text-xs text-gray-500 leading-relaxed">I certify that the information provided is true and accurate to the best of my knowledge. I understand that filing a false report may result in sanctions under barangay ordinances.</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setRStep(isRefund ? 1 : 3)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
                  <button onClick={() => {
                    /* Save to services.ts so Report Handler dashboard can see this report.
                     * DJANGO: This will POST to /api/incidents/public-report/ */
                    const refundReason = form.subcategory === "Other" ? (form.otherSubcategory || "Other") : form.subcategory;
                    if (!isRefund && isLostFoundCategory) {
                      const lostFoundDraftId = reportDraftId.startsWith("LF-") ? reportDraftId : `LF-${Math.floor(100000 + Math.random() * 900000)}`;
                      createLostFoundItem({
                        item_type: form.category === "Lost Item" ? "lost" : "found",
                        reporter_name: anon ? "Anonymous" : form.reporterName,
                        reporter_phone: anon ? "" : form.reporterPhone,
                        reporter_id: lostFoundDraftId,
                        is_anonymous: anon,
                        item_name: form.itemName,
                        description: form.details,
                        category: resolvedSubcategory || undefined,
                        location: form.location,
                        date_of_incident: form.incidentDate,
                        image_url: evidencePhotos[0],
                        image_urls: evidencePhotos,
                        landmark: form.landmark,
                        person_involved: form.suspectName,
                        victims_involved: form.victimsInvolved,
                        reporter_relation: anon ? undefined : form.reporterRelation,
                        status: "pending",
                      }).then(result => {
                        const trackingId = result.id || lostFoundDraftId;
                        showToast("Lost & found report submitted successfully! Reference: " + trackingId);
                        window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
                        onClose();
                      }).catch(() => {
                        showToast("Failed to submit lost & found report. Please try again.");
                      });
                      return;
                    }

                    const reportPrintWindow = window.open("", "_blank");
                    if (!reportPrintWindow) {
                      showToast("Popup blocked. The report will still be submitted.");
                    }

                    submitPublicReport({
                        id: reportDraftId,
                        category: form.category,
                        subcategory: refundReason || "",
                        details: isRefund ? `Document refund request for tracking ID ${refundForm.trackingId}. Reason: ${refundReason}.` : form.details,
                        location: form.location,
                        incidentDate: form.incidentDate,
                        incidentTime: form.incidentTime,
                        urgency: form.urgency,
                        reporter: isRefund ? refundForm.gcashName || "Anonymous" : (anon ? "Anonymous" : form.reporterName),
                      reporterPhone: isRefund ? refundForm.gcashNumber : (anon ? "" : form.reporterPhone),
                        reporterRelation: isRefund ? "" : form.reporterRelation,
                        isAnonymous: isRefund ? false : anon,
                        landmark: form.landmark,
                        suspectName: isRefund ? "" : form.suspectName,
                        suspectDesc: isRefund ? "" : form.suspectDescription,
                        victimsInvolved: isRefund ? "" : form.victimsInvolved,
                        evidencePhotos: evidencePhotos.length ? evidencePhotos : [],
                      }).then(result => {
                        const trackingId = result.trackingId || result.id || result.report?.id || reportDraftId;
                        showToast("Report submitted successfully! Reference: " + trackingId);
                        const reportType = isRefund ? "Document Refund Request" : "Incident Report";
                        const fields = isRefund ? [
                          ["Tracking Number", trackingId],
                          ["Report Type", reportType],
                          ["Document Tracking ID", refundForm.trackingId],
                          ["GCash Number", refundForm.gcashNumber],
                          ["GCash Account Name", refundForm.gcashName],
                          ["Refund Reason", refundReason || "Not specified"],
                          ["Evidence Photos", String(evidencePhotos.length)],
                          ["Date Filed", new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })],
                        ] : [
                          ["Tracking Number", trackingId],
                          ["Report Type", reportType],
                          ["Reporter", anon ? "Anonymous" : form.reporterName],
                          ["Phone", anon ? "Hidden" : form.reporterPhone],
                          ["Relation", anon ? "Hidden" : form.reporterRelation],
                          ["Category", `${form.category}${resolvedSubcategory ? " - " + resolvedSubcategory : ""}`],
                          ["Urgency", form.urgency],
                          ["Incident Date", `${form.incidentDate} ${form.incidentTime || ""}`],
                          ["Location", form.location],
                          ["Landmark", form.landmark || ""],
                          ["Person Involved", form.suspectName || "Unknown"],
                          ["People Affected", form.victimsInvolved || ""],
                          ["Evidence Photos", String(evidencePhotos.length)],
                          ["Date Filed", new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })],
                        ];
                        reportPrintWindow?.document.write(`<html><head><title>Report Summary</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:48px;color:#1B263B;max-width:680px;margin:0 auto}.hdr{text-align:center;padding-bottom:20px;margin-bottom:20px;border-bottom:3px solid #e11d48}.hdr h1{font-size:20px}.hdr p{color:#666;font-size:12px;margin-top:4px}.badge{display:inline-block;background:#e11d48;color:white;padding:3px 14px;border-radius:20px;font-size:11px;margin-top:6px}.fld{display:flex;justify-content:space-between;gap:18px;padding:8px 0;border-bottom:1px dashed #e5e7eb}.fld .l{color:#666;font-size:12px}.fld .v{font-weight:600;font-size:12px;text-align:right;max-width:58%}.block{margin-top:18px}.block h2{font-size:13px;color:#e11d48;margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em}.block p{font-size:12px;line-height:1.55;white-space:pre-wrap}.ft{margin-top:28px;text-align:center;color:#888;font-size:10px;padding-top:16px;border-top:2px dashed #e5e7eb}</style></head><body>`);
                        reportPrintWindow?.document.write(`<div class="hdr"><h1>BARANGAY CUBACUB</h1><p>Official Report Summary</p><span class="badge">CIVIC-FLOW</span></div>`);
                        fields.filter(([, value]) => value).forEach(([l, v]) => reportPrintWindow?.document.write(`<div class="fld"><span class="l">${l}</span><span class="v">${v}</span></div>`));
                        reportPrintWindow?.document.write(`<div class="block"><h2>${isRefund ? "Refund Details" : "Narrative"}</h2><p>${isRefund ? `Document refund request for tracking ID ${refundForm.trackingId}. Reason: ${refundReason || "Not specified"}.` : form.details}</p></div>`);
                        if (!isRefund && form.evidenceDesc) {
                          reportPrintWindow?.document.write(`<div class="block"><h2>Evidence Description</h2><p>${form.evidenceDesc}</p></div>`);
                        }
                        reportPrintWindow?.document.write(`<div class="ft">Keep this summary for your records. Use the tracking number in the Report Tracker to check status updates.<br/>For inquiries call (032) 345-6789.</div></body></html>`);
                        reportPrintWindow?.document.close();
                        reportPrintWindow?.print();
                        window.dispatchEvent(new CustomEvent("reportHandlerUpdate"));
                        onClose();
                      }).catch(() => {
                        reportPrintWindow?.close();
                        showToast("Failed to submit report. Please try again.");
                      });
                  }} disabled={!agreed}
                    className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 text-white py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                    <Send className="w-4 h-4" /> Submit Report
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ModalWrap>
    </AnimatePresence>
  );
}

// --- Community Calendar (uses shared events from all dashboards) ---
function CommunityCalendar() {
  const [month, setMonth] = useState(new Date().getMonth());
  const year = 2026;
  const [hovered, setHovered] = useState<number | null>(null);
  const [sharedEvents, setSharedEvents] = useState<CalendarEvent[]>([]);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  useEffect(() => {
    const handler = () => getCalendarEvents().then(setSharedEvents);
    handler();
    window.addEventListener("calendarUpdate", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("calendarUpdate", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const monthEvents = sharedEvents.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const getEventForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.find(e => e.date === dateStr);
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-5">
        <button onClick={() => setMonth(m => Math.max(0, m - 1))} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-[#1B263B]">{monthNames[month]} {year}</h3>
        <button onClick={() => setMonth(m => Math.min(11, m + 1))} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-gray-300 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 relative">
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const ev = getEventForDay(day);
          const today = day === new Date().getDate() && month === new Date().getMonth();
          const eventClass = ev?.color ? `${ev.color} text-white shadow-md` : "";
          return (
            <div key={day}
              onMouseEnter={() => ev && setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              className={`relative text-center py-2 rounded-xl text-sm cursor-default transition-all duration-200 ${
                ev ? eventClass : today ? "ring-2 ring-[#008080] bg-[#008080]/5" : "hover:bg-gray-50"
              }`}
            >
              {day}
              {hovered === day && ev && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1B263B] text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
                  {ev.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-gradient-to-br from-[#1B263B] to-[#2d4a6e]" /> General</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md bg-gradient-to-br from-[#008080] to-[#00a89d]" /> Health</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-md ring-2 ring-[#008080]" /> Today</span>
      </div>
      {monthEvents.length > 0 && (
        <div className="mt-3 space-y-1">
          {monthEvents.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${e.color} shrink-0`} />
              <span className="text-gray-400">{monthNames[month]} {new Date(e.date).getDate()}</span>
              <span className="text-gray-600">{e.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Lost & Found Section ---
function LostFoundSection() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"post" | "resolved">("post");
  const [typeFilter, setTypeFilter] = useState<"all" | LostFoundItem["item_type"]>("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [anonymousOnly, setAnonymousOnly] = useState(false);
  const [nonAnonymousOnly, setNonAnonymousOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<LostFoundItem | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => getLostFoundItems().then(setItems).catch(() => setItems([]));
    refresh();
    window.addEventListener("reportHandlerUpdate", refresh as EventListener);
    return () => window.removeEventListener("reportHandlerUpdate", refresh as EventListener);
  }, []);

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

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
    post: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
    resolved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    solved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
    canceled: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = [item.id, item.item_name, item.reporter_name, item.category, item.location, item.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
    const matchStatus = item.status === statusFilter;
    const matchType = typeFilter === "all" || item.item_type === typeFilter;
    const matchAnonymous = !anonymousOnly || item.is_anonymous;
    const matchNonAnonymous = !nonAnonymousOnly || !item.is_anonymous;
    return matchSearch && matchStatus && matchType && matchAnonymous && matchNonAnonymous;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at || a.date_reported || "").getTime() || 0;
    const bTime = new Date(b.created_at || b.date_reported || "").getTime() || 0;
    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });

  const itemsPerPage = 4;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <section id="lost-found" className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#FAFBFC] to-[#EEF6F6]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
          <div>
            <span className="text-xs tracking-widest text-[#008080] uppercase bg-[#E8F7F7] px-4 py-1.5 rounded-full">Community Assistance</span>
            <h2 className="text-[#1B263B] text-3xl mt-4" style={{ fontFamily: "Montserrat" }}>Lost &amp; Found</h2>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm">Browse reported items using the same card-and-filter layout as the management pages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSortDirection((prev) => prev === "desc" ? "asc" : "desc")} className="text-xs bg-white text-gray-500 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
              {sortDirection === "desc" ? "Newest first" : "Oldest first"}
            </button>
            <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <input type="checkbox" checked={anonymousOnly} onChange={(e) => setAnonymousOnly(e.target.checked)} className="accent-[#008080]" />
              Anonymous only
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <input type="checkbox" checked={nonAnonymousOnly} onChange={(e) => setNonAnonymousOnly(e.target.checked)} className="accent-[#008080]" />
              Non-Anonymous only
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input placeholder="Search items..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="post">Posted</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
                <option value="all">All Type</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {paginatedItems.length > 0 ? paginatedItems.map((item, index) => {
              const itemStatus = item.status === "solved" ? "resolved" : item.status;
              const sc = statusConfig[itemStatus] || statusConfig.pending;
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }}
                  onClick={() => setViewItem(item)} className={`rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                    item.image_url ? 'relative h-48 group' : 'bg-[#FAFBFC] p-5'
                  }`}>
                  {item.image_url && (
                    <>
                      <img src={item.image_url} alt={item.item_name} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    </>
                  )}
                  <div className={`relative z-10 h-full flex flex-col ${
                    item.image_url ? 'justify-end p-4 text-white' : 'text-gray-700'
                  }`}>
                    <div className="flex flex-col sm:flex-row justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${
                        item.image_url ? 'text-white' : 'text-[#008080]'
                      }`}>{item.id}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                        item.image_url ? 'bg-white/20 text-white' : `${sc.bg} ${sc.text}`
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.image_url ? 'bg-white/50' : sc.dot
                        }`} /> {itemStatus}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${
                        item.image_url ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-500'
                      }`}>{item.item_type}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        item.image_url ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-500'
                      }`}>{item.category || "—"}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${
                      item.image_url ? 'text-white/70' : 'text-gray-300'
                    }`}>
                      <Clock className="w-3 h-3" />{formatExactTimestamp(item.created_at || item.date_reported)}
                      {(item.image_urls?.length || item.image_url) && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{item.image_urls?.length || 1}</span>}
                    </div>
                  </div>
                    <p className={`text-sm mb-1 leading-relaxed line-clamp-1 ${
                      item.image_url ? 'text-white' : 'text-[#1B263B]'
                    }`} style={{ fontWeight: 600 }}>{item.item_name}</p>
                    <p className={`text-sm mb-2 leading-relaxed line-clamp-1 ${
                      item.image_url ? 'text-white/90' : 'text-gray-600'
                    }`}>{item.description || "No description provided."}</p>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-4 text-xs text-white/70">
                      <span className="flex items-center gap-1.5">{item.is_anonymous ? <Shield className="w-3.5 h-3.5 text-[#008080]" /> : <User className="w-3.5 h-3.5" />}{item.is_anonymous ? "Anonymous" : item.reporter_name || "—"}</span>
                      <span className="flex items-center gap-1.5 hidden sm:flex"><MapPin className="w-3.5 h-3.5" />{item.location || "—"}</span>
                    </div>
                      <button onClick={(e) => { e.stopPropagation(); setViewItem(item); }} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="text-center py-10 text-gray-300 text-sm">No lost &amp; found items match the current filters.</div>
            )}
          </div>

          {filteredItems.length > 0 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-xs px-3 py-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 px-3 py-2">
                Page {currentPage} of {totalPages} {filteredItems.length > 0 && `(${filteredItems.length} items)`}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-xs px-3 py-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {viewItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#008080] to-[#00a89d] px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Lost &amp; Found Review</h3>
                    <p className="text-white/50 text-xs mt-0.5">{viewItem.id} — {formatExactTimestamp(viewItem.created_at || viewItem.date_reported)}</p>
                  </div>
                  <button onClick={() => setViewItem(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div className="rounded-2xl p-4 space-y-4 text-sm bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Reporter</p>
                      {[["Name", viewItem.is_anonymous ? "Anonymous" : viewItem.reporter_name || "—"], ["Phone", viewItem.is_anonymous ? "Hidden" : viewItem.reporter_phone || "—"], ["Relation", viewItem.reporter_relation || "—"]].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-[#1B263B]">{value}</span></div>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Item</p>
                      <div className="text-[#1B263B] text-sm">{viewItem.item_name || "—"}</div>
                      <div className="text-[#1B263B] text-sm capitalize">{viewItem.item_type}</div>
                      <div className="text-xs text-gray-400 mt-1">{viewItem.category || "—"}</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Item / Incident</p>
                    {[ ["Item Name", viewItem.item_name || "—"], ["Type", viewItem.item_type === "lost" ? "Lost Item" : "Found Item"], ["Location", viewItem.location || "—"], ["Landmark", viewItem.landmark || "—"], ["Person Involved", viewItem.person_involved || "—"], ["Victims", viewItem.victims_involved || "—"] ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-[#1B263B] max-w-[55%] text-right">{value}</span></div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Narrative</p>
                    <div className="text-sm text-[#1B263B] whitespace-pre-wrap">{viewItem.description || "—"}</div>
                  </div>

                  {((viewItem.image_urls && viewItem.image_urls.length > 0) || viewItem.image_url) && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-[#008080] uppercase tracking-wider mb-2">Evidence ({viewItem.image_urls?.length || 1})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(viewItem.image_urls?.length ? viewItem.image_urls : [viewItem.image_url]).filter(Boolean).map((photo, i) => (
                          <button key={i} onClick={() => setViewPhoto(photo || null)} className="w-full rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={photo || ""} alt={`${viewItem.item_name} ${i + 1}`} className="w-full h-32 object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#FFF8E7] border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                  <span>ℹ️</span>
                  <span>This item is currently <strong>{viewItem.status === "solved" ? "resolved" : viewItem.status}</strong>.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </section>
  );
}

// --- LANDING PAGE ---
export default function LandingPage() {
  const navigate = useNavigate();
  const [showDocForm, setShowDocForm] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showReportTracker, setShowReportTracker] = useState(false);
  const [showClinic, setShowClinic] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isDocumentRefund, setIsDocumentRefund] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [trackerInput, setTrackerInput] = useState("");
  const [reportTrackingId, setReportTrackingId] = useState("");
  const [reportTrackerInput, setReportTrackerInput] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [financeProjects, setFinanceProjects] = useState<PublicProject[]>([]);
  const [financeIndex, setFinanceIndex] = useState(0);
  const [landingStats, setLandingStats] = useState<PublicLandingStats>({
    documents: 0,
    clinic: 0,
    case_management: 0,
    document_refund: 0,
    lost_found: 0,
    total_projects: 0,
    residents_served: 0,
    clinic_status: "closed",
  });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    getPublicProjects()
      .then((rows) => setFinanceProjects(rows || []))
      .catch(() => setFinanceProjects([]));
  }, []);

  useEffect(() => {
    const loadStats = () => {
      getPublicLandingStats()
        .then((stats) => setLandingStats({
          documents: Number(stats?.documents ?? 0),
          clinic: Number(stats?.clinic ?? 0),
          case_management: Number(stats?.case_management ?? 0),
          document_refund: Number(stats?.document_refund ?? 0),
          lost_found: Number(stats?.lost_found ?? 0),
          total_projects: Number(stats?.total_projects ?? 0),
          residents_served: Number(stats?.residents_served ?? 0),
          clinic_status: stats?.clinic_status || "closed",
        }))
        .catch(() => {
          setLandingStats(prev => ({
            ...prev,
            total_projects: financeProjects.length || prev.total_projects,
          }));
        });
    };
    loadStats();
    const intervalId = window.setInterval(loadStats, 30000);
    return () => window.clearInterval(intervalId);
  }, [financeProjects.length]);

  useEffect(() => {
    if (financeProjects.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setFinanceIndex((prev) => {
        if (financeProjects.length <= 1) return 0;
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * financeProjects.length);
        }
        return next;
      });
    }, 4500);
    return () => window.clearInterval(intervalId);
  }, [financeProjects]);

  useEffect(() => {
    if (!financeProjects.length) {
      setFinanceIndex(0);
      return;
    }
    if (financeIndex > financeProjects.length - 1) {
      setFinanceIndex(0);
    }
  }, [financeProjects, financeIndex]);

  const displayedFinanceProject = financeProjects[financeIndex] || null;
  const currentProjectsCount = financeProjects.filter((project) => project.status !== "completed").length;
  const financeStatus = getStatusBadge(displayedFinanceProject?.status || "ongoing");
  const displayedFinanceImage = displayedFinanceProject?.image || projectImg;
  const displayedFinanceProgress = displayedFinanceProject?.progress ?? 0;
  const displayedFinanceBudget = displayedFinanceProject?.budget ?? 0;
  const displayedFinanceSpent = displayedFinanceProject?.spent ?? 0;
  const displayedFinanceTitle = displayedFinanceProject?.name || "No project data yet";
  const clinicOpen = landingStats.clinic_status === "open";

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* --- Header --- */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? "bg-[#1B263B]/95 backdrop-blur-xl shadow-xl shadow-black/10 py-2" : "bg-transparent py-4"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 3 }} className="w-10 h-10 rounded-md overflow-hidden shadow-lg shadow-[#008080]/30">
              <img src={logoImg} alt="Barangay Cubacub logo" className="w-full h-full object-contain" />
            </motion.div>
            <div>
              <h4 className="text-white leading-none tracking-tight" style={{ fontFamily: "Montserrat" }}>Cubacub</h4>
              <p className="text-[10px] text-white/40 tracking-widest uppercase">Civic-Flow</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <AccuWeatherWidget />
            <LiveClock />
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {["Services", "Engagement", "About"].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all">{l}</a>
              ))}
            </nav>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-white"><Menu className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="md:hidden overflow-hidden bg-[#1B263B]/95 backdrop-blur-xl">
              <div className="px-6 py-4 space-y-2">
                {["Services", "Engagement", "About"].map(l => (
                  <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileNav(false)} className="block text-white/70 hover:text-white py-2 text-sm">{l}</a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* --- Hero --- */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback src={heroImg} alt="Cubacub Community" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1B263B]/90 via-[#1B263B]/70 to-[#008080]/40" />
          {/* Floating orbs */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#008080]/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#1B263B]/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-white/80">Mandaue City, Cebu, Philippines</span>
              </div>
              <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl mb-5 leading-tight tracking-tight" style={{ fontFamily: "Montserrat" }}>
                Maayong Adlaw,<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4aa] to-[#008080]">Cubacub!</span>
              </h1>
              <p className="text-white/60 max-w-md text-base sm:text-lg mb-8 leading-relaxed">
                Your modern digital gateway to barangay services. Request documents, book health appointments, and engage with your community — all in one place.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowDocForm(true)} className="bg-gradient-to-r from-[#008080] to-[#00a89d] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:shadow-xl hover:shadow-[#008080]/30 transition-all">
                  <FileText className="w-4 h-4" /> Request Document
                </button>
                <button onClick={() => setShowClinic(true)} className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/20 transition-all">
                  <Stethoscope className="w-4 h-4" /> Book Clinic
                </button>
              </div>
            </motion.div>

            {/* Floating Stats Cards */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: <Users className="w-5 h-5" />, value: landingStats.residents_served, label: "Residents Served", color: "from-[#1B263B] to-[#2d4a6e]" },
                { icon: <FileText className="w-5 h-5" />, value: landingStats.documents, label: "Documents Issued", color: "from-[#008080] to-[#00a89d]" },
                { icon: <Heart className="w-5 h-5" />, value: clinicOpen ? "Open" : "Closed", label: "Clinic", color: clinicOpen ? "from-emerald-500 to-teal-600" : "from-rose-500 to-red-600" },
                { icon: <TrendingUp className="w-5 h-5" />, value: landingStats.total_projects || financeProjects.length, label: "Total Projects", color: "from-violet-500 to-purple-600" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 sm:p-5 text-white shadow-xl h-full`}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">{s.icon}</div>
                  <p className="text-xl sm:text-2xl" style={{ fontFamily: "Montserrat" }}>
                    {typeof s.value === "number" ? <AnimCounter target={s.value} /> : s.value}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* --- Services Grid --- */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-xs tracking-widest text-[#008080] uppercase bg-[#008080]/10 px-4 py-1.5 rounded-full">What We Offer</span>
          <h2 className="text-[#1B263B] text-3xl mt-4" style={{ fontFamily: "Montserrat" }}>Barangay Services</h2>
          <p className="text-gray-400 mt-2 max-w-md mx-auto text-sm">Access government services without the hassle. Everything you need, right at your fingertips.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Document Request */}
          <motion.button
            whileHover={{ y: -6 }}
            onClick={() => setShowDocForm(true)}
            className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-7 text-left group hover:shadow-xl hover:shadow-[#1B263B]/10 transition-shadow"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B263B] to-[#2d4a6e] flex items-center justify-center mb-5 shadow-lg shadow-[#1B263B]/20 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-[#1B263B] mb-2">Document Request</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Request barangay clearance, residency certificates, indigency, and more with our 3-step process.</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-[#008080] opacity-0 group-hover:opacity-100 transition-opacity">
              Start Request <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Document Tracker */}
          <motion.div whileHover={{ y: -6 }} className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-7 hover:shadow-xl hover:shadow-[#008080]/10 transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#008080] to-[#00a89d] flex items-center justify-center mb-5 shadow-lg shadow-[#008080]/20">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-[#1B263B] mb-2">Track Document</h3>
            <p className="text-sm text-gray-400 mb-4">Real-time status updates on your document request.</p>
            <div className="flex gap-2">
              <input placeholder="e.g. BRG-001234" className="flex-1 bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080]/30 border-0" value={trackerInput} onChange={e => setTrackerInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && trackerInput) { setTrackingId(trackerInput); setShowTracker(true); }}} />
              <button onClick={() => { if (trackerInput) { setTrackingId(trackerInput); setShowTracker(true); } }} className="bg-gradient-to-r from-[#008080] to-[#00a89d] text-white px-4 py-2.5 rounded-xl text-sm hover:shadow-md transition-all">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Document requests are deleted 4 months after the request date.</p>
          </motion.div>

          {/* Report Tracker */}
          <motion.div whileHover={{ y: -6 }} className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-7 hover:shadow-xl hover:shadow-rose-500/10 transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-[#1B263B] mb-2">Track Report</h3>
            <p className="text-sm text-gray-400 mb-4">Check incident and refund request status.</p>
            <div className="flex gap-2">
              <input placeholder="e.g. RPT-001 or RDF-001" className="flex-1 bg-[#F5F7FA] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300 border-0" value={reportTrackerInput} onChange={e => setReportTrackerInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && reportTrackerInput) { setReportTrackingId(reportTrackerInput); setShowReportTracker(true); }}} />
              <button onClick={() => { if (reportTrackerInput) { setReportTrackingId(reportTrackerInput); setShowReportTracker(true); } }} className="bg-gradient-to-r from-rose-500 to-orange-500 text-white px-4 py-2.5 rounded-xl text-sm hover:shadow-md transition-all">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">For incident reports and request refunds only.</p>
          </motion.div>

          {/* Clinic Booking */}
          <motion.button
            whileHover={{ y: -6 }}
            onClick={() => clinicOpen && setShowClinic(true)}
            disabled={!clinicOpen}
            className={`bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-7 text-left group transition-shadow ${clinicOpen ? "hover:shadow-xl hover:shadow-[#008080]/10" : "opacity-70 cursor-not-allowed"}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-[#1B263B] mb-2">Clinic Booking</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{clinicOpen ? "Schedule an appointment at the Cubacub Health Center. Pick your preferred date and time slot." : "Clinic booking is currently closed by the health center."}</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-[#008080] opacity-0 group-hover:opacity-100 transition-opacity">
              {clinicOpen ? "Book Now" : "Closed"} <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        </div>
      </section>

      {/* --- Engagement Grid --- */}
      <section id="engagement" className="bg-gradient-to-b from-[#FAFBFC] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-xs tracking-widest text-[#008080] uppercase bg-[#008080]/10 px-4 py-1.5 rounded-full">Stay Connected</span>
            <h2 className="text-[#1B263B] text-3xl mt-4" style={{ fontFamily: "Montserrat" }}>Community Engagement</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Finance Transparency */}
            <motion.div whileHover={{ y: -6 }} className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 overflow-hidden group cursor-pointer" onClick={() => navigate("/finance")}>
              <div className="relative h-36 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayedFinanceProject?.id || "fallback"}
                    initial={{ x: 48, opacity: 0.75 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -48, opacity: 0.75 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <ImageWithFallback src={displayedFinanceImage} alt={displayedFinanceTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B263B]/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                  <span className={`text-xs ${financeStatus.bg} text-white px-2.5 py-1 rounded-full`}>{financeStatus.label}</span>
                  <span className="text-xs text-white/60">{currentProjectsCount} Current Projects</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[#008080]" />
                  <span className="text-xs text-[#008080] tracking-wider uppercase">Finance Transparency</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={`${displayedFinanceProject?.id || "fallback"}-title`}
                    initial={{ x: 28, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -28, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-[#1B263B] mb-2"
                  >
                    {displayedFinanceTitle}
                  </motion.h3>
                </AnimatePresence>
                <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                  <motion.div key={`${displayedFinanceProject?.id || "fallback"}-progress`} initial={{ width: 0 }} animate={{ width: `${displayedFinanceProgress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="bg-gradient-to-r from-[#008080] to-[#00a89d] h-full rounded-full" />
                </div>
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-gray-400">PHP {formatCurrency(displayedFinanceBudget)} Budget</span>
                  <span className="text-[#008080]">{displayedFinanceProgress}%</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-3">
                  <span>Spent: PHP {formatCurrency(displayedFinanceSpent)}</span>
                  <span>Remaining: PHP {formatCurrency(displayedFinanceBudget - displayedFinanceSpent)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#008080] opacity-0 group-hover:opacity-100 transition-opacity">
                  View All Projects & Budget <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>

            {/* Reports & Complaints */}
            <motion.button whileHover={{ y: -6 }} onClick={() => setShowReport(true)} className="bg-white rounded-3xl shadow-lg shadow-black/5 border border-gray-100 p-7 text-left group hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-[#1B263B] mb-2">Reports & Complaints</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">Submit a report or complaint. Anonymous option available for your protection.</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                  <Shield className="w-3 h-3" /> Anonymous
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                  <Zap className="w-3 h-3" /> Fast Response
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                File Report <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Calendar */}
            <CommunityCalendar />
          </div>
        </div>
      </section>

      {/* --- Lost & Found --- */}
      <LostFoundSection />



      {/* --- About / Footer --- */}
      <section id="about" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B263B] via-[#1B263B] to-[#0a1628]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#008080]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#008080]/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-md overflow-hidden">
                  <img src={logoImg} alt="Barangay Cubacub logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-white" style={{ fontFamily: "Montserrat" }}>Barangay Cubacub</h3>
                  <p className="text-xs text-white/30">Civic-Flow Digital Platform</p>
                </div>
              </div>
              <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                Serving the community of Mandaue City, Cebu with transparency, efficiency, and modern digital governance. Together we build a better Cubacub.
              </p>
            </div>

            <div>
              <h4 className="text-white mb-4 text-sm tracking-wider uppercase">Quick Links</h4>
              <div className="space-y-3 text-sm">
                {[["Services", "#services"], ["Community", "#engagement"], ["About", "#about"]].map(([l, h]) => (
                  <a key={l} href={h as string} className="flex items-center gap-2 text-white/40 hover:text-[#00a89d] transition-colors">
                    <CircleDot className="w-3 h-3" /> {l}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white mb-4 text-sm tracking-wider uppercase">Contact</h4>
              <div className="space-y-3 text-sm text-white/40">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#008080] shrink-0" /> Cubacub, Mandaue City, Cebu 6014</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#008080] shrink-0" /> (032) 345-6789</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#008080] shrink-0" /> cubacub@mandauecity.gov.ph</p>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/20">&copy; 2026 Barangay Cubacub Civic-Flow. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs text-white/20">
              <Sparkles className="w-3 h-3 text-[#008080]" /> Built with love for the community
            </div>
          </div>
        </div>
      </section>

      {/* --- Modals --- */}
      <AnimatePresence>
        {showDocForm && <DocumentRequestForm onClose={() => setShowDocForm(false)} />}
        {showTracker && <TrackerModal onClose={() => setShowTracker(false)} trackingId={trackingId} />}
        {showReportTracker && <ReportTrackerModal onClose={() => setShowReportTracker(false)} trackingId={reportTrackingId} />}
        {showClinic && <ClinicBookingModal onClose={() => setShowClinic(false)} clinicOpen={clinicOpen} />}
        {showReport && <ReportModal onClose={() => { setShowReport(false); setIsDocumentRefund(false); }} isDocumentRefund={isDocumentRefund} />}
      </AnimatePresence>
    </div>
  );
}



