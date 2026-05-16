/**
 * ============================================================================
 * LAYOUT — Root Layout Wrapper
 * ============================================================================
 * Wraps ALL pages with shared providers:
 * - ToastProvider: Allows any page to show toast notifications
 * - Outlet: React Router renders the current page here
 *
 * No changes needed for Django integration.
 * ============================================================================
 */
import { Outlet } from "react-router";
import { ToastProvider } from "./Toast";

export default function Layout() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}