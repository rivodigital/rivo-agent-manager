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
  Star,
  TrendingUp,
  Download,
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

function scoreColor(score) {
  if (score == null) return "text-brand-muted";
  if (score <= 30) return "text-red-400";
  if (score <= 60) return "text-yellow-400";
  return "text-green-400";
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

  const t = data.totals || {};
  const bs = data.byStatus || {};
  const wa = data.whatsapp || {};

  const exportCSV = (endpoint, filename) => {
    const token = localStorage.getItem("token");
    fetch(`/api/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => console.error("Export failed:", e));
  };

  const summaryCards = [
    { label: "Total de Conversas", value: t.totalConversations || 0, icon: MessageSquare, color: "text-brand-accent" },
    { label: "Conversas Ativas", value: t.activeConversations || 0, icon: Activity, color: "text-green-500" },
    { label: "Leads Qualificados", value: t.qualifiedLeads || 0, icon: UserCheck, color: "text-blue-500" },
    { label: "CSAT Médio", value: t.csatAvg != null ? `${t.csatAvg}/5` : "—", icon: Star, color: "text-yellow-500" },
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
        <button className="btn btn-outline w-fit" onClick={() => exportCSV("reports/conversations", "conversations.csv")}>
          <Download size={16} />
          Exportar
        </button>
        <button className="btn btn-outline w-fit" onClick={() => exportCSV("reports/metrics", "metrics.csv")}>
          <Download size={16} />
          Métricas
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="stat-label">{label}</div>
              <div className={`w-10 h-10 rounded-xl bg-brand-accent/5 border border-brand-accent/10 flex items-center justify-center group-hover:bg-brand-accent/10 transition-colors`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-brand-accent" />
          </div>
          <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">
            Conversas por Status
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Ativas", value: bs.active || 0, color: "bg-green-500", textColor: "text-green-400" },
            { label: "Escaladas", value: bs.escalated || 0, color: "bg-yellow-500", textColor: "text-yellow-400" },
            { label: "Encerradas", value: bs.closed || 0, color: "bg-brand-muted", textColor: "text-brand-muted" },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} className="stat-card">
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              <div className="w-full h-2 bg-brand-surface rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${t.totalConversations ? (value / t.totalConversations) * 100 : 0}%` }}
                />
              </div>
              <div className={`text-[11px] font-mono mt-1 ${textColor}`}>
                {t.totalConversations ? Math.round((value / t.totalConversations) * 100) : 0}%
              </div>
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
              Últimas Conversas
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
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span>
                  {c.qualificationScore != null && (
                    <span className={`text-[10px] font-mono ${scoreColor(c.qualificationScore)}`}>
                      {c.qualificationScore}pts
                    </span>
                  )}
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

        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">
              Top Agentes
            </h2>
            <Link to="/agents" className="text-[11px] font-mono text-brand-accent hover:text-brand-accent/80 transition flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data.topAgents || []).map((a, i) => (
              <div key={a.agentId} className="flex items-center justify-between p-3 rounded-xl bg-brand-surface/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-brand-muted/50 w-6">#{i + 1}</span>
                  <div>
                    <div className="font-medium text-sm">{a.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-brand-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-accent"
                      style={{ width: `${data.topAgents[0]?.count ? (a._count / data.topAgents[0]._count) * 100 : 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-brand-accent w-8 text-right">{a._count}</span>
                </div>
              </div>
            ))}
            {(!data.topAgents || data.topAgents.length === 0) && (
              <div className="text-center py-8">
                <Bot size={32} className="text-brand-muted/30 mx-auto mb-2" />
                <p className="text-brand-muted text-sm">Sem dados de conversas.</p>
              </div>
            )}
          </div>
        </section>
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
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Instâncias", value: wa.instancesTotal || 0, sub: `${wa.instancesConnected || 0} conectadas`, icon: Wifi },
            { label: "Conversas Hoje", value: data.recentConversations?.length || 0, icon: Clock },
          ].map(({ label, value, sub, icon: Icon }) => (
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
    </div>
  );
}
