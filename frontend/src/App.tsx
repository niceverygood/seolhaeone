import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/Spinner";

// 코드 스플리팅 — 각 라우트는 필요 시 동적 로드.
// 초기 번들에서 recharts/테이블/캘린더 등 대용량 의존성을 분리해 첫 페인트 가속.
const Login = lazy(() => import("@/routes/Login"));
const Reserve = lazy(() => import("@/routes/Reserve"));
const Dashboard = lazy(() => import("@/routes/Dashboard"));
const Golf = lazy(() => import("@/routes/Golf"));
const Resort = lazy(() => import("@/routes/Resort"));
const Customers = lazy(() => import("@/routes/Customers"));
const CustomerProfile = lazy(() => import("@/routes/CustomerProfile"));
const AiAssistant = lazy(() => import("@/routes/AiAssistant"));
const Settings = lazy(() => import("@/routes/Settings"));

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{node}</Suspense>
);

const router = createBrowserRouter(
  [
    { path: "/login", element: withSuspense(<Login />) },
    { path: "/reserve", element: withSuspense(<Reserve />) },
    {
      element: <AppLayout />,
      children: [
        { path: "/", element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: withSuspense(<Dashboard />) },
        { path: "/golf", element: withSuspense(<Golf />) },
        { path: "/resort", element: withSuspense(<Resort />) },
        { path: "/customers", element: withSuspense(<Customers />) },
        { path: "/customers/:id", element: withSuspense(<CustomerProfile />) },
        { path: "/ai", element: withSuspense(<AiAssistant />) },
        { path: "/settings", element: withSuspense(<Settings />) },
      ],
    },
  ],
  { basename },
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
