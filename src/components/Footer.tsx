import { ArrowLeftRight, Zap, Shield } from "lucide-react";

const ITEMS = [
  { icon: ArrowLeftRight, label: "EN · NE · TA" },
  { icon: Zap,            label: "Real-time" },
  { icon: Shield,         label: "Secure" },
] as const;

export function Footer() {
  return (
    <footer className="shrink-0 select-none pb-1">
      <div className="flex items-center justify-center gap-5 py-1">
        {ITEMS.map((item, i) => (
          <div key={i} className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600 font-medium">
            <item.icon className="w-3 h-3" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-600 tracking-wide text-center">
        &copy; 2026 reImagine. All Rights Reserved.
      </p>
    </footer>
  );
}
