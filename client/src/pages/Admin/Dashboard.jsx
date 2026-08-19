import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { clearAdminAuth, getStoredAdminAuth } from "../../utils/storage";
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

  const { user: currentAdmin } = getStoredAdminAuth();

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  function setActiveView(view) {
    setSearchParams({ view }, { replace: true });
  }

  function handleLogout() {
    clearAdminAuth();
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

        <div className="admin-content">
          {activeView === "applications" ? (
            <ApplicationsReview />
          ) : activeView === "announcements" ? (
            <AdminAnnouncements />
          ) : activeView === "backupandrestore" ? (
            <BackupRestore />
          ) : activeView === "users" ? (
            <ManageUsers />
          ) : activeView === "activitylogs" ? (
            <ActivityLogs />
          ) : (
            <AdminAnalytics />
          )}
        </div>
      </div>
    </div>
  );
}
