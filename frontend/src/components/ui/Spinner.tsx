export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border-light border-t-gold" />
    </div>
  );
}
