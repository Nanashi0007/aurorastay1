import { useState, useEffect, useRef } from "react";
import "../../styles/Home.css";
import "../../styles/Navbar.css";
import "../../styles/hotelsection.css";
import LoginModal from "./LoginModal";
import CompleteProfileModal from "./ProfileModal";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import DestinationsSection from "./components/DestinationsSection";
import FeaturesSection from "./components/FeaturesSection";
import HotelsSection from "./components/Hotelsection";
import CTASection from "./components/CTASection";

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
    setUser(loggedInUser);
    setAuthToken(token);

    if (isNewUser) {
      setShowCompleteProfile(true);
    }
  };

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  return (
    <>
      <Navbar
        user={user}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      {hotelsLoading ? (
        <div className="hotels-loading-placeholder">Loading stays…</div>
      ) : hotelsError ? (
        <div className="hotels-error-placeholder">{hotelsError}</div>
      ) : (
        <>
          <Hero hotels={hotels} />
          <HotelsSection hotels={hotels} />
        </>
      )}

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
