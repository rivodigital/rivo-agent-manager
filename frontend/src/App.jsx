import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import AgentConfig from "./pages/AgentConfig.jsx";
import Agents from "./pages/Agents.jsx";
import Providers from "./pages/Providers.jsx";
import Conversations from "./pages/Conversations.jsx";
import Blocklist from "./pages/Blocklist.jsx";
import Users from "./pages/Users.jsx";

// Convenience wrapper — one boundary per page so sidebar stays intact on crash
function Page({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    // Top-level boundary: last-resort catch-all (e.g. Layout itself crashes)
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Page><Dashboard /></Page>} />
          <Route path="clients" element={<Page><Clients /></Page>} />
          <Route path="clients/:id" element={<Page><ClientDetail /></Page>} />
          <Route path="agents" element={<Page><Agents /></Page>} />
          <Route path="agents/:id" element={<Page><AgentConfig /></Page>} />
          <Route path="providers" element={<Page><Providers /></Page>} />
          <Route path="conversations" element={<Page><Conversations /></Page>} />
          <Route path="blocklist" element={<Page><Blocklist /></Page>} />
          <Route path="users" element={<Page><Users /></Page>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
