import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import { Shield, Plus, Trash2, Phone } from "lucide-react";

export default function Blocklist() {
  const qc = useQueryClient();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["blocklist"],
    queryFn: () => get("/blocklist"),
  });

  const addBlock = useMutation({
    mutationFn: (data) => post("/blocklist", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocklist"] });
      setPhone("");
      setReason("");
      toast("Número bloqueado");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao bloquear", "error"),
  });

  const removeBlock = useMutation({
    mutationFn: (id) => del(`/blocklist/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocklist"] });
      toast("Número desbloqueado");
    },
    onError: (e) => toast(e.response?.data?.error || "Erro ao desbloquear", "error"),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    addBlock.mutate({ phone: phone.trim(), reason: reason.trim() || null });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-sora text-2xl font-bold tracking-tight flex items-center gap-3">
          <Shield size={24} className="text-red-500" />
          Blocklist
        </h1>
        <p className="text-brand-muted text-sm mt-1">Números bloqueados — o bot não responde a estes contatos.</p>
      </header>

      <div className="card p-6">
        <form onSubmit={handleAdd} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Telefone</label>
            <input
              className="input"
              placeholder="5547999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Motivo (opcional)</label>
            <input
              className="input"
              placeholder="Spam, abuso, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!phone.trim() || addBlock.isPending}
          >
            <Plus size={16} /> Bloquear
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border/50">
              <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Telefone</th>
              <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Motivo</th>
              <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Data</th>
              <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-muted">Ação</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="text-center py-8 text-brand-muted">carregando…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-brand-muted">Nenhum número bloqueado.</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-brand-border/30 hover:bg-brand-surface/30 transition">
                <td className="px-6 py-4 font-mono text-xs flex items-center gap-2">
                  <Phone size={14} className="text-red-400" />
                  +{item.phone}
                </td>
                <td className="px-6 py-4 text-brand-muted">{item.reason || "—"}</td>
                <td className="px-6 py-4 text-[11px] font-mono text-brand-muted/60">
                  {new Date(item.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    className="btn btn-ghost text-xs hover:text-red-500"
                    onClick={() => confirm("Desbloquear este número?") && removeBlock.mutate(item.id)}
                    disabled={removeBlock.isPending}
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
  );
}
