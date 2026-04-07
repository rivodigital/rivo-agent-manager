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
  ChevronRight,
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

function statusBadgeClass(status) {
  switch (status) {
    case "active": return "text-accent border-accent/40 bg-accent/10";
    case "qualified": return "text-accent-green border-accent-green/40 bg-accent-green/10";
    case "escalated": return "text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10";
    case "closed": return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
    default: return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
  }
}

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

  // Client-side search filtering
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
      {/* Left panel: conversation list */}
      <div className={`flex flex-col ${selectedId ? "w-[420px] shrink-0" : "flex-1"}`}>
        <header className="mb-4">
          <h1 className="font-mono text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
            <MessageSquare size={22} className="text-accent" />
            Conversas
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Histórico de conversas WhatsApp</p>
        </header>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="input pl-9 w-full"
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

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {isLoading && <div className="text-zinc-500">carregando…</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-zinc-500 text-sm py-8 text-center">Nenhuma conversa encontrada.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-4 rounded-lg border transition hover:border-accent/30 hover:bg-bg-surface ${
                selectedId === c.id
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-bg-elevated/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    <User size={13} className="text-zinc-500 shrink-0" />
                    {c.leadName || "Sem nome"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                    <Phone size={11} />
                    {c.leadPhone || c.remoteJid}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  <span className={`badge text-[10px] ${statusBadgeClass(c.status)}`}>{c.status}</span>
                  {c.qualificationScore != null && (
                    <span className="text-[10px] font-mono text-accent-green">{c.qualificationScore}pts</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                  <Bot size={11} />
                  {c.agent?.name}
                  {c.agent?.client && <span className="text-zinc-600"> · {c.agent.client.name}</span>}
                </div>
                <div className="text-[10px] font-mono text-zinc-600 flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {new Date(c.lastMessageAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">
                {c._count?.messages || 0} mensagens
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: conversation detail */}
      {selectedId && (
        <div className="flex-1 flex flex-col card overflow-hidden">
          {!detail ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">carregando…</div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 text-sm">
                    <User size={14} className="text-zinc-400" />
                    {detail.leadName || "Sem nome"}
                    <span className={`badge ml-2 text-[10px] ${statusBadgeClass(detail.status)}`}>
                      {detail.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {detail.leadPhone || detail.remoteJid}
                    {detail.agent && <> · {detail.agent.name}</>}
                    {detail.agent?.client && <> · {detail.agent.client.name}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {detail.status !== "closed" && (
                    <>
                      <button
                        className="btn text-xs"
                        onClick={() => updateConv.mutate({ id: detail.id, data: { status: "qualified" } })}
                        title="Marcar como qualificado"
                      >
                        <CheckCircle size={13} className="text-accent-green" />
                        Qualificar
                      </button>
                      <button
                        className="btn text-xs"
                        onClick={() => updateConv.mutate({ id: detail.id, data: { status: "escalated" } })}
                        title="Escalar para humano"
                      >
                        <ArrowUpRight size={13} className="text-accent-yellow" />
                        Escalar
                      </button>
                      <button
                        className="btn text-xs"
                        onClick={() => closeConv.mutate(detail.id)}
                        title="Fechar conversa"
                      >
                        <XCircle size={13} className="text-accent-red" />
                        Fechar
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedId(null)} className="text-zinc-500 hover:text-zinc-100 ml-2">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {detail.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                        m.role === "user"
                          ? "bg-bg-surface border border-border"
                          : "bg-accent/10 border border-accent/30"
                      }`}
                    >
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{m.content}</p>
                      <div className="text-[10px] font-mono text-zinc-500 mt-1 text-right">
                        {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {(!detail.messages || detail.messages.length === 0) && (
                  <div className="text-zinc-500 text-sm text-center py-8">Sem mensagens.</div>
                )}
              </div>

              {/* Qualification data footer */}
              {detail.qualificationData && (
                <div className="border-t border-border px-5 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                    Dados de Qualificação
                    {detail.qualificationScore != null && (
                      <span className="text-accent-green ml-2">Score: {detail.qualificationScore}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    {(() => {
                      try {
                        const d = JSON.parse(detail.qualificationData);
                        return Object.entries(d).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-zinc-500 capitalize">{k}:</span> {v}
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

      {/* Empty state when nothing selected */}
      {!selectedId && conversations.length > 0 && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-zinc-600">
          <div className="text-center">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione uma conversa para ver o histórico</p>
          </div>
        </div>
      )}
    </div>
  );
}
