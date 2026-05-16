/**
 * ============================================================================
 * APP.TSX — Application Entry Point
 * ============================================================================
 * This is the ROOT component. It loads React Router which handles all pages.
 * The router is defined in ./routes.ts
 *
 * You should NOT need to edit this file for Django integration.
 * All routing is handled by routes.ts, and all data by api/services.ts.
 * ============================================================================
 */
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}