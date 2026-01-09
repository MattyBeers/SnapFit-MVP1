import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
/* 
 * Organized CSS Architecture - See /src/styles/index.css for structure
 * Edit individual files in /src/styles/ for component/page-specific changes
 * See CSS_ARCHITECTURE.md for documentation
 */
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div className="sf-app">
      <div className="sf-shell">
        <App />
      </div>
    </div>
  </React.StrictMode>
);
