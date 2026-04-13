import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import { ToastProvider } from "./lib/toast.jsx";
import "./index.css";

// DEBUG: find which component is undefined
console.log("[DEBUG] React:", typeof React);
console.log("[DEBUG] ReactDOM:", typeof ReactDOM);
console.log("[DEBUG] BrowserRouter:", typeof BrowserRouter);
console.log("[DEBUG] QueryClientProvider:", typeof QueryClientProvider);
console.log("[DEBUG] App:", typeof App);
console.log("[DEBUG] AuthProvider:", typeof AuthProvider);
console.log("[DEBUG] ToastProvider:", typeof ToastProvider);

const qc = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
