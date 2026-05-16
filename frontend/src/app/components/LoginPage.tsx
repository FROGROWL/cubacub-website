import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, LogIn, ArrowLeft, AlertCircle } from "lucide-react";
import { login } from "../api/services";

const logoImg = new URL("./images/logo.png", import.meta.url).href;

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    login(username, password).then(user => {
      if (user) {
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        setLoading(false);
        setError("Invalid credentials. Please check your username and password.");
      }
    }).catch((err) => {
      setLoading(false);
      setError(err?.message?.includes("Network error")
        ? "Cannot reach the backend server. Please check that Django is running."
        : "Invalid credentials. Please check your username and password.");
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B263B] via-[#1B263B] to-[#0a1628]" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#008080]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#008080]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col justify-center px-16 z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-16 h-16 rounded-md overflow-hidden mb-8 shadow-2xl shadow-[#008080]/30">
              <img src={logoImg} alt="Barangay Cubacub logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white text-4xl leading-tight tracking-tight mb-4" style={{ fontFamily: "Montserrat" }}>
              Welcome to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4aa] to-[#008080]">Civic-Flow</span>
            </h1>
            <p className="text-white/40 max-w-sm leading-relaxed text-sm">
              The digital governance platform for Barangay Cubacub. Manage documents, reports, clinic operations, and more.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FAFBFC]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#008080] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Public Page
          </button>

          <div className="mb-8">
            <div className="lg:hidden w-12 h-12 rounded-md overflow-hidden mb-5 shadow-lg shadow-[#008080]/20">
              <img src={logoImg} alt="Barangay Cubacub logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-[#1B263B] text-2xl tracking-tight" style={{ fontFamily: "Montserrat" }}>Staff Portal</h2>
            <p className="text-gray-400 text-sm mt-1">Sign in to access the dashboard</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-2xl p-4 mb-5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Username</label>
              <input
                className="w-full border-0 bg-white rounded-2xl px-4 py-3.5 text-sm shadow-sm focus:ring-2 focus:ring-[#008080]/30 outline-none transition-all"
                placeholder="Enter username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div>
              <label className="text-xs tracking-wide text-gray-500 uppercase mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full border-0 bg-white rounded-2xl px-4 py-3.5 text-sm shadow-sm pr-12 focus:ring-2 focus:ring-[#008080]/30 outline-none transition-all"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={loading || !username.trim() || !password}
              className="w-full bg-gradient-to-r from-[#1B263B] to-[#2d4a6e] text-white py-3.5 rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-[#1B263B]/20 transition-all"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
