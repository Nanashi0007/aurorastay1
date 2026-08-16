import { useState, useEffect, useRef } from "react";
import { FaSlidersH } from "react-icons/fa";
import { clearAuth } from "../../utils/storage";
import { useHotels } from "../../hooks/useHotels";
import FilterSidebar from "../../components/Hotels/FilterSidebar";
import SearchBar from "./components/SearchBar";
import HotelCard from "../../components/cards/HotelCard";
import "../../styles/hotelspage.css";
import Navbar from "../../components/layout/Navbar";
import CompleteProfileModal from "../../components/modals/ProfileModal";

export default function HotelsPage() {
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    types: [],
    amenities: [],
    destination: "",
    checkIn: null,
    checkOut: null,
    guests: "",
  });

  const { hotels, loading, error } = useHotels(filters);
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);

  const activeFilterCount =
    (filters.types?.length || 0) +
    (filters.amenities?.length || 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  const chips = [
    ...(filters.types || []).map((t) => ({
      key: `type:${t}`,
      label: t,
      remove: () =>
        setFilters({ ...filters, types: filters.types.filter((v) => v !== t) }),
    })),
    ...(filters.amenities || []).map((a) => ({
      key: `amenity:${a}`,
      label: a,
      remove: () =>
        setFilters({
          ...filters,
          amenities: filters.amenities.filter((v) => v !== a),
        }),
    })),
  ];

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

  // Lock body scroll while mobile filter drawer is open
  useEffect(() => {
    if (!filterOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterOpen]);

  // Close drawer when resizing back to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) setFilterOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  function handleSearch({ destination, checkIn, checkOut, guests }) {
    setFilters((prev) => ({
      ...prev,
      destination,
      checkIn,
      checkOut,
      guests,
    }));
  }

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

      <div className={`hotels-page${filterOpen ? " filters-open" : ""}`}>
        <div
          className={`filter-backdrop${filterOpen ? " is-open" : ""}`}
          onClick={() => setFilterOpen(false)}
          aria-hidden={!filterOpen}
        />

        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
        />

        <div className="hotels-results">
          <div className="hotels-results-header">
            <h1>Hotels, resorts, inns and homestays</h1>

            <button
              type="button"
              className="hotels-filter-toggle"
              onClick={() => setFilterOpen(true)}
              aria-expanded={filterOpen}
              aria-controls="hotels-filter-panel"
            >
              <FaSlidersH aria-hidden="true" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="hotels-filter-count">{activeFilterCount}</span>
              )}
            </button>
          </div>

          <div className="hotels-search-bar">
            <SearchBar onSearch={handleSearch} />
          </div>
          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map((chip) => (
                <span className="filter-chip" key={chip.key}>
                  {chip.label}
                  <button
                    onClick={chip.remove}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading && <p className="hotels-empty">Loading hotels...</p>}
          {error && <p className="hotels-empty">{error}</p>}
          {!loading && !error && hotels.length === 0 && (
            <p className="hotels-empty">No hotels match your filters.</p>
          )}

          <div className="hotels-grid">
            {hotels.map((hotel) => (
              <HotelCard hotel={hotel} key={hotel.id} />
            ))}
          </div>
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
