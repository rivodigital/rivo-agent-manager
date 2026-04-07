import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Bot, MessageSquare, Cpu } from "lucide-react";
import { cn } from "../../lib/utils.js";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/agents", label: "Agentes", icon: Bot },
  { to: "/conversations", label: "Conversas", icon: MessageSquare },
  { to: "/providers", label: "Provedores", icon: Cpu },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-elevated/40 flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <div className="font-mono text-2xl font-bold tracking-tight">
          RIVO<span className="text-accent">.</span>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">
          Agent Manager
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                isActive
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-bg-surface border border-transparent"
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        v0.1.0 · local
      </div>
    </aside>
  );
}
