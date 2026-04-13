import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
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

// DEBUG: find undefined component
console.log("[DEBUG-APP] Routes:", typeof Routes);
console.log("[DEBUG-APP] Route:", typeof Route);
console.log("[DEBUG-APP] Navigate:", typeof Navigate);
console.log("[DEBUG-APP] Layout:", typeof Layout);
console.log("[DEBUG-APP] ProtectedRoute:", typeof ProtectedRoute);
console.log("[DEBUG-APP] Login:", typeof Login);
console.log("[DEBUG-APP] Dashboard:", typeof Dashboard);
console.log("[DEBUG-APP] Clients:", typeof Clients);
console.log("[DEBUG-APP] ClientDetail:", typeof ClientDetail);
console.log("[DEBUG-APP] AgentConfig:", typeof AgentConfig);
console.log("[DEBUG-APP] Agents:", typeof Agents);
console.log("[DEBUG-APP] Providers:", typeof Providers);
console.log("[DEBUG-APP] Conversations:", typeof Conversations);
console.log("[DEBUG-APP] Blocklist:", typeof Blocklist);
console.log("[DEBUG-APP] Users:", typeof Users);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentConfig />} />
        <Route path="providers" element={<Providers />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="blocklist" element={<Blocklist />} />
        <Route path="users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
