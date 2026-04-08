import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { ArrowLeft, Plus, Edit2, Bot, User } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const { data: client } = useQuery({ queryKey: ["client", id], queryFn: () => get(`/clients/${id}`) });
  const { data: providers = [] } = useQuery({ queryKey: ["providers"], queryFn: () => get("/providers") });

  const updateClient = useMutation({
    mutationFn: (data) => put(`/clients/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client", id] }); setEditOpen(false); },
  });
  const createAgent = useMutation({
    mutationFn: (data) => post("/agents", { ...data, clientId: id }),
    onSuccess: (a) => { qc.invalidateQueries({ queryKey: ["client", id] }); setAgentOpen(false); nav(`/agents/${a.id}`); },
  });

  if (!client) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-muted">carregando…</div>
    </div>
  );

  return (
    <div className="space-y-8">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-white transition">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="font-sora text-2xl font-bold">{client.name}</h1>
            <div className="text-sm text-brand-muted mt-1">{client.segment || "—"}</div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted">
              {client.contactName && <span className="flex items-center gap-1.5"><User size={14} /> {client.contactName}</span>}
              {client.contactEmail && <span>{client.contactEmail}</span>}
              {client.contactPhone && <span>{client.contactPhone}</span>}
            </div>
            {client.notes && <p className="mt-4 text-sm text-brand-white/70 whitespace-pre-wrap leading-relaxed">{client.notes}</p>}
          </div>
          <div className="flex items-center gap-4">
            <Badge status={client.status}>{client.status}</Badge>
            <button onClick={() => setEditOpen(true)} className="btn btn-ghost"><Edit2 size={16} /></button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">Agentes</h2>
          <button className="btn btn-primary" onClick={() => setAgentOpen(true)}>
            <Plus size={16} /> Novo Agente
          </button>
        </div>
        <div className="card divide-y divide-brand-border/50">
          {client.agents.map((a) => (
            <Link key={a.id} to={`/agents/${a.id}`} className="block p-5 hover:bg-brand-surface/30 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-brand-muted mt-0.5">{a.provider.label} · {a.model}</div>
                </div>
                <div className="flex gap-3">
                  <Badge status={a.implementationPhase}>{a.implementationPhase}</Badge>
                  <Badge status={a.status}>{a.status}</Badge>
                </div>
              </div>
            </Link>
          ))}
          {client.agents.length === 0 && (
            <div className="p-12 text-center">
              <Bot size={40} className="text-brand-muted/30 mx-auto mb-3" />
              <p className="text-brand-muted text-sm">Nenhum agente.</p>
            </div>
          )}
        </div>
      </section>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Cliente">
        <ClientEditForm client={client} onSubmit={(d) => updateClient.mutate(d)} loading={updateClient.isPending} />
      </Modal>

      <Modal open={agentOpen} onClose={() => setAgentOpen(false)} title="Novo Agente">
        <NewAgentForm providers={providers} onSubmit={(d) => createAgent.mutate(d)} loading={createAgent.isPending} />
      </Modal>
    </div>
  );
}

function ClientEditForm({ client, onSubmit, loading }) {
  const [f, setF] = useState({ ...client });
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-5">
      <div>
        <label className="label">Nome</label>
        <input className="input" value={f.name || ""} onChange={upd("name")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Segmento</label>
          <input className="input" value={f.segment || ""} onChange={upd("segment")} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.status} onChange={upd("status")}>
            <option value="active">Ativo</option><option value="prospect">Prospect</option><option value="inactive">Inativo</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contato</label>
          <input className="input" value={f.contactName || ""} onChange={upd("contactName")} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={f.contactEmail || ""} onChange={upd("contactEmail")} />
        </div>
      </div>
      <div>
        <label className="label">Telefone</label>
        <input className="input" value={f.contactPhone || ""} onChange={upd("contactPhone")} />
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea className="input min-h-[100px] resize-none" value={f.notes || ""} onChange={upd("notes")} />
      </div>
      <button className="btn btn-primary w-full" disabled={loading}>Salvar</button>
    </form>
  );
}

function NewAgentForm({ providers, onSubmit, loading }) {
  const [f, setF] = useState({ name: "", description: "", providerId: providers[0]?.id || "", model: "", systemPrompt: "" });
  const provider = providers.find(p => p.id === f.providerId);
  const models = provider?.models || [];
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-5">
      <div>
        <label className="label">Nome*</label>
        <input className="input" value={f.name} onChange={upd("name")} required />
      </div>
      <div>
        <label className="label">Descrição</label>
        <input className="input" value={f.description} onChange={upd("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Provedor*</label>
          <select className="input" value={f.providerId} onChange={upd("providerId")} required>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Modelo*</label>
          <select className="input" value={f.model} onChange={upd("model")} required>
            <option value="">selecione…</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">System Prompt</label>
        <textarea className="input min-h-[120px] font-mono text-xs resize-none" value={f.systemPrompt} onChange={upd("systemPrompt")} />
      </div>
      <button className="btn btn-primary w-full" disabled={loading || !providers.length}>Criar Agente</button>
      {!providers.length && <p className="text-xs text-yellow-500">Cadastre um provedor antes.</p>}
    </form>
  );
}
