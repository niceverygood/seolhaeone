import { AlertTriangle, Diamond, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TeetimeSlot } from "@/lib/mockGolf";

type Props = { slot: TeetimeSlot };

const gradeBadge: Record<string, string> = {
  diamond: "bg-gold text-text-on-gold",
  gold: "bg-gold-light text-text-on-gold",
  silver: "bg-gray-300 text-gray-700",
  member: "bg-border-light text-text-muted",
};

export function TeetimeSlotCard({ slot }: Props) {
  const isBooked = slot.status === "reserved" || slot.status === "completed";
  const isHighRisk = (slot.noshowScore ?? 0) > 0.3;
  const isVip = slot.customerGrade === "diamond" || slot.customerGrade === "gold";

  if (!isBooked) {
    return (
      <div className="group flex h-full min-h-[68px] flex-col items-center justify-center rounded-lg border border-dashed border-border-light bg-surface-white transition-colors hover:border-gold hover:bg-gold-bg/40">
        <button className="text-xs text-text-muted group-hover:text-gold-dark">
          + 예약하기
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[68px] flex-col justify-between rounded-lg border p-2.5 transition-shadow hover:shadow-md",
        isVip
          ? "border-gold/50 bg-gold-bg/30"
          : "border-border-light bg-bg-card",
        isHighRisk && "ring-1 ring-danger/30",
      )}
    >
      {/* Top: name + grade */}
      <div className="flex items-center gap-1.5">
        {isVip && <Diamond className="h-3 w-3 text-gold" />}
        <span className={cn("text-sm font-medium", isVip ? "text-text-dark" : "text-text-primary")}>
          {slot.customerName}
        </span>
        {slot.customerGrade && (
          <span
            className={cn(
              "ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
              gradeBadge[slot.customerGrade],
            )}
          >
            {slot.customerGrade}
          </span>
        )}
      </div>

      {/* Bottom: party + caddy + noshow */}
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-muted">
        <span className="flex items-center gap-0.5">
          <Users className="h-3 w-3" /> {slot.partySize}
        </span>
        {slot.caddyName && (
          <span className="truncate">{slot.caddyName}</span>
        )}
        {isHighRisk && (
          <span className="ml-auto flex items-center gap-0.5 font-semibold text-[color:var(--color-danger)]">
            <AlertTriangle className="h-3 w-3" />
            {Math.round((slot.noshowScore ?? 0) * 100)}%
          </span>
        )}
      </div>

      {slot.packageName && (
        <div className="mt-1 truncate rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold-dark">
          {slot.packageName}
        </div>
      )}
    </div>
  );
}
