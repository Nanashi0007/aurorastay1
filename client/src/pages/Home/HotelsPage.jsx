import { FaFilter, FaSearch, FaTimes } from "react-icons/fa";
import { useState, useEffect, useRef, useMemo } from "react";
import { clearAuth } from "../../utils/storage";
import { useHotels } from "../../hooks/useHotels";
import FilterSidebar from "../../components/Hotels/FilterSidebar";
import HotelCard from "../../components/cards/HotelCard";
import "../../styles/hotelspage.css";
import Navbar from "../../components/layout/Navbar";
import CompleteProfileModal from "../../components/modals/ProfileModal";

import { useSearchParams } from "react-router-dom";
import SearchBar from "../Home/components/SearchBar";

export default function HotelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read search-bar-related values straight from the URL
  const destination = searchParams.get("destination") || "";
  const checkInParam = searchParams.get("checkIn"); // string, e.g. "2026-08-17"
  const checkOutParam = searchParams.get("checkOut");
  const guestsParam = searchParams.get("guests");

  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;
  const guests = guestsParam ? Number(guestsParam) : "";

  // Sidebar-only filters (price, types, amenities) stay in local state
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    types: [],
    amenities: [],
  });

  // Combine URL-driven search fields + sidebar filters for the actual query
  const combinedFilters = useMemo(
    () => ({
      ...filters,
      destination,
      checkIn: checkInParam ? new Date(checkInParam) : null,
      checkOut: checkOutParam ? new Date(checkOutParam) : null,
      guests: guestsParam ? Number(guestsParam) : "",
    }),
    [filters, destination, checkInParam, checkOutParam, guestsParam],
  );

  const { hotels, loading, error } = useHotels(combinedFilters);
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  const activeFilterCount =
    (filters.types?.length || 0) +
    (filters.amenities?.length || 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

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
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (checkIn) params.set("checkIn", checkIn.toISOString().slice(0, 10));
    if (checkOut) params.set("checkOut", checkOut.toISOString().slice(0, 10));
    if (guests) params.set("guests", guests);
    setSearchParams(params);
  }

  function formatDate(date) {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

      <div className="hotels-page">
        <div className="hotels-results">
          <div className="hotels-results-header">
            <h1>Hotels, resorts, inns and homestays</h1>

            <button
              type="button"
              className="hotels-filter-toggle"
              onClick={() => setIsFilterOpen(true)}
            >
              <FaFilter />
              Filters
              {activeFilterCount > 0 && (
                <span className="hotels-filter-count">{activeFilterCount}</span>
              )}
            </button>
          </div>

          <div className="hotels-search-bar">
            {/* Compact summary trigger — mobile */}
            <button
              type="button"
              className="hotels-search-summary"
              onClick={() => setIsSearchOpen(true)}
            >
              <FaSearch />
              <span className="hotels-search-summary-text">
                {destination || "Where are you going?"}
                {checkIn &&
                  checkOut &&
                  ` · ${formatDate(checkIn)} - ${formatDate(checkOut)}`}
                {` · ${guests || 1} Guest${guests > 1 ? "s" : ""}`}
              </span>
            </button>

            {/* Full search bar — desktop inline, mobile as a sheet */}
            <div
              className={`hotels-search-full ${isSearchOpen ? "is-open" : ""}`}
            >
              <div
                className="hotels-search-full-backdrop"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="hotels-search-full-panel">
                <button
                  type="button"
                  className="hotels-search-close"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                >
                  <FaTimes />
                </button>
                <SearchBar
                  onSearch={(vals) => {
                    handleSearch(vals);
                    setIsSearchOpen(false);
                  }}
                  initialDestination={destination}
                />
              </div>
            </div>
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

        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
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
