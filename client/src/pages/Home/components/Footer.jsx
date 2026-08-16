import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
} from "react-icons/fa";
import "../../../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* =========================
            TOP FOOTER
        ========================== */}
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              AuroraStay
            </Link>

            <p className="footer-description">
              Your trusted accommodation and reservation platform for
              discovering stays across Aurora Province.
            </p>

            <div className="footer-location">
              <FaMapMarkerAlt />
              <span>Aurora Province, Philippines</span>
            </div>
          </div>

          {/* Explore */}
          <div className="footer-column">
            <h3>Explore</h3>

            <Link to="/">Home</Link>

            <Link to="/hotels">Browse Accommodations</Link>

            <Link to="/bookings">My Bookings</Link>
          </div>

          {/* For Property Owners */}
          <div className="footer-column">
            <h3>For Property Owners</h3>

            <Link to="/owner-dashboard">Host Your Property</Link>

            <Link to="/owner-dashboard">Manage Your Property</Link>

            <Link to="/owner-dashboard">Manage Rooms</Link>
          </div>

          {/* Support */}
          <div className="footer-column">
            <h3>Support</h3>

            <Link to="/contact">Contact Us</Link>

            <Link to="/help">Help Center</Link>

            <Link to="/privacy">Privacy Policy</Link>

            <Link to="/terms">Terms & Conditions</Link>
          </div>

          {/* Contact */}
          <div className="footer-column footer-contact">
            <h3>Get in Touch</h3>

            <a href="mailto:support@aurorastay.com">
              <FaEnvelope />
              support@aurorastay.com
            </a>

            <a href="tel:+630000000000">
              <FaPhoneAlt />
              Contact Support
            </a>

            <div className="footer-socials">
              <a href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>

              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>

        {/* =========================
            DIVIDER
        ========================== */}
        <div className="footer-divider" />

        {/* =========================
            BOTTOM FOOTER
        ========================== */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} AuroraStay. All rights reserved.</p>

          <p>
            Integrated Tourism Accommodation Information and Reservation System
          </p>
        </div>
      </div>
    </footer>
  );
}
