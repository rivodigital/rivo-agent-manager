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
  ArrowRight,
} from "lucide-react";

function statusBadgeClass(status) {
  switch (status) {
    case "active": return "badge-success";
    case "qualified": return "badge-success";
    case "escalated": return "badge-warning";
    case "closed": return "badge-neutral";
    default: return "badge-neutral";
  }
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get("/dashboard/stats"),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-muted text-sm">carregando…</div>
    </div>
  );
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
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-brand-muted text-sm mt-1">Visão geral dos agentes em operação.</p>
        </div>
        <Link to="/agents" className="btn btn-outline w-fit">
          <Bot size={16} />
          Novo Agente
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="stat-label">{label}</div>
              <div className="w-10 h-10 rounded-xl bg-brand-accent/5 border border-brand-accent/10 flex items-center justify-center group-hover:bg-brand-accent/10 transition-colors">
                <Icon size={18} className="text-brand-accent" />
              </div>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Phone size={14} className="text-green-500" />
          </div>
          <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">
            WhatsApp
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {waStats.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <div className="stat-label">{label}</div>
                <Icon size={16} className="text-green-500" />
              </div>
              <div className="stat-value">{value}</div>
              {sub && <div className="text-[11px] font-mono text-brand-muted mt-1">{sub}</div>}
            </div>
          ))}
        </div>
      </section>

      {data.alerts?.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle size={18} className="text-yellow-500" />
            <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em]">Alertas</h2>
          </div>
          <ul className="space-y-3">
            {data.alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-brand-muted border-l-2 border-yellow-500/40 pl-4">
                {a.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">
              Agentes Recentes
            </h2>
            <Link to="/agents" className="text-[11px] font-mono text-brand-accent hover:text-brand-accent/80 transition flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentAgents.map((a) => (
              <Link
                to={`/agents/${a.id}`}
                key={a.id}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-brand-surface/50 transition border border-transparent hover:border-brand-border/50"
              >
                <div>
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-brand-muted mt-0.5">
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
              <div className="text-center py-8">
                <Bot size={32} className="text-brand-muted/30 mx-auto mb-2" />
                <p className="text-brand-muted text-sm">Nenhum agente cadastrado.</p>
              </div>
            )}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">
              Conversas Recentes
            </h2>
            <Link to="/conversations" className="text-[11px] font-mono text-brand-accent hover:text-brand-accent/80 transition flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(data.recentConversations || []).map((c) => (
              <Link
                to="/conversations"
                key={c.id}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-brand-surface/50 transition border border-transparent hover:border-brand-border/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MessageSquare size={14} className="text-brand-muted shrink-0" />
                    {c.leadName || "Sem nome"}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5 truncate">
                    {c.agent?.name}
                    {c.agent?.client && <> · {c.agent.client.name}</>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span>
                  <span className="text-[10px] font-mono text-brand-muted/60">
                    {new Date(c.lastMessageAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </Link>
            ))}
            {(!data.recentConversations || data.recentConversations.length === 0) && (
              <div className="text-center py-8">
                <MessageSquare size={32} className="text-brand-muted/30 mx-auto mb-2" />
                <p className="text-brand-muted text-sm">Nenhuma conversa ainda.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
