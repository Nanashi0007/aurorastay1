import { useState } from "react";
import AdminLogin from "../AdminLogin";
import { getStoredAdminAuth } from "../../../utils/storage";

export default function RequireAdmin({ children }) {
  const [, forceRerender] = useState(0);
  const { token, user } = getStoredAdminAuth();
  const isAdmin = !!token && user?.role === "admin";

  if (!isAdmin) {
    return <AdminLogin onLoginSuccess={() => forceRerender((n) => n + 1)} />;
  }

  return children;
}
