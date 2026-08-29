import { useState, useRef, useEffect } from "react";
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
import "../../../styles/searchbar.css";

const MIN_GUESTS = 1;
const MAX_GUESTS = 10;

const AURORA_MUNICIPALITIES = [
  "Baler",
  "Casiguran",
  "Dilasag",
  "Dinalungan",
  "Dingalan",
  "Dipaculao",
  "Maria Aurora",
  "San Luis",
];

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

export default function SearchBar({ onSearch, initialDestination = "" }) {
  const [destination, setDestination] = useState(initialDestination);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const destRef = useRef(null);

  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const dateRef = useRef(null);

  const [guests, setGuests] = useState(1);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const guestRef = useRef(null);

  const destSuggestions =
    destination.trim() === ""
      ? []
      : AURORA_MUNICIPALITIES.filter((m) =>
          m.toLowerCase().startsWith(destination.trim().toLowerCase()),
        );

  useEffect(() => {
    function handleClickOutside(e) {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDateModal(false);
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setShowGuestModal(false);
      }
      if (destRef.current && !destRef.current.contains(e.target)) {
        setShowDestSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDestinationChange(e) {
    setDestination(e.target.value);
    setShowDestSuggestions(true);
    setActiveSuggestionIndex(-1);
  }

  function selectDestination(name) {
    setDestination(name);
    setShowDestSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  function handleDestinationKeyDown(e) {
    if (!showDestSuggestions || destSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < destSuggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : destSuggestions.length - 1,
      );
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        selectDestination(destSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDestSuggestions(false);
    }
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

  const guestCount = guests === "" ? MIN_GUESTS : guests;

  function handleSearchClick() {
    onSearch?.({
      destination: destination.trim(),
      checkIn,
      checkOut,
      guests: guestCount,
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

  return (
    <div className="search-card">
      <div className="search-item" ref={destRef}>
        <FaMapMarkerAlt />
        <div>
          <small>Destination</small>
          <input
            type="text"
            placeholder="Where are you going?"
            value={destination}
            onChange={handleDestinationChange}
            onFocus={() => setShowDestSuggestions(true)}
            onKeyDown={handleDestinationKeyDown}
            autoComplete="off"
          />
        </div>

        {showDestSuggestions && destSuggestions.length > 0 && (
          <div className="dropdown-modal destination-suggestions">
            {destSuggestions.map((name, idx) => (
              <button
                type="button"
                key={name}
                className={`destination-suggestion-item ${
                  idx === activeSuggestionIndex ? "active" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()} // keep input focus
                onClick={() => selectDestination(name)}
              >
                <FaMapMarkerAlt size={12} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="divider"></div>

      <div className="search-item search-item-dates" ref={dateRef}>
        <button
          type="button"
          className="search-field-btn"
          onClick={() => {
            setShowDateModal((prev) => !prev);
            setShowGuestModal(false);
            setShowDestSuggestions(false);
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
                if (!day) return <span key={idx} className="date-cell empty" />;

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
            setShowDestSuggestions(false);
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
        onClick={handleSearchClick}
      >
        <FaSearch />
      </button>
    </div>
  );
}
