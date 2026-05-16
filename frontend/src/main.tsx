/**
 * ============================================================================
 * MAIN.TSX — React Bootstrap / Mount File
 * ============================================================================
 * This is the TRUE starting point of the React app.
 *
 * What happens here (in order):
 *   1. Import React and ReactDOM (the core React libraries)
 *   2. Import the global CSS styles (fonts, Tailwind, theme colors)
 *   3. Import the root App component
 *   4. Find the <div id="root"> element in index.html
 *   5. Mount (render) the entire React app inside that div
 *
 * You should NOT need to edit this file.
 * ============================================================================
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Find the <div id="root"> in index.html and mount React into it.
// Everything you see in the browser is rendered inside this one div.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
