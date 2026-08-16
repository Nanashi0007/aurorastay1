import { useState } from "react";
import AdminLogin from "../AdminLogin";
import { getStoredAuth } from "../../../utils/storage";

export default function RequireAdmin({ children }) {
  const [, forceRerender] = useState(0);
  const { token, user } = getStoredAuth();
  const isAdmin = !!token && user?.role === "admin";

  if (!isAdmin) {
    return <AdminLogin onLoginSuccess={() => forceRerender((n) => n + 1)} />;
  }

  return children;
}
