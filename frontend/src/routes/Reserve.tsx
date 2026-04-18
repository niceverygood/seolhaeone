import { useState } from "react";
import {
  Flag, BedDouble, Package as PackageIcon, Check, ChevronLeft,
  Users, User, Phone, Mail, MessageSquare, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { InlineCalendar } from "@/components/calendar/InlineCalendar";
import { api, ApiError } from "@/lib/api";
import {
  usePublicCourses,
  usePublicRooms,
  useAvailableSlots,
  type PublicCourse,
  type PublicRoom,
  type AvailableSlot,
} from "@/hooks/usePublic";

type ServiceType = "golf" | "room" | "package";

type Step = 1 | 2 | 3 | 4 | 5;

export default function Reserve() {
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<ServiceType | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<PublicCourse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<PublicRoom | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [guestCount, setGuestCount] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; summary: string } | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(1);
    setService(null);
    setSelectedCourse(null);
    setSelectedSlot(null);
    setSelectedRoom(null);
    setCheckIn("");
    setCheckOut("");
    setPartySize(2);
    setGuestCount(2);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setResult(null);
    setError("");
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (service === "golf" && selectedSlot && selectedCourse) {
        const res = await api.post<{ id: string; tee_date: string; tee_time: string }>(
          "/public/reserve/golf",
          {
            name, phone, email: email || null,
            teetime_id: selectedSlot.id,
            party_size: partySize,
            notes: notes || null,
          },
        );
        setResult({
          id: res.id,
          summary: `${selectedCourse.name}코스 · ${res.tee_date} ${res.tee_time} · ${partySize}명`,
        });
      } else if (service === "room" && selectedRoom) {
        const res = await api.post<{ id: string; total_price: number; nights: number }>(
          "/public/reserve/room",
          {
            name, phone, email: email || null,
            room_id: selectedRoom.id,
            check_in: checkIn,
            check_out: checkOut,
            guest_count: guestCount,
            special_requests: notes || null,
          },
        );
        setResult({
          id: res.id,
          summary: `${selectedRoom.building} ${selectedRoom.room_type} · ${res.nights}박 · ₩${res.total_price.toLocaleString()}`,
        });
      }
      setStep(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!service;
    if (step === 2) {
      if (service === "golf") return !!checkIn;
      return !!checkIn && !!checkOut && checkOut > checkIn;
    }
    if (step === 3) {
      if (service === "golf") return !!selectedSlot;
      return !!selectedRoom;
    }
    if (step === 4) return !!name && !!phone;
    return false;
  };

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Header */}
      <header className="border-b border-border-light bg-surface-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <a href={import.meta.env.BASE_URL} className="flex items-center gap-3">
            <LogoMark size={32} color="#0f0f0f" />
            <div>
              <div className="font-display text-lg leading-none text-text-dark">Seolhaewon</div>
              <div className="text-[10px] tracking-[0.3em] text-gold-dark">雪 海 園</div>
            </div>
          </a>
          <div className="hidden text-xs text-text-muted sm:block">예약 문의 · 033-000-0000</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        {step === 1 && (
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl text-text-dark sm:text-3xl">온라인 예약</h1>
            <p className="mt-2 text-sm text-text-muted">
              설해원에서의 특별한 시간을 예약하세요
            </p>
          </div>
        )}

        {/* Progress */}
        {step < 5 && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all sm:max-w-[80px]",
                  s <= step ? "bg-gold" : "bg-border-light",
                )}
              />
            ))}
          </div>
        )}

        {/* Back button */}
        {step > 1 && step < 5 && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="mb-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text-dark"
          >
            <ChevronLeft className="h-4 w-4" /> 이전 단계
          </button>
        )}

        {/* Step 1: Service selection */}
        {step === 1 && <Step1Service onSelect={(s) => { setService(s); setStep(2); }} />}

        {/* Step 2: Date */}
        {step === 2 && (
          <Step2Date
            service={service!}
            checkIn={checkIn} setCheckIn={setCheckIn}
            checkOut={checkOut} setCheckOut={setCheckOut}
          />
        )}

        {/* Step 3: Options */}
        {step === 3 && service === "golf" && (
          <Step3Golf
            date={checkIn}
            selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse}
            selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
            partySize={partySize} setPartySize={setPartySize}
          />
        )}
        {step === 3 && service === "room" && (
          <Step3Room
            selectedRoom={selectedRoom} setSelectedRoom={setSelectedRoom}
            guestCount={guestCount} setGuestCount={setGuestCount}
          />
        )}

        {/* Step 4: Customer info */}
        {step === 4 && (
          <Step4Info
            name={name} setName={setName}
            phone={phone} setPhone={setPhone}
            email={email} setEmail={setEmail}
            notes={notes} setNotes={setNotes}
            service={service!}
            course={selectedCourse}
            slot={selectedSlot}
            room={selectedRoom}
            checkIn={checkIn}
            checkOut={checkOut}
            partySize={partySize}
            guestCount={guestCount}
            error={error}
          />
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && result && (
          <div className="rounded-2xl bg-surface-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-bg">
              <Check className="h-8 w-8 text-gold-dark" />
            </div>
            <h2 className="mt-6 font-display text-2xl text-text-dark">예약이 완료되었습니다</h2>
            <p className="mt-2 text-sm text-text-muted">예약 확인 문자를 곧 보내드립니다</p>
            <div className="mt-6 rounded-xl border border-gold/30 bg-gold-bg/30 p-4 text-left">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
                <Sparkles className="h-3 w-3" /> 예약 정보
              </div>
              <p className="text-sm text-text-dark">{result.summary}</p>
              <p className="mt-1 font-mono text-[11px] text-text-muted">
                예약번호: {result.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <button
              onClick={reset}
              className="mt-6 h-11 w-full rounded-lg bg-gold text-sm font-semibold text-text-on-gold hover:bg-gold-dark"
            >
              새 예약하기
            </button>
          </div>
        )}

        {/* Footer actions */}
        {step > 1 && step < 5 && (
          <div className="mt-8">
            {step === 4 ? (
              <button
                onClick={submit}
                disabled={!canProceed() || submitting}
                className="h-12 w-full rounded-lg bg-gold text-base font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
              >
                {submitting ? "예약 처리 중..." : "예약 확정하기"}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canProceed()}
                className="h-12 w-full rounded-lg bg-gold text-base font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
              >
                다음 단계
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Step 1: Service ───

function Step1Service({ onSelect }: { onSelect: (s: ServiceType) => void }) {
  const options: {
    id: ServiceType;
    icon: typeof Flag;
    title: string;
    desc: string;
    iconBg: string;
  }[] = [
    { id: "golf", icon: Flag, title: "골프 라운딩", desc: "3개 코스 (마운틴/오션/레전드)", iconBg: "bg-green-50 text-green-700" },
    { id: "room", icon: BedDouble, title: "객실 예약", desc: "마운틴스테이 · 설해온천 · 골프텔", iconBg: "bg-blue-50 text-blue-700" },
    { id: "package", icon: PackageIcon, title: "패키지 상품", desc: "골프+객실 번들 할인", iconBg: "bg-gold-bg text-gold-dark" },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className="group flex w-full items-center gap-4 rounded-2xl border border-border-light bg-surface-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-gold hover:shadow-md"
        >
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", opt.iconBg)}>
            <opt.icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg text-text-dark">{opt.title}</div>
            <div className="mt-0.5 text-sm text-text-muted">{opt.desc}</div>
          </div>
          <div className="text-text-muted group-hover:text-gold-dark">→</div>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2: Date ───

function Step2Date({
  service, checkIn, setCheckIn, checkOut, setCheckOut,
}: {
  service: ServiceType;
  checkIn: string;
  setCheckIn: (v: string) => void;
  checkOut: string;
  setCheckOut: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-text-dark">
          {service === "golf" ? "라운딩 날짜 선택" : "숙박 기간 선택"}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {service === "golf"
            ? "날짜별 가용 티타임 수를 확인하고 선택하세요"
            : "체크인/체크아웃 날짜를 순서대로 선택하세요"}
        </p>
      </div>

      {service === "golf" ? (
        <InlineCalendar
          mode="single"
          serviceType="golf"
          selected={checkIn}
          onSelect={setCheckIn}
        />
      ) : (
        <InlineCalendar
          mode="range"
          serviceType="room"
          rangeStart={checkIn}
          rangeEnd={checkOut}
          onRangeSelect={(start, end) => {
            setCheckIn(start);
            setCheckOut(end);
          }}
        />
      )}
    </div>
  );
}

// ─── Step 3: Golf Course + Time ───

function Step3Golf({
  date, selectedCourse, setSelectedCourse, selectedSlot, setSelectedSlot, partySize, setPartySize,
}: {
  date: string;
  selectedCourse: PublicCourse | null;
  setSelectedCourse: (c: PublicCourse) => void;
  selectedSlot: AvailableSlot | null;
  setSelectedSlot: (s: AvailableSlot) => void;
  partySize: number;
  setPartySize: (n: number) => void;
}) {
  const { data: courses, loading: cLoading } = usePublicCourses();
  const { data: slots, loading: sLoading } = useAvailableSlots(date, selectedCourse?.id);

  if (cLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-text-dark">코스 & 시간 선택</h2>

      {/* Course cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(courses ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedCourse(c); setSelectedSlot(null as unknown as AvailableSlot); }}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              selectedCourse?.id === c.id
                ? "border-gold bg-gold-bg/30 shadow-md"
                : "border-border-light bg-surface-white hover:border-gold/40",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <Flag className="h-5 w-5 text-gold-dark" />
              <span className="text-xs text-gold-dark">{c.difficulty}</span>
            </div>
            <div className="font-display text-base text-text-dark">{c.name}코스</div>
            <p className="mt-1 text-xs text-text-muted">{c.description}</p>
            <div className="mt-3 font-mono text-sm font-semibold text-gold-dark">
              ₩{c.price_per_person.toLocaleString()}/인
            </div>
          </button>
        ))}
      </div>

      {/* Available slots */}
      {selectedCourse && (
        <div className="rounded-2xl border border-border-light bg-surface-white p-5">
          <h3 className="mb-3 text-sm font-medium text-text-dark">티타임 선택</h3>
          {sLoading ? (
            <Spinner />
          ) : (slots?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              해당 날짜에 예약 가능한 시간이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(slots ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSlot(s)}
                  className={cn(
                    "rounded-lg border py-2.5 text-sm font-mono font-medium transition-all",
                    selectedSlot?.id === s.id
                      ? "border-gold bg-gold text-text-on-gold"
                      : "border-border-light bg-surface-light text-text-dark hover:border-gold hover:bg-gold-bg/30",
                  )}
                >
                  {s.tee_time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Party size */}
      {selectedSlot && (
        <div className="rounded-2xl border border-border-light bg-surface-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-dark">
            <Users className="h-4 w-4 text-gold" /> 참가 인원
          </h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPartySize(n)}
                className={cn(
                  "h-12 flex-1 rounded-lg border font-semibold transition-all",
                  partySize === n
                    ? "border-gold bg-gold text-text-on-gold"
                    : "border-border-light bg-surface-light text-text-dark hover:border-gold",
                )}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Room ───

function Step3Room({
  selectedRoom, setSelectedRoom, guestCount, setGuestCount,
}: {
  selectedRoom: PublicRoom | null;
  setSelectedRoom: (r: PublicRoom) => void;
  guestCount: number;
  setGuestCount: (n: number) => void;
}) {
  const { data: rooms, loading } = usePublicRooms();

  if (loading) return <Spinner />;

  // Group by building
  const byBuilding: Record<string, PublicRoom[]> = {};
  for (const r of rooms ?? []) {
    if (!byBuilding[r.building]) byBuilding[r.building] = [];
    byBuilding[r.building].push(r);
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-text-dark">객실 선택</h2>

      {Object.entries(byBuilding).map(([building, list]) => (
        <div key={building}>
          <h3 className="mb-3 text-sm font-semibold text-text-muted">{building}</h3>
          <div className="space-y-3">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoom(r)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  selectedRoom?.id === r.id
                    ? "border-gold bg-gold-bg/30 shadow-md"
                    : "border-border-light bg-surface-white hover:border-gold/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
                      <BedDouble className="h-5 w-5 text-gold-dark" />
                    </div>
                    <div>
                      <div className="font-display text-base text-text-dark">{r.room_type}</div>
                      <p className="mt-0.5 text-xs text-text-muted">{r.description}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
                        <Users className="h-3 w-3" /> 최대 {r.capacity}인
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-gold-dark">
                      ₩{r.base_price.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-text-muted">/박</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Guest count */}
      {selectedRoom && (
        <div className="rounded-2xl border border-border-light bg-surface-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-dark">
            <Users className="h-4 w-4 text-gold" /> 투숙 인원
          </h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4].slice(0, selectedRoom.capacity).map((n) => (
              <button
                key={n}
                onClick={() => setGuestCount(n)}
                className={cn(
                  "h-12 flex-1 rounded-lg border font-semibold transition-all",
                  guestCount === n
                    ? "border-gold bg-gold text-text-on-gold"
                    : "border-border-light bg-surface-light text-text-dark hover:border-gold",
                )}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Info ───

function Step4Info({
  name, setName, phone, setPhone, email, setEmail, notes, setNotes,
  service, course, slot, room, checkIn, checkOut, partySize, guestCount, error,
}: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  service: ServiceType;
  course: PublicCourse | null;
  slot: AvailableSlot | null;
  room: PublicRoom | null;
  checkIn: string;
  checkOut: string;
  partySize: number;
  guestCount: number;
  error: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-text-dark">예약자 정보</h2>

      {/* Summary */}
      <div className="rounded-2xl border border-gold/30 bg-gold-bg/30 p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-dark">
          예약 내역
        </div>
        {service === "golf" && course && slot && (
          <div className="space-y-1 text-sm text-text-dark">
            <div>{course.name}코스 · {slot.tee_time}</div>
            <div className="text-text-muted">{checkIn} · {partySize}명</div>
            <div className="mt-2 font-mono text-base font-semibold">
              총 ₩{(course.price_per_person * partySize).toLocaleString()}
            </div>
          </div>
        )}
        {service === "room" && room && (
          <div className="space-y-1 text-sm text-text-dark">
            <div>{room.building} · {room.room_type}</div>
            <div className="text-text-muted">{checkIn} → {checkOut} · {guestCount}명</div>
            <div className="mt-2 font-mono text-base font-semibold">
              총 ₩{(room.base_price * Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="space-y-3 rounded-2xl border border-border-light bg-surface-white p-5">
        <Field icon={User} label="이름" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="h-12 w-full rounded-lg border border-border-light bg-surface-light px-4 text-base text-text-dark focus:border-gold focus:bg-surface-white focus:outline-none"
          />
        </Field>
        <Field icon={Phone} label="휴대폰" required>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="h-12 w-full rounded-lg border border-border-light bg-surface-light px-4 text-base text-text-dark focus:border-gold focus:bg-surface-white focus:outline-none"
          />
        </Field>
        <Field icon={Mail} label="이메일 (선택)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="h-12 w-full rounded-lg border border-border-light bg-surface-light px-4 text-base text-text-dark focus:border-gold focus:bg-surface-white focus:outline-none"
          />
        </Field>
        <Field icon={MessageSquare} label="요청사항 (선택)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="특별 요청사항을 입력해주세요"
            className="w-full rounded-lg border border-border-light bg-surface-light px-4 py-3 text-base text-text-dark focus:border-gold focus:bg-surface-white focus:outline-none"
          />
        </Field>
      </div>

      {error && (
        <div className="rounded-lg bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm font-medium text-[color:var(--color-danger)]">
          {error}
        </div>
      )}
    </div>
  );
}

function Field({
  icon: Icon, label, required, children,
}: {
  icon: typeof User;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-dark">
        <Icon className="h-4 w-4 text-gold" />
        {label}
        {required && <span className="text-[color:var(--color-danger)]">*</span>}
      </label>
      {children}
    </div>
  );
}
