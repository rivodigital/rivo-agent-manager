import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...args) => twMerge(clsx(args));

export function statusColor(s) {
  switch (s) {
    case "active":
    case "live": return "text-accent-green border-accent-green/40 bg-accent-green/10";
    case "testing":
    case "building": return "text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10";
    case "draft":
    case "paused":
    case "diagnosis": return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
    case "churned":
    case "incident": return "text-accent-red border-accent-red/40 bg-accent-red/10";
    default: return "text-zinc-400 border-zinc-600/40 bg-zinc-700/20";
  }
}
