import { useState, type FormEvent } from "react";
import { Save, Lock, Bell, Server, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";

export default function Settings() {
  return (
    <div className="mx-auto max-w-[800px] space-y-8">
      <ProfileSection />
      <PasswordSection />
      <NotificationSection />
      <SystemInfoSection />
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/auth/me", { name, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="mb-6 font-display text-lg text-text-dark">내 프로필</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-border-light bg-surface-light px-3 text-sm text-text-dark focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-border-light bg-surface-light px-3 text-sm text-text-dark focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">역할</label>
            <input
              type="text"
              value={user?.role ?? ""}
              disabled
              className="h-10 w-full rounded-lg border border-border-light bg-border-light/30 px-3 text-sm text-text-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">부서</label>
            <input
              type="text"
              value={user?.department ?? ""}
              disabled
              className="h-10 w-full rounded-lg border border-border-light bg-border-light/30 px-3 text-sm text-text-muted"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
          >
            {saved ? <><Check className="h-4 w-4" /> 저장됨</> : <><Save className="h-4 w-4" /> 저장</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw !== confirm) {
      setMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (newPw.length < 4) {
      setMessage({ type: "error", text: "비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/auth/change-password", {
        current_password: current,
        new_password: newPw,
      });
      setMessage({ type: "success", text: "비밀번호가 변경되었습니다." });
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "비밀번호 변경에 실패했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex items-center gap-2">
        <Lock className="h-5 w-5 text-text-muted" />
        <h2 className="font-display text-lg text-text-dark">비밀번호 변경</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">현재 비밀번호</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="h-10 w-full max-w-sm rounded-lg border border-border-light bg-surface-light px-3 text-sm text-text-dark focus:border-gold focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border-light bg-surface-light px-3 text-sm text-text-dark focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border-light bg-surface-light px-3 text-sm text-text-dark focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {message && (
          <p className={`rounded-lg px-3 py-2 text-xs font-medium ${
            message.type === "success"
              ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
              : "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"
          }`}>
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
          >
            <Lock className="h-4 w-4" /> 변경
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationSection() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [noshowAlerts, setNoshowAlerts] = useState(true);

  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-text-muted" />
        <h2 className="font-display text-lg text-text-dark">알림 설정</h2>
      </div>
      <div className="space-y-4">
        <Toggle label="이메일 알림" desc="중요 이벤트를 이메일로 받습니다." checked={emailNotif} onChange={setEmailNotif} />
        <Toggle label="AI 인사이트 알림" desc="AI가 생성한 인사이트를 실시간 알림으로 받습니다." checked={aiAlerts} onChange={setAiAlerts} />
        <Toggle label="노쇼 경보" desc="노쇼 위험 예약 발생 시 즉시 알립니다." checked={noshowAlerts} onChange={setNoshowAlerts} />
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-text-dark">{label}</div>
        <div className="text-xs text-text-muted">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-gold" : "bg-border-light"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function SystemInfoSection() {
  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex items-center gap-2">
        <Server className="h-5 w-5 text-text-muted" />
        <h2 className="font-display text-lg text-text-dark">시스템 정보</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <InfoRow label="앱 버전" value="0.1.0 (Phase 2)" />
        <InfoRow label="프론트엔드" value="React 19 + TypeScript 6" />
        <InfoRow label="백엔드" value="FastAPI + PostgreSQL 16" />
        <InfoRow label="AI 엔진" value="Claude API (연동)" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-dark">{value}</span>
    </div>
  );
}
