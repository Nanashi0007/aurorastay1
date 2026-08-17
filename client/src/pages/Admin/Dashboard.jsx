import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clearAuth } from "../../utils/storage";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import ManageUsers from "./Pages/ManageUsers";
import ApplicationsReview from "./Pages/ApplicationsReview";
import AdminAnnouncements from "./components/AdminAnnouncements";
import BackupAndRestore from "./Pages/BackupRestore";
import AdminAnalytics from "./Pages/AdminAnalytics";
import ActivityLogs from "./Pages/ActivityLogs";

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "analytics";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const storedUser = localStorage.getItem("user");
  const currentAdmin = (() => {
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  })();

  function setActiveView(view) {
    setSearchParams({ view }, { replace: true });
  }

  function handleLogout() {
    clearAuth();
    window.location.href = "/";
  }

  return (
    <div className="admin-shell">
      <AdminNavbar
        currentAdmin={currentAdmin}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="admin-main-layout">
        <AdminSidebar
          currentAdmin={currentAdmin}
          onLogout={handleLogout}
          activeView={activeView}
          onNavigate={setActiveView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {activeView === "applications" ? (
          <ApplicationsReview />
        ) : activeView === "announcements" ? (
          <AdminAnnouncements />
        ) : activeView === "backupandrestore" ? (
          <BackupAndRestore />
        ) : activeView === "users" ? (
          <ManageUsers />
        ) : activeView === "activitylogs" ? (
          <ActivityLogs />
        ) : (
          <AdminAnalytics />
        )}
      </div>
    </div>
  );
}
