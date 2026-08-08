import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import HotelCard from "./Hotelcard";
import "../../../styles/htsection.css";

export default function HotelsSection({ hotels }) {
  const sliderRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const visibleHotels = hotels.slice(0, 7); // ADD THIS

  const updateButtons = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    setCanScrollLeft(slider.scrollLeft > 5);

    setCanScrollRight(
      slider.scrollLeft < slider.scrollWidth - slider.clientWidth - 5,
    );
  };

  useEffect(() => {
    updateButtons();

    const slider = sliderRef.current;

    slider.addEventListener("scroll", updateButtons);
    window.addEventListener("resize", updateButtons);

    return () => {
      slider.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [visibleHotels]); // UPDATED — recalculate arrow state if the sliced list changes

  const scroll = (direction) => {
    const slider = sliderRef.current;

    slider.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  return (
    <section className="popular container">
      <div className="section-header">
        <div>
          <h3 className="small">Hotels, Resorts, Inns & Homestays</h3>
        </div>
        <div className="t">
          <Link to="/hotels" className="browse-link">
            Browse More
            <FaChevronRight />
          </Link>
        </div>
      </div>

      <div className="hotel-carousel-wrapper">
        <button
          className={`carousel-arrow left ${!canScrollLeft ? "disabled" : ""}`}
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
        >
          <FaChevronLeft />
        </button>

        <div className="hotel-carousel" ref={sliderRef}>
          {visibleHotels.map(
            (
              hotel, // UPDATED — was hotels.map
            ) => (
              <HotelCard hotel={hotel} key={hotel.id} />
            ),
          )}
        </div>

        <button
          className={`carousel-arrow right ${
            !canScrollRight ? "disabled" : ""
          }`}
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}
