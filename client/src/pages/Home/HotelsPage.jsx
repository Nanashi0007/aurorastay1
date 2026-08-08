import { useState, useEffect, useRef } from "react";
import { useHotels } from "../../hooks/useHotels";
import FilterSidebar from "../../components/Hotels/FilterSidebar";
import SearchBar from "./components/SearchBar";
import HotelCard from "./components/Hotelcard";
import "../../styles/hotelspage.css";
import Navbar from "./components/Navbar";
import CompleteProfileModal from "./ProfileModal";

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
  const userMenuRef = useRef(null);

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
  }, []);

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

  function handleSearch({ destination, checkIn, checkOut, guests }) {
    console.log("handleSearch fired:", {
      destination,
      checkIn,
      checkOut,
      guests,
    }); // temp
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
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <div className="hotels-page">
        <FilterSidebar filters={filters} onChange={setFilters} />

        <div className="hotels-results">
          <h1>Hotels, resorts, inns and homestays</h1>

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
