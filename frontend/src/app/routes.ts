/**
 * ============================================================================
 * ROUTES CONFIGURATION
 * ============================================================================
 * This file defines ALL the URL paths (pages) in the application.
 *
 * ROUTE MAP:
 *   /            → LandingPage (public homepage)
 *   /login       → LoginPage (staff login)
 *   /dashboard   → Dashboard (role-based staff dashboards)
 *   /finance     → FinancePage (public finance transparency)
 *   (SystemCanvas was removed - it was just a design asset page)
 *
 * HOW IT WORKS:
 * - Layout wraps ALL pages (provides the Toast notification system)
 * - Each path loads a different component
 * - The Dashboard checks localStorage for the user's role and shows
 *   the correct dashboard (DocumentHandler, ReportHandler, etc.)
 *
 * DJANGO NOTE:
 * These are frontend-only routes. Django handles API routes separately.
 * Your Django urls.py should only have /api/* endpoints.
 * React Router handles all the page navigation on the frontend.
 * ============================================================================
 */
import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import FinancePage from "./components/FinancePage";

export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: LandingPage },       // Public homepage
      { path: "/staff-login", Component: LoginPage }, // Staff login
      { path: "/dashboard", Component: Dashboard }, // Role-based dashboard
      { path: "/finance", Component: FinancePage }, // Public finance transparency
    ],
  },
]);
