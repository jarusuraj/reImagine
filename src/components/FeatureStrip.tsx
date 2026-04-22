import { ArrowLeftRight, Zap, Shield } from "lucide-react";

const ITEMS = [
  { icon: ArrowLeftRight, label: "EN · NE · TA" },
  { icon: Zap,            label: "Real-time" },
  { icon: Shield,         label: "Secure" },
] as const;

export function FeatureStrip() {
  return (
    <div className="flex items-center justify-center gap-5 py-1.5 select-none">
      {ITEMS.map((item, i) => (
        <div key={i} className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600 font-medium">
          <item.icon className="w-3 h-3" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
