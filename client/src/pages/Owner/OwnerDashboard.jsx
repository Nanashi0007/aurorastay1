import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authFetch } from "../../utils/api";
import { clearAuth } from "../../utils/storage";
import {
  FaHome,
  FaClipboardList,
  FaEnvelope,
  FaWallet,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import Navbar from "../../components/layout/Navbar";
import CompleteProfileModal from "../../components/modals/ProfileModal";
import OwnerDashboardOverview from "../Home/Pages/OwnerDashboardOverview"; // adjust path to match where you save it
import "../../styles/Owner/OwnerListings.css";
import { API_BASE } from "../../config"; // adjust relative path per file
const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaHome,
    path: "/owner/dashboard",
  },
  {
    id: "listings",
    label: "My Listings",
    icon: FaHome,
    path: "/owner/listings",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: FaClipboardList,
    path: "/owner/bookings",
  },
  {
    id: "notification",
    label: "Notification",
    icon: FaEnvelope,
    path: "/owner/notification",
  },
  // {
  //   id: "earnings",
  //   label: "Earnings",
  //   icon: FaWallet,
  //   path: "/owner/earnings",
  // },
  // { id: "settings", label: "Settings", icon: FaCog, path: "/owner/settings" },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);

  const activeCount = listings.filter((l) => l.status === "active").length;

  async function fetchListings() {
    try {
      const result = await authFetch(`${API_BASE}/api/listings/mine`);

      if (!result.ok) {
        setError(result.data?.message || "Failed to load your listings.");
        return;
      }

      setListings(result.data?.listings || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchOwnerBookings() {
      const result = await authFetch(`${API_BASE}/api/bookings/owner`);
      if (!result.ok) {
        if (result.status === 401) {
          navigate("/");
          return;
        }
        setError(result.data?.message || "Failed to load dashboard.");
        return;
      }

      try {
        setBookings(result.data?.bookings || []);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading your dashboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchOwnerBookings();
  }, [navigate]);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
    navigate("/");
  };

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  return (
    <>
      <Navbar
        user={user}
        authLoading={authLoading}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <div className="owner-layout">
        <aside className="owner-sidebar">
          <nav className="owner-sidebar-nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => (
              <button
                type="button"
                key={id}
                className={`owner-sidebar-link ${
                  location.pathname === path ? "active" : ""
                }`}
                onClick={() => navigate(path)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="owner-sidebar-stats">
            <div className="owner-sidebar-stat">
              <span className="owner-sidebar-stat-value">
                {listings.length}
              </span>
              <span className="owner-sidebar-stat-label">Total Listings</span>
            </div>
            <div className="owner-sidebar-stat">
              <span className="owner-sidebar-stat-value">{activeCount}</span>
              <span className="owner-sidebar-stat-label">Active</span>
            </div>
          </div>

          {user && (
            <div className="owner-sidebar-account">
              <div className="owner-sidebar-avatar">
                {user.picture ? (
                  <img src={user.picture} alt="" />
                ) : (
                  <span>{user.firstName?.[0] || "?"}</span>
                )}
              </div>

              <div className="owner-sidebar-account-info">
                <span className="owner-sidebar-account-name">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  type="button"
                  className="owner-sidebar-logout"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="owner-listings-wrap">
          <div className="owner-listings-header">
            <div>
              <h1>Dashboard</h1>
              <p className="owner-listings-subtitle">
                A quick look at how your listings are doing.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mb-loading">Loading dashboard…</p>
          ) : error ? (
            <div className="mb-error">{error}</div>
          ) : (
            <OwnerDashboardOverview bookings={bookings} authToken={authToken} />
          )}
        </div>
      </div>

      <CompleteProfileModal
        isOpen={showCompleteProfile}
        token={authToken}
        initialFirstName={user?.firstName}
        initialLastName={user?.lastName}
        onComplete={handleProfileComplete}
      />
    </>
  );
}
