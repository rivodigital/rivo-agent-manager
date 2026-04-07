import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { get } from "../lib/api.js";
import Badge from "../components/ui/Badge.jsx";

export default function Agents() {
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => get("/agents") });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-mono text-2xl font-bold uppercase">Agentes</h1>
        <p className="text-zinc-500 text-sm mt-1">{agents.length} no total</p>
      </header>
      <div className="card divide-y divide-border">
        {agents.map((a) => (
          <Link key={a.id} to={`/agents/${a.id}`} className="block p-4 hover:bg-bg-surface/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{a.client.name} · {a.provider.label} · {a.model}</div>
              </div>
              <div className="flex gap-2">
                <Badge status={a.implementationPhase}>{a.implementationPhase}</Badge>
                <Badge status={a.status}>{a.status}</Badge>
              </div>
            </div>
          </Link>
        ))}
        {agents.length === 0 && <div className="p-8 text-center text-zinc-500 text-sm">Nenhum agente.</div>}
      </div>
    </div>
  );
}
