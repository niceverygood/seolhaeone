import { Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/Spinner";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// 코드 스플리팅 — 각 라우트는 필요 시 동적 로드.
// lazyWithRetry: 새 배포 후 이전 청크 해시 파일 404 발생 시 자동 재시도 + 1회 리로드.
const Login = lazyWithRetry(() => import("@/routes/Login"), "login");
const Reserve = lazyWithRetry(() => import("@/routes/Reserve"), "reserve");
const Dashboard = lazyWithRetry(() => import("@/routes/Dashboard"), "dashboard");
const Golf = lazyWithRetry(() => import("@/routes/Golf"), "golf");
const Resort = lazyWithRetry(() => import("@/routes/Resort"), "resort");
const Customers = lazyWithRetry(() => import("@/routes/Customers"), "customers");
const CustomerProfile = lazyWithRetry(() => import("@/routes/CustomerProfile"), "customer-profile");
const AiAssistant = lazyWithRetry(() => import("@/routes/AiAssistant"), "ai-assistant");
const Settings = lazyWithRetry(() => import("@/routes/Settings"), "settings");

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
