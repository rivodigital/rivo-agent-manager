import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import AgentConfig from "./pages/AgentConfig.jsx";
import Agents from "./pages/Agents.jsx";
import Providers from "./pages/Providers.jsx";
import Conversations from "./pages/Conversations.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentConfig />} />
        <Route path="providers" element={<Providers />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
