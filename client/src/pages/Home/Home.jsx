import { useState, useEffect, useRef } from "react";
import { clearAuth } from "../../utils/storage";
import "../../styles/Home.css";
import "../../styles/Navbar.css";
import "../../styles/Hotelsection.css";
import LoginModal from "../../components/modals/LoginModal";
import CompleteProfileModal from "../../components/modals/ProfileModal";
import Navbar from "../../components/layout/Navbar";
import Hero from "./components/Hero";
import DestinationsSection from "./components/DestinationsSection";
import FeaturesSection from "./components/FeaturesSection";
import HotelsSection from "./components/Hotelsection"; // correct casing
import CTASection from "./components/CTASection";
import HomeSkeleton from "./components/HomeSkeleton";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // --- Real listings from the database ---
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [hotelsError, setHotelsError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function fetchHotels() {
      try {
        const res = await fetch("/api/hotels");
        const data = await res.json();

        if (!res.ok) {
          setHotelsError(data.message || "Failed to load listings.");
          return;
        }

        setHotels(data.hotels || []);
        setHotelsError(null);
      } catch (err) {
        console.error("Failed to fetch hotels:", err);
        setHotelsError("Something went wrong loading listings.");
      } finally {
        setHotelsLoading(false);
      }
    }

    fetchHotels();
  }, []);

  // Restore the logged-in state on page load / refresh.
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

  // Close the user dropdown when clicking outside it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoginSuccess = (loggedInUser, isNewUser, token) => {
    setAuthLoading(true);
    setUser(loggedInUser);
    setAuthToken(token);

    setTimeout(() => setAuthLoading(false), 300);

    if (isNewUser) {
      setShowCompleteProfile(true);
    }
  };

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
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

      {hotelsLoading ? (
        <HomeSkeleton />
      ) : hotelsError ? (
        <div className="hotels-error-placeholder">
          <p>{hotelsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-btn"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <Hero hotels={hotels} />
          <HotelsSection hotels={hotels} />
        </>
      )}

      <FeaturesSection />

      <CTASection />

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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
