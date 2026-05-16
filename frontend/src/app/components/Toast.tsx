/**
 * ============================================================================
 * TOAST NOTIFICATION SYSTEM
 * ============================================================================
 * Provides popup notifications (success/error/info) from anywhere in the app.
 *
 * HOW TO USE IN ANY COMPONENT:
 *   import { useToast } from "../Toast";
 *   const { showToast } = useToast();
 *   showToast("Document approved!", "success");  // or "error" or "info"
 *
 * No changes needed for Django integration.
 * ============================================================================
 */
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertTriangle, Info, X, Sparkles } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

const ToastContext = createContext<{ showToast: (message: string, type?: ToastType) => void }>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = {
    success: <CheckCircle className="w-5 h-5 shrink-0" />,
    error: <AlertTriangle className="w-5 h-5 shrink-0" />,
    info: <Info className="w-5 h-5 shrink-0" />,
  };

  const styles = {
    success: "from-emerald-500 to-teal-600",
    error: "from-rose-500 to-red-600",
    info: "from-[#1B263B] to-[#2d3f5e]",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.85 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`pointer-events-auto bg-gradient-to-r ${styles[t.type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm min-w-[280px]`}
            >
              {icons[t.type]}
              <span className="text-sm flex-1">{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-60 hover:opacity-100 transition-opacity shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}