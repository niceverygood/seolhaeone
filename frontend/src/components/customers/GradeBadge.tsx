import { cn } from "@/lib/cn";
import type { CustomerGrade } from "@/lib/mockCustomers";

const styles: Record<CustomerGrade, string> = {
  diamond: "bg-gold text-text-on-gold",
  gold: "bg-gold-light text-text-on-gold",
  silver: "bg-gray-300 text-gray-700",
  member: "bg-border-light text-text-muted",
};

export function GradeBadge({ grade }: { grade: CustomerGrade }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        styles[grade],
      )}
    >
      {grade}
    </span>
  );
}
