import { useEffect, useState } from "react";

export default function FilterSidebar({ filters, onChange }) {
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

  function toggleArrayValue(key, value) {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  return (
    <aside className="filter-sidebar">
      <div className="filter-group">
        <h4>Price per night</h4>
        <div className="filter-price-row">
          <input
            type="number"
            placeholder={`₱${meta.priceRange.min}`}
            value={filters.minPrice || ""}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
          />
          <input
            type="number"
            placeholder={`₱${meta.priceRange.max}`}
            value={filters.maxPrice || ""}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          />
        </div>
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
    </aside>
  );
}
