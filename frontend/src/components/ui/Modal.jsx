import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`card w-full ${w} mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/50">
          <h2 className="font-sora text-sm font-semibold uppercase tracking-[0.1em] text-brand-muted">{title}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
