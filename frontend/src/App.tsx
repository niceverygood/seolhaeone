import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/routes/Dashboard";
import Stub from "@/routes/Stub";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/golf", element: <Stub name="골프 예약" /> },
      { path: "/resort", element: <Stub name="객실 예약" /> },
      { path: "/customers", element: <Stub name="고객 관리" /> },
      { path: "/ai", element: <Stub name="AI 어시스턴트" /> },
      { path: "/settings", element: <Stub name="설정" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
