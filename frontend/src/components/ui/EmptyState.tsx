import { Inbox } from "lucide-react";

export function EmptyState({ message = "데이터가 없습니다." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <Inbox className="h-8 w-8 text-text-muted" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
