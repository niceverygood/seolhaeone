import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorAlert({ message = "데이터를 불러오지 못했습니다.", onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <AlertTriangle className="h-8 w-8 text-[color:var(--color-danger)]" />
      <p className="text-sm text-text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-white px-4 py-2 text-sm font-medium text-text-dark hover:bg-surface-light"
        >
          <RefreshCw className="h-4 w-4" /> 다시 시도
        </button>
      )}
    </div>
  );
}
