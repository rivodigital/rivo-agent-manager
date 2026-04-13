import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Bot, MessageSquare, Cpu, LogOut, Shield } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useAuth } from "../../lib/auth.jsx";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/agents", label: "Agentes", icon: Bot },
  { to: "/conversations", label: "Conversas", icon: MessageSquare },
  { to: "/providers", label: "Provedores", icon: Cpu },
  { to: "/blocklist", label: "Blocklist", icon: Shield },
  { to: "/users", label: "Usuários", icon: Shield, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 shrink-0 border-r border-brand-border flex flex-col bg-brand-surface">
      <div className="px-6 py-6 border-b border-brand-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <span className="text-brand-accent font-bold text-sm">RIVO</span>
          </div>
          <div>
            <div className="font-sora text-lg font-bold tracking-tight">
              RIVO<span className="text-brand-accent">.</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-brand-muted">
              Agent Manager
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon, end, adminOnly }) => {
          if (adminOnly && user?.role !== "admin") return null;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-brand-muted hover:text-brand-white hover:bg-brand-dark/60"
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-brand-border space-y-3">
        {user && (
          <div className="px-4 py-2 rounded-lg bg-brand-dark/60">
            <div className="text-[11px] font-mono text-brand-muted truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-brand-muted hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
        >
          <LogOut size={18} />
          Sair
        </button>
        <div className="text-center text-[10px] font-mono text-brand-muted/50 uppercase tracking-wider pt-2">
          v0.1.0 · RIVO Studio
        </div>
      </div>
    </aside>
  );
}
