import { Construction } from "lucide-react";

type Props = {
  name: string;
};

export default function Stub({ name }: Props) {
  return (
    <div className="mx-auto flex h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-gold-bg">
        <Construction className="h-8 w-8 text-gold-dark" />
      </div>
      <h2 className="mt-6 font-display text-2xl text-text-dark">{name}</h2>
      <p className="mt-2 text-sm text-text-muted">
        Phase 2 구현 예정입니다. 현재는 대시보드 프로토타입만 연결되어 있습니다.
      </p>
    </div>
  );
}
