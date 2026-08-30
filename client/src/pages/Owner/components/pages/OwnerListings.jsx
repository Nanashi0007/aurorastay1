import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authFetch } from "../../../../utils/api";
import { clearAuth } from "../../../../utils/storage";
import {
  FaPlus,
  FaHome,
  FaClipboardList,
  FaEnvelope,
  FaWallet,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import ListingCard from "./components/ListingCard";
import AddListingWizard from "./components/AddListingWizard";
import ViewListingModal from "./components/ViewListingModal";
import EditListingModal from "./components/EditListingModal";
import ConfirmModal from "./components/ConfirmModal";
import SuccessModal from "./components/SuccessModal";
import "../../../../styles/Owner/OwnerListings.css";
import Navbar from "../../../../components/layout/Navbar";
import CompleteProfileModal from "../../../../components/modals/ProfileModal";
import { API_BASE } from "../../../../config"; // adjust relative path per file

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

export default function OwnerListings() {
  const navigate = useNavigate();
  const location = useLocation();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  const [viewingListing, setViewingListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [deletingListing, setDeletingListing] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);

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
    fetchListings();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (!parsedUser.firstName || !parsedUser.lastName) {
          setShowCompleteProfile(true);
        }
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

  function handleWizardSuccess() {
    setShowWizard(false);
    setLoading(true);
    fetchListings();
    setSuccessMessage({
      title: "Listing Created",
      message: "Your new room/accommodation has been posted successfully.",
    });
  }

  function handleEditSaved(updatedListing) {
    setListings((prev) =>
      prev.map((l) => (l.id === updatedListing.id ? updatedListing : l)),
    );
    setEditingListing(null);
    setSuccessMessage({
      title: "Listing Updated",
      message: "Your changes have been saved successfully.",
    });
  }

  async function handleConfirmDelete() {
    if (!deletingListing) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/listings/${deletingListing.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete listing.");
        return;
      }

      setListings((prev) => prev.filter((l) => l.id !== deletingListing.id));
      setDeletingListing(null);
      setSuccessMessage({
        title: "Listing Deleted",
        message: "The listing has been removed successfully.",
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong deleting this listing.");
    } finally {
      setDeleting(false);
    }
  }

  const activeCount = listings.filter((l) => l.status === "active").length;

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
              <h1>My Listings</h1>
              <p className="owner-listings-subtitle">
                Manage the rooms and accommodations guests can book.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary owner-listings-add-btn"
              onClick={() => setShowWizard(true)}
            >
              <FaPlus /> Add Accommodation
            </button>
          </div>

          {loading ? (
            <div className="owner-listings-grid">
              {[1, 2, 3, 4].map((n) => (
                <div className="listing-card listing-card-skeleton" key={n}>
                  <div className="skeleton-block skeleton-image" />
                  <div className="listing-card-body">
                    <div className="skeleton-block skeleton-line" />
                    <div className="skeleton-block skeleton-line short" />
                    <div className="skeleton-block skeleton-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="owner-listings-empty owner-listings-error">
              <FaHome />
              <h2>Couldn't load your listings</h2>
              <p>{error}</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="owner-listings-empty">
              <FaHome />
              <h2>No listings yet</h2>
              <p>
                You haven't posted any rooms yet. Click "Add Room /
                Accommodation" to get started.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowWizard(true)}
              >
                <FaPlus /> Add Your First Room
              </button>
            </div>
          ) : (
            <div className="owner-listings-grid">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onEdit={setEditingListing}
                  onDelete={setDeletingListing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showWizard && (
        <AddListingWizard
          authToken={authToken}
          onClose={() => setShowWizard(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      {viewingListing && (
        <ViewListingModal
          listing={viewingListing}
          onView={(listing) => navigate(`/owner/listings/${listing.id}`)}
        />
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          authToken={authToken}
          onClose={() => setEditingListing(null)}
          onSaved={handleEditSaved}
        />
      )}

      {deletingListing && (
        <ConfirmModal
          title="Delete this listing?"
          message={`"${deletingListing.title}" will be permanently removed, along with all its photos. This can't be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingListing(null)}
        />
      )}

      {successMessage && (
        <SuccessModal
          title={successMessage.title}
          message={successMessage.message}
          onClose={() => setSuccessMessage(null)}
        />
      )}

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
