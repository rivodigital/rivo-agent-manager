import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { get, post, del } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { Plus, Search, Trash2, Users } from "lucide-react";

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", { search, status }],
    queryFn: () => get("/clients", { search: search || undefined, status: status || undefined }),
  });

  const create = useMutation({
    mutationFn: (data) => post("/clients", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setOpen(false); },
  });

  const remove = useMutation({
    mutationFn: (id) => del(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-brand-muted text-sm mt-1">{clients.length} cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Novo Cliente
        </button>
      </header>

      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
            placeholder="Buscar por nome…"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:max-w-[180px]">
          <option value="">Todos status</option>
          <option value="active">Ativo</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <div className="card divide-y divide-brand-border/50">
        {clients.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-5 hover:bg-brand-surface/30 transition">
            <Link to={`/clients/${c.id}`} className="flex-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-brand-muted mt-0.5">
                {c.segment || "—"} · {c._count?.agents || 0} agente(s)
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Badge status={c.status}>{c.status}</Badge>
              <button onClick={() => confirm(`Deletar ${c.name}?`) && remove.mutate(c.id)} className="text-brand-muted hover:text-red-500 transition">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="p-12 text-center">
            <Users size={40} className="text-brand-muted/30 mx-auto mb-3" />
            <p className="text-brand-muted text-sm">Nenhum cliente.</p>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo Cliente">
        <ClientForm onSubmit={(data) => create.mutate(data)} loading={create.isPending} />
      </Modal>
    </div>
  );
}

function ClientForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "", segment: "", contactName: "", contactEmail: "", contactPhone: "", notes: "", status: "active",
  });
  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
      <div>
        <label className="label">Nome*</label>
        <input className="input" value={form.name} onChange={upd("name")} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Segmento</label>
          <input className="input" value={form.segment} onChange={upd("segment")} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={upd("status")}>
            <option value="active">Ativo</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contato (nome)</label>
          <input className="input" value={form.contactName} onChange={upd("contactName")} />
        </div>
        <div>
          <label className="label">Contato (email)</label>
          <input className="input" value={form.contactEmail} onChange={upd("contactEmail")} />
        </div>
      </div>
      <div>
        <label className="label">Telefone</label>
        <input className="input" value={form.contactPhone} onChange={upd("contactPhone")} />
      </div>
      <div>
        <label className="label">Notas Internas</label>
        <textarea className="input min-h-[100px] resize-none" value={form.notes} onChange={upd("notes")} />
      </div>
      <button className="btn btn-primary w-full" disabled={loading}>
        {loading ? "salvando…" : "Criar Cliente"}
      </button>
    </form>
  );
}
