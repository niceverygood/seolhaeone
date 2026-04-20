import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  BedDouble,
  Users,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";
import { LogoMark } from "@/components/brand/Logo";

const nav = [
  { to: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { to: "/golf", label: "골프 예약", icon: Flag },
  { to: "/resort", label: "객실 예약", icon: BedDouble },
  { to: "/customers", label: "고객 관리", icon: Users },
  { to: "/ai", label: "AI 어시스턴트", icon: Bot },
  { to: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col bg-bg-primary text-text-primary">
      {/* Logo */}
      <div className="flex items-center gap-3 px-7 pt-8 pb-10">
        <LogoMark size={32} color="#c5a55a" />
        <div className="min-w-0">
          <div className="font-display text-xl leading-none text-white">
            Seolhaeone
          </div>
          <div className="mt-1 font-display text-[10px] tracking-[0.3em] text-gold">
            雪 海 園
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                    isActive
                      ? "bg-bg-secondary text-gold"
                      : "text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gold" />
                    )}
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile */}
      <div className="mx-3 mb-4 rounded-lg border border-border-subtle bg-bg-secondary px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-semibold text-text-on-gold">
            {user?.name?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text-primary">
              {user?.name ?? "사용자"}
            </div>
            <div className="text-xs text-text-muted">{user?.role ?? ""}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
