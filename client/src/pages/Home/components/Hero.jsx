import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../../../utils/api";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUserFriends,
  FaMinus,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import QuickBookCard from "../../../components/cards/QuickBookCard";
import "../../../styles/Hero.css";
import "../../../styles/recent.css";
// import { getRecentlyViewedIds } from "../../../utils/recentlyViewed";

const MIN_GUESTS = 1;
const MAX_GUESTS = 10;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

export default function Hero({ hotels }) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");

  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const dateRef = useRef(null);

  const [guests, setGuests] = useState(1);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const guestRef = useRef(null);

  // --- Carousel state/refs ---
  const carouselRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  //hotels
  const [recentlyViewedHotels, setRecentlyViewedHotels] = useState([]);

  useEffect(() => {
    async function fetchRecentlyViewed() {
      const result = await authFetch("/api/recently-viewed");

      if (!result.ok) {
        setRecentlyViewedHotels([]);
        return;
      }

      setRecentlyViewedHotels(result.data?.hotels || []);
    }

    fetchRecentlyViewed();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDateModal(false);
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setShowGuestModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateScrollButtons() {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = carouselRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [recentlyViewedHotels]);

  function handleSearch() {
    const params = new URLSearchParams();
    if (destination.trim()) params.set("search", destination.trim());
    if (checkIn) params.set("checkIn", checkIn.toISOString().split("T")[0]);
    if (checkOut) params.set("checkOut", checkOut.toISOString().split("T")[0]);
    if (guestCount > 1) params.set("guests", guestCount);
    navigate(`/hotels?${params.toString()}`);
  }

  function scrollCarousel(direction) {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector(".quickbook-card-wrap");
    const scrollAmount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  }

  function handleDayClick(day) {
    if (!day) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(day);
      setCheckOut(null);
    } else if (day < checkIn) {
      setCheckIn(day);
      setCheckOut(null);
    } else {
      setCheckOut(day);
    }
  }

  function changeMonth(offset) {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  }

  function handleGuestInputChange(e) {
    const val = e.target.value.replace(/\D/g, "");
    if (val === "") {
      setGuests("");
      return;
    }
    let num = parseInt(val, 10);
    if (num > MAX_GUESTS) num = MAX_GUESTS;
    setGuests(num);
  }

  function handleGuestInputBlur() {
    if (guests === "" || guests < MIN_GUESTS) {
      setGuests(MIN_GUESTS);
    }
  }

  function incrementGuests() {
    setGuests((prev) => {
      const cur = prev === "" ? MIN_GUESTS : prev;
      return Math.min(cur + 1, MAX_GUESTS);
    });
  }

  function decrementGuests() {
    setGuests((prev) => {
      const cur = prev === "" ? MIN_GUESTS : prev;
      return Math.max(cur - 1, MIN_GUESTS);
    });
  }

  const days = buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateLabel =
    checkIn && checkOut
      ? `${formatDate(checkIn)} - ${formatDate(checkOut)}`
      : checkIn
        ? `${formatDate(checkIn)} - Add checkout`
        : "Add dates";

  const guestCount = guests === "" ? MIN_GUESTS : guests;

  return (
    <section className="hero">
      <div className="hero-overlay">
        <div className="hero-content">
          <span className="hero-tag">Baler, Aurora · Surf coast</span>
          <h1>Find your stay on the Aurora coast</h1>
          <p className="hero-sub">
            Search a stay and book today — real rooms, real availability.
          </p>
        </div>

        <div className="search-card">
          <div className="search-item">
            <FaMapMarkerAlt />
            <div>
              <small>Destination</small>
              <input
                type="text"
                placeholder="Where are you going?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          <div className="divider"></div>

          <div className="search-item search-item-dates" ref={dateRef}>
            <button
              type="button"
              className="search-field-btn"
              onClick={() => {
                setShowDateModal((prev) => !prev);
                setShowGuestModal(false);
              }}
            >
              <FaCalendarAlt />
              <div>
                <small>Check In - Check Out</small>
                <span className="search-field-value">{dateLabel}</span>
              </div>
            </button>

            {showDateModal && (
              <div className="dropdown-modal date-modal">
                <div className="date-modal-header">
                  <button type="button" onClick={() => changeMonth(-1)}>
                    <FaChevronLeft />
                  </button>
                  <span>
                    {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </span>
                  <button type="button" onClick={() => changeMonth(1)}>
                    <FaChevronRight />
                  </button>
                </div>

                <div className="date-modal-weekdays">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                <div className="date-modal-grid">
                  {days.map((day, idx) => {
                    if (!day)
                      return <span key={idx} className="date-cell empty" />;

                    const isPast = day < today;
                    const isCheckIn = isSameDay(day, checkIn);
                    const isCheckOut = isSameDay(day, checkOut);
                    const inRange =
                      checkIn && checkOut && day > checkIn && day < checkOut;

                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={isPast}
                        className={`date-cell ${
                          isCheckIn || isCheckOut ? "selected" : ""
                        } ${inRange ? "in-range" : ""}`}
                        onClick={() => handleDayClick(day)}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="dropdown-modal-footer">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setCheckIn(null);
                      setCheckOut(null);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-apply"
                    onClick={() => setShowDateModal(false)}
                    disabled={!checkIn || !checkOut}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="divider"></div>

          <div className="search-item search-item-guests" ref={guestRef}>
            <button
              type="button"
              className="search-field-btn"
              onClick={() => {
                setShowGuestModal((prev) => !prev);
                setShowDateModal(false);
              }}
            >
              <FaUserFriends />
              <div>
                <small>Guests</small>
                <span className="search-field-value">
                  {guestCount} Guest{guestCount > 1 ? "s" : ""}
                </span>
              </div>
            </button>

            {showGuestModal && (
              <div className="dropdown-modal guest-modal">
                <div className="guest-row">
                  <div>
                    <strong>Guests</strong>
                    <small>Ages 13 or above</small>
                  </div>

                  <div className="guest-counter">
                    <button
                      type="button"
                      onClick={decrementGuests}
                      disabled={guestCount <= MIN_GUESTS}
                      aria-label="Decrease guests"
                    >
                      <FaMinus />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={guests}
                      onChange={handleGuestInputChange}
                      onBlur={handleGuestInputBlur}
                    />
                    <button
                      type="button"
                      onClick={incrementGuests}
                      disabled={guestCount >= MAX_GUESTS}
                      aria-label="Increase guests"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>

                <small className="guest-limit-note">
                  Max {MAX_GUESTS} guests per room
                </small>

                <div className="dropdown-modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary btn-apply"
                    onClick={() => setShowGuestModal(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="divider"></div>

          <button
            className="btn btn-primary search-btn"
            aria-label="Search"
            onClick={handleSearch}
          >
            <FaSearch />
          </button>
        </div>
      </div>

      <div className="quickbook container">
        <div className="quickbook-head">
          <h2>Recently Viewed</h2>

          <div className="t">
            <Link to="/bookings?tab=recentlyViewed" className="browse-link">
              Browse More
              <FaChevronRight />
            </Link>
          </div>
        </div>

        {recentlyViewedHotels.length === 0 ? (
          <p className="quickbook-empty">
            Listings you view will show up here.
          </p>
        ) : (
          <div className="quickbook-carousel-wrap">
            <button
              type="button"
              className="quickbook-nav quickbook-nav-prev"
              onClick={() => scrollCarousel(-1)}
              disabled={!canScrollPrev}
              aria-label="Show previous recently viewed stays"
            >
              <FaChevronLeft />
            </button>

            <div className="quickbook-carousel" ref={carouselRef}>
              {recentlyViewedHotels.map((hotel) => (
                <div className="quickbook-card-wrap" key={hotel.id}>
                  <QuickBookCard hotel={hotel} />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="quickbook-nav quickbook-nav-next"
              onClick={() => scrollCarousel(1)}
              disabled={!canScrollNext}
              aria-label="Show next recently viewed stays"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
