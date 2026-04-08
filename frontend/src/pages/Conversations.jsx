import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import {
  MessageSquare,
  Search,
  X,
  Phone,
  Clock,
  User,
  Bot,
  XCircle,
  ArrowUpRight,
  CheckCircle,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Ativas" },
  { value: "qualified", label: "Qualificadas" },
  { value: "escalated", label: "Escaladas" },
  { value: "closed", label: "Encerradas" },
];

export default function Conversations() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => get("/agents"),
  });

  const queryParams = {};
  if (filterAgent) queryParams.agentId = filterAgent;
  if (filterStatus) queryParams.status = filterStatus;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", filterAgent, filterStatus],
    queryFn: () => get("/conversations", queryParams),
  });

  const { data: detail } = useQuery({
    queryKey: ["conversation-detail", selectedId],
    queryFn: () => get(`/conversations/${selectedId}`),
    enabled: !!selectedId,
  });

  const closeConv = useMutation({
    mutationFn: (id) => post(`/conversations/${id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["conversation-detail", selectedId] });
    },
  });

  const updateConv = useMutation({
    mutationFn: ({ id, data }) => put(`/conversations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["conversation-detail", selectedId] });
    },
  });

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.leadName || "").toLowerCase().includes(q) ||
      (c.leadPhone || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      <div className={`flex flex-col ${selectedId ? "w-[440px] shrink-0" : "flex-1"}`}>
        <header className="mb-6">
          <h1 className="font-sora text-2xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare size={24} className="text-brand-accent" />
            Conversas
          </h1>
          <p className="text-brand-muted text-sm mt-1">Histórico de conversas WhatsApp</p>
        </header>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              className="input pl-11 w-full"
              placeholder="Buscar por nome ou telefone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input max-w-[180px]"
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
          >
            <option value="">Todos os agentes</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            className="input max-w-[160px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading && <div className="text-brand-muted text-sm text-center py-8">carregando…</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-brand-muted text-sm py-8 text-center">Nenhuma conversa encontrada.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                selectedId === c.id
                  ? "border-brand-accent/50 bg-brand-accent/5"
                  : "border-brand-border bg-brand-surface/30 hover:border-brand-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    <User size={14} className="text-brand-muted shrink-0" />
                    {c.leadName || "Sem nome"}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5 flex items-center gap-1.5">
                    <Phone size={12} />
                    {c.leadPhone || c.remoteJid}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                  <Badge status={c.status}>{c.status}</Badge>
                  {c.qualificationScore != null && (
                    <span className="text-[10px] font-mono text-brand-accent">{c.qualificationScore}pts</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-[11px] text-brand-muted flex items-center gap-1.5 truncate">
                  <Bot size={12} />
                  {c.agent?.name}
                  {c.agent?.client && <span className="text-brand-muted/50"> · {c.agent.client.name}</span>}
                </div>
                <div className="text-[10px] font-mono text-brand-muted/50 flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {new Date(c.lastMessageAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="text-[11px] text-brand-muted/50 mt-1.5">
                {c._count?.messages || 0} mensagens
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedId && (
        <div className="flex-1 flex flex-col card overflow-hidden">
          {!detail ? (
            <div className="flex-1 flex items-center justify-center text-brand-muted">carregando…</div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/50">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 text-sm">
                    <User size={16} className="text-brand-muted" />
                    {detail.leadName || "Sem nome"}
                    <Badge status={detail.status} className="ml-2">{detail.status}</Badge>
                  </div>
                  <div className="text-xs text-brand-muted mt-1">
                    {detail.leadPhone || detail.remoteJid}
                    {detail.agent && <> · {detail.agent.name}</>}
                    {detail.agent?.client && <> · {detail.agent.client.name}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {detail.status !== "closed" && (
                    <>
                      <button
                        className="btn text-xs py-2"
                        onClick={() => updateConv.mutate({ id: detail.id, data: { status: "qualified" } })}
                      >
                        <CheckCircle size={14} className="text-brand-accent" />
                        Qualificar
                      </button>
                      <button
                        className="btn text-xs py-2"
                        onClick={() => updateConv.mutate({ id: detail.id, data: { status: "escalated" } })}
                      >
                        <ArrowUpRight size={14} className="text-yellow-500" />
                        Escalar
                      </button>
                      <button
                        className="btn text-xs py-2"
                        onClick={() => closeConv.mutate(detail.id)}
                      >
                        <XCircle size={14} className="text-red-500" />
                        Fechar
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedId(null)} className="text-brand-muted hover:text-brand-white transition ml-2">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {detail.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                        m.role === "user"
                          ? "bg-brand-surface border border-brand-border"
                          : "bg-brand-accent/10 border border-brand-accent/30"
                      }`}
                    >
                      <p className="text-sm text-brand-white/90 whitespace-pre-wrap">{m.content}</p>
                      <div className="text-[10px] font-mono text-brand-muted/60 mt-2 text-right">
                        {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {(!detail.messages || detail.messages.length === 0) && (
                  <div className="text-brand-muted text-sm text-center py-12">Sem mensagens.</div>
                )}
              </div>

              {detail.qualificationData && (
                <div className="border-t border-brand-border/50 px-6 py-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-brand-muted mb-3">
                    Dados de Qualificação
                    {detail.qualificationScore != null && (
                      <span className="text-brand-accent ml-3">Score: {detail.qualificationScore}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-brand-muted">
                    {(() => {
                      try {
                        const d = JSON.parse(detail.qualificationData);
                        return Object.entries(d).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-brand-muted/60 capitalize">{k}:</span> {v}
                          </div>
                        ));
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!selectedId && conversations.length > 0 && (
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare size={48} className="text-brand-muted/20 mx-auto mb-4" />
            <p className="text-brand-muted text-sm">Selecione uma conversa para ver o histórico</p>
          </div>
        </div>
      )}
    </div>
  );
}
