import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/routes/Dashboard";
import Golf from "@/routes/Golf";
import Customers from "@/routes/Customers";
import CustomerProfile from "@/routes/CustomerProfile";
import Stub from "@/routes/Stub";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { path: "/", element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/golf", element: <Golf /> },
        { path: "/resort", element: <Stub name="객실 예약" /> },
        { path: "/customers", element: <Customers /> },
        { path: "/customers/:id", element: <CustomerProfile /> },
        { path: "/ai", element: <Stub name="AI 어시스턴트" /> },
        { path: "/settings", element: <Stub name="설정" /> },
      ],
    },
  ],
  { basename },
);

export default function App() {
  return <RouterProvider router={router} />;
}
