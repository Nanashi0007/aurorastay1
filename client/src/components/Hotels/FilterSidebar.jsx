import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

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

export default function FilterSidebar({ filters, onChange, isOpen, onClose }) {
  const [meta, setMeta] = useState({
    types: [],
    amenities: [],
    priceRange: { min: 0, max: 0 },
  });

  useEffect(() => {
    fetch("/api/hotels/filters/meta")
      .then((res) => res.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  function toggleArrayValue(key, value) {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function handleClearAll() {
    onChange({
      minPrice: "",
      maxPrice: "",
      types: [],
      amenities: [],
      municipalities: [],
    });
  }

  return (
    <>
      <div
        className={`filter-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`filter-sidebar ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter hotels"
        aria-hidden={!isOpen}
      >
        <div className="filter-sidebar-header">
          <h3>Filters</h3>
          <button
            type="button"
            className="filter-sidebar-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <FaTimes />
          </button>
        </div>

        <div className="filter-sidebar-body">
          <div className="filter-group">
            <h4>Price per night</h4>
            <div className="filter-price-row">
              <input
                type="number"
                placeholder={`₱${meta.priceRange.min}`}
                value={filters.minPrice || ""}
                onChange={(e) =>
                  onChange({ ...filters, minPrice: e.target.value })
                }
                aria-label="Minimum price per night"
              />
              <input
                type="number"
                placeholder={`₱${meta.priceRange.max}`}
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  onChange({ ...filters, maxPrice: e.target.value })
                }
                aria-label="Maximum price per night"
              />
            </div>
          </div>

          <div className="filter-group">
            <h4>Municipality (LGU)</h4>
            {AURORA_MUNICIPALITIES.map((lgu) => (
              <label className="stamp-checkbox" key={lgu}>
                <input
                  type="checkbox"
                  checked={(filters.municipalities || []).includes(lgu)}
                  onChange={() => toggleArrayValue("municipalities", lgu)}
                />
                <span className="mark" aria-hidden="true"></span>
                {lgu}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Accommodation type</h4>
            {meta.types.map((t) => (
              <label className="stamp-checkbox" key={t}>
                <input
                  type="checkbox"
                  checked={(filters.types || []).includes(t)}
                  onChange={() => toggleArrayValue("types", t)}
                />
                <span className="mark" aria-hidden="true"></span>
                {t}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Amenities</h4>
            {meta.amenities.map((a) => (
              <label className="stamp-checkbox" key={a}>
                <input
                  type="checkbox"
                  checked={(filters.amenities || []).includes(a)}
                  onChange={() => toggleArrayValue("amenities", a)}
                />
                <span className="mark" aria-hidden="true"></span>
                {a}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-sidebar-footer">
          <button
            type="button"
            className="filter-clear-btn"
            onClick={handleClearAll}
          >
            Clear all
          </button>
          <button type="button" className="filter-apply-btn" onClick={onClose}>
            Show results
          </button>
        </div>
      </aside>
    </>
  );
}
