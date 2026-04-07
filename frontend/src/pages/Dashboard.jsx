import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { get } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import {
  AlertTriangle,
  Users,
  Bot,
  Activity,
  FileEdit,
  MessageSquare,
  Wifi,
  Phone,
  UserCheck,
  Clock,
} from "lucide-react";

function statusBadgeClass(status) {
  switch (status) {
    case "active": return "text-accent border-accent/40 bg-accent/10";
    case "qualified": return "text-accent-green border-accent-green/40 bg-accent-green/10";
    case "escalated": return "text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10";
    case "closed": return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
    default: return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
  }
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get("/dashboard/stats"),
  });

  if (isLoading) return <div className="text-zinc-500">carregando…</div>;
  if (!data) return null;

  const stats = [
    { label: "Clientes", value: data.totals.clients, icon: Users },
    { label: "Agentes", value: data.totals.agents, icon: Bot },
    { label: "Ativos", value: data.totals.activeAgents, icon: Activity },
    { label: "Drafts", value: data.totals.draftAgents, icon: FileEdit },
  ];

  const wa = data.whatsapp || {};
  const waStats = [
    { label: "Instâncias", value: wa.instancesTotal || 0, sub: `${wa.instancesConnected || 0} conectadas`, icon: Wifi },
    { label: "Conversas Ativas", value: wa.conversationsActive || 0, icon: MessageSquare },
    { label: "Conversas Hoje", value: wa.conversationsToday || 0, icon: Clock },
    { label: "Qualificados Hoje", value: wa.qualifiedToday || 0, icon: UserCheck },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">Mission Control</h1>
        <p className="text-zinc-500 text-sm mt-1">Visão geral dos agentes em operação.</p>
      </header>

      {/* Plataforma stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
              <Icon size={16} className="text-accent" />
            </div>
            <div className="text-3xl font-mono font-bold mt-3">{value}</div>
          </div>
        ))}
      </div>

      {/* WhatsApp stats */}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-wider mb-3 text-zinc-400 flex items-center gap-2">
          <Phone size={13} className="text-accent-green" />
          WhatsApp
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {waStats.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
                <Icon size={16} className="text-accent-green" />
              </div>
              <div className="text-3xl font-mono font-bold mt-3">{value}</div>
              {sub && <div className="text-[10px] font-mono text-zinc-500 mt-1">{sub}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-accent-yellow" />
            <h2 className="font-mono text-xs uppercase tracking-wider">Alertas</h2>
          </div>
          <ul className="space-y-2">
            {data.alerts.map((a, i) => (
              <li key={i} className="text-sm text-zinc-300 border-l-2 border-accent-yellow pl-3">
                {a.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Two-column layout for recent agents and conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <section className="card p-5">
          <h2 className="font-mono text-xs uppercase tracking-wider mb-4 text-zinc-400">Agentes Recentes</h2>
          <div className="space-y-2">
            {data.recentAgents.map((a) => (
              <Link
                to={`/agents/${a.id}`}
                key={a.id}
                className="flex items-center justify-between p-3 rounded-md hover:bg-bg-surface transition border border-transparent hover:border-border"
              >
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {a.client.name} · {a.provider.label} · {a.model}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge status={a.implementationPhase}>{a.implementationPhase}</Badge>
                  <Badge status={a.status}>{a.status}</Badge>
                </div>
              </Link>
            ))}
            {data.recentAgents.length === 0 && (
              <div className="text-zinc-500 text-sm">Nenhum agente cadastrado.</div>
            )}
          </div>
        </section>

        {/* Recent Conversations */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-400">Conversas Recentes</h2>
            <Link to="/conversations" className="text-xs text-accent hover:text-accent/80 transition">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {(data.recentConversations || []).map((c) => (
              <Link
                to="/conversations"
                key={c.id}
                className="flex items-center justify-between p-3 rounded-md hover:bg-bg-surface transition border border-transparent hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MessageSquare size={13} className="text-zinc-500 shrink-0" />
                    {c.leadName || "Sem nome"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {c.agent?.name}
                    {c.agent?.client && <> · {c.agent.client.name}</>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  <span className={`badge text-[10px] ${statusBadgeClass(c.status)}`}>{c.status}</span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    {new Date(c.lastMessageAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </Link>
            ))}
            {(!data.recentConversations || data.recentConversations.length === 0) && (
              <div className="text-zinc-500 text-sm">Nenhuma conversa ainda.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
