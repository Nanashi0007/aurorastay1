import { Link } from "react-router-dom";

import {
  FaChevronDown,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaSuitcaseRolling,
  FaHeart,
  FaHistory,
  FaHotel,
} from "react-icons/fa";

export default function Navbar({
  user,
  showUserMenu,
  setShowUserMenu,
  userMenuRef,
  showMobileNav,
  setShowMobileNav,
  onLoginClick,
  onLogout,
}) {
  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <span>Aurora</span>Stay
        </Link>

        <div className="nav-buttons">
          {user ? (
            <div className="nav-user" ref={userMenuRef}>
              <button
                className="nav-user-trigger"
                onClick={() => setShowUserMenu((prev) => !prev)}
              >
                {user.picture ? (
                  <img
                    className="nav-user-avatar"
                    src={user.picture}
                    alt={`${user.firstName} ${user.lastName}`}
                  />
                ) : (
                  <div className="nav-user-avatar nav-user-avatar-fallback">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </div>
                )}
                <span className="nav-user-name">
                  {user.firstName} {user.lastName}
                </span>
                <FaChevronDown className="nav-user-caret" />
              </button>

              {showUserMenu && (
                <div className="nav-user-dropdown">
                  <Link to="/owner-dashboard">
                    <FaHotel />
                    Host Your Property
                  </Link>
                  <Link to="/bookings">
                    <FaSuitcaseRolling />
                    My Bookings
                  </Link>
                  <a href="/saved">
                    <FaHeart />
                    Saved
                  </a>
                  <a href="/recently-viewed">
                    <FaHistory />
                    Recently Viewed
                  </a>
                  <div className="nav-user-dropdown-divider" />
                  <button onClick={onLogout}>
                    <FaSignOutAlt />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-outline" onClick={onLoginClick}>
              Login
            </button>
          )}

          {/* <button
            className="nav-toggle"
            aria-label="Toggle menu"
            onClick={() => setShowMobileNav((prev) => !prev)}
          >
            {showMobileNav ? <FaTimes /> : <FaBars />}
          </button> */}
        </div>
      </div>

      <div className="horizon-line" aria-hidden="true"></div>
    </header>
  );
}
