import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import { Users as UsersIcon, Plus, Pencil, Trash2 } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" },
];

export default function Users() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "viewer" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => get("/users"),
  });

  const create = useMutation({
    mutationFn: (data) => post("/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setForm({ email: "", name: "", password: "", role: "viewer" });
      setEditingId(null);
      toast("Usuário criado");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao criar usuário", "error"),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setForm({ email: "", name: "", password: "", role: "viewer" });
      setEditingId(null);
      toast("Usuário atualizado");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao atualizar usuário", "error"),
  });

  const remove = useMutation({
    mutationFn: (id) => del(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("Usuário removido");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao remover usuário", "error"),
  });

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({ email: user.email, name: user.name, password: "", role: user.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ email: "", name: "", password: "", role: "viewer" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.name) return toast("Email e nome são obrigatórios", "error");
    if (editingId) {
      const data = { name: form.name, role: form.role };
      if (form.password) data.password = form.password;
      update.mutate({ id: editingId, data });
    } else {
      create.mutate(form);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-sora text-2xl font-bold tracking-tight flex items-center gap-3">
          <UsersIcon size={24} className="text-brand-accent" />
          Usuários
        </h1>
        <p className="text-brand-muted text-sm mt-1">Gerencie usuários e permissões do sistema.</p>
      </header>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Nome</label>
            <input className="input" placeholder="Nome completo" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} disabled={editingId !== null} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="label">Papel</label>
            <select className="input" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="label">{editingId ? "Nova senha (opcional)" : "Senha"}</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex gap-2 items-center">
            <button type="submit" className="btn btn-primary" disabled={create.isPending || update.isPending}>
              <Plus size={16} /> {editingId ? "Salvar" : "Criar"}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={cancelEdit}>Cancelar</button>
            )}
          </div>
        </form>

        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/50">
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Papel</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Criado em</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-8 text-brand-muted">carregando…</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-brand-muted">Nenhum usuário.</td></tr>}
              {items.map((user) => (
                <tr key={user.id} className="border-b border-brand-border/30 hover:bg-brand-surface/30 transition">
                  <td className="px-4 py-4 font-medium">{user.name}</td>
                  <td className="px-4 py-4 text-brand-muted font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-4">
                    <span className={`badge ${
                      user.role === "admin" ? "badge-success" :
                      user.role === "operator" ? "badge-warning" : "badge-neutral"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[11px] font-mono text-brand-muted/60">
                    {new Date(user.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => startEdit(user)}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      className="btn btn-ghost text-xs hover:text-red-500 ml-2"
                      onClick={() => confirm("Remover este usuário?") && remove.mutate(user.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
