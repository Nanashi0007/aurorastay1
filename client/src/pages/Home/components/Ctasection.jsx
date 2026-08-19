// CTASection.jsx
import { useNavigate } from "react-router-dom";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="cta">
      <div className="container cta-inner">
        <div className="cta-stamp" aria-hidden="true">
          <span>AURORA</span>
          <span>COAST</span>
        </div>
        <h2>Your room is one search away.</h2>
        <p>
          Compare real prices across Baler and lock in your stay in minutes.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            console.log("CTA button clicked");
            navigate("/hotels");
          }}
        >
          Search stays
        </button>
      </div>
    </section>
  );
}
