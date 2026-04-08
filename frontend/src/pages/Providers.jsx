import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del, api } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { Plus, Trash2, Zap, Edit2, Cpu } from "lucide-react";

export default function Providers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testResults, setTestResults] = useState({});

  const { data: providers = [] } = useQuery({ queryKey: ["providers"], queryFn: () => get("/providers") });

  const create = useMutation({
    mutationFn: (data) => post("/providers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["providers"] }); setOpen(false); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => put(`/providers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["providers"] }); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id) => del(`/providers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });

  const test = async (id) => {
    setTestResults((r) => ({ ...r, [id]: { loading: true } }));
    try {
      const { data } = await api.post(`/providers/${id}/test`);
      setTestResults((r) => ({ ...r, [id]: data }));
    } catch (e) {
      setTestResults((r) => ({ ...r, [id]: { ok: false, error: e.message } }));
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold tracking-tight">Provedores</h1>
          <p className="text-brand-muted text-sm mt-1">{providers.length} configurado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Novo Provedor
        </button>
      </header>

      <div className="grid gap-4">
        {providers.map((p) => {
          const tr = testResults[p.id];
          return (
            <div key={p.id} className="card p-6 hover:border-brand-white/10 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-sora text-lg font-semibold">{p.label}</h3>
                    <Badge status={p.status}>{p.status}</Badge>
                  </div>
                  <div className="text-xs font-mono text-brand-muted">{p.name}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.models.map((m) => (
                      <span key={m} className="badge badge-neutral">{m}</span>
                    ))}
                  </div>
                  {tr && (
                    <div className={`text-xs font-mono mt-4 ${tr.ok ? "text-brand-accent" : "text-red-500"}`}>
                      {tr.loading ? "testando…" : tr.ok ? `conectado (${tr.status || "ok"})` : `${tr.error || tr.status}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button className="btn" onClick={() => test(p.id)}>
                    <Zap size={16} /> Testar
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditing(p)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-ghost hover:text-red-500" onClick={() => confirm(`Deletar ${p.label}?`) && remove.mutate(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {providers.length === 0 && (
          <div className="card p-12 text-center">
            <Cpu size={40} className="text-brand-muted/30 mx-auto mb-3" />
            <p className="text-brand-muted text-sm">Nenhum provedor cadastrado.</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo Provedor">
        <ProviderForm onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Provedor">
        {editing && (
          <ProviderForm
            initial={editing}
            onSubmit={(d) => update.mutate({ id: editing.id, data: d })}
            loading={update.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function ProviderForm({ initial, onSubmit, loading }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    label: initial?.label || "",
    apiKey: initial?.apiKey || "",
    baseUrl: initial?.baseUrl || "",
    status: initial?.status || "active",
    models: (initial?.models || []).join("\n"),
  });
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...f,
        models: f.models.split("\n").map((s) => s.trim()).filter(Boolean),
      });
    }} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name (slug)*</label>
          <input className="input font-mono" value={f.name} onChange={upd("name")} required placeholder="anthropic" />
        </div>
        <div>
          <label className="label">Label*</label>
          <input className="input" value={f.label} onChange={upd("label")} required placeholder="Anthropic (Claude)" />
        </div>
      </div>
      <div>
        <label className="label">API Key*</label>
        <input className="input font-mono" value={f.apiKey} onChange={upd("apiKey")} required />
      </div>
      <div>
        <label className="label">Base URL (opcional)</label>
        <input className="input" value={f.baseUrl} onChange={upd("baseUrl")} placeholder="https://api.openai.com" />
      </div>
      <div>
        <label className="label">Modelos (um por linha)</label>
        <textarea className="input min-h-[100px] font-mono text-xs resize-none" value={f.models} onChange={upd("models")} />
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input" value={f.status} onChange={upd("status")}>
          <option value="active">Ativo</option><option value="inactive">Inativo</option>
        </select>
      </div>
      <button className="btn btn-primary w-full" disabled={loading}>Salvar</button>
    </form>
  );
}
