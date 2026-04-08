import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { get } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";
import { Bot } from "lucide-react";

export default function Agents() {
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => get("/agents") });
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-sora text-3xl font-bold tracking-tight">Agentes</h1>
        <p className="text-brand-muted text-sm mt-1">{agents.length} no total</p>
      </header>
      <div className="card divide-y divide-brand-border/50">
        {agents.map((a) => (
          <Link key={a.id} to={`/agents/${a.id}`} className="block p-5 hover:bg-brand-surface/30 transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-brand-muted mt-0.5">{a.client.name} · {a.provider.label} · {a.model}</div>
              </div>
              <div className="flex gap-3">
                <Badge status={a.implementationPhase}>{a.implementationPhase}</Badge>
                <Badge status={a.status}>{a.status}</Badge>
              </div>
            </div>
          </Link>
        ))}
        {agents.length === 0 && (
          <div className="p-12 text-center">
            <Bot size={40} className="text-brand-muted/30 mx-auto mb-3" />
            <p className="text-brand-muted text-sm">Nenhum agente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
