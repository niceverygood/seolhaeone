import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/routes/Login";
import Reserve from "@/routes/Reserve";
import Dashboard from "@/routes/Dashboard";
import Golf from "@/routes/Golf";
import Resort from "@/routes/Resort";
import Customers from "@/routes/Customers";
import CustomerProfile from "@/routes/CustomerProfile";
import AiAssistant from "@/routes/AiAssistant";
import Settings from "@/routes/Settings";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter(
  [
    { path: "/login", element: <Login /> },
    { path: "/reserve", element: <Reserve /> },
    {
      element: <AppLayout />,
      children: [
        { path: "/", element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/golf", element: <Golf /> },
        { path: "/resort", element: <Resort /> },
        { path: "/customers", element: <Customers /> },
        { path: "/customers/:id", element: <CustomerProfile /> },
        { path: "/ai", element: <AiAssistant /> },
        { path: "/settings", element: <Settings /> },
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
