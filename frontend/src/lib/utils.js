import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...args) => twMerge(clsx(args));

export function statusColor(s) {
  switch (s) {
    case "active":
    case "live":
    case "qualified": return "badge-success";
    case "testing":
    case "building": return "badge-warning";
    case "draft":
    case "paused":
    case "diagnosis":
    case "closed": return "badge-neutral";
    case "churned":
    case "incident":
    case "escalated": return "badge-error";
    default: return "badge-neutral";
  }
}
