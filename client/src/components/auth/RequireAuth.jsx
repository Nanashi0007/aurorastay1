import { Navigate, useLocation } from "react-router-dom";
import { getStoredAuth } from "../../utils/storage";

export default function RequireAuth({
  children,
  redirectTo = "/",
  allowedRoles,
  requireAdmin = false,
}) {
  const location = useLocation();
  const { token, user } = getStoredAuth();

  if (!token || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return children;
}
