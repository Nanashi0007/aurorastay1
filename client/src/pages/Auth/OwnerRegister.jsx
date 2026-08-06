import { useState } from "react";
import "../../styles/ownerRegister.css";

export default function OwnerRegister() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    accommodationName: "",
    accommodationType: "",
    municipality: "",
    address: "",
    businessPermit: null,
    governmentId: null,
    dotCertificate: null,
    agree: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!formData.agree) {
      alert("Please agree to the terms.");
      return;
    }

    console.log(formData);

    alert("Registration Submitted!");
  };

  return (
    <div className="register-container">
      <form className="register-card" onSubmit={handleSubmit}>
        <h2>Accommodation Owner Registration</h2>

        {/* Account Information */}
        <h3>Account Information</h3>

        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="contact"
          placeholder="Contact Number"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          onChange={handleChange}
          required
        />

        {/* Accommodation */}
        <h3>Accommodation Information</h3>

        <input
          type="text"
          name="accommodationName"
          placeholder="Accommodation Name"
          onChange={handleChange}
          required
        />

        <select name="accommodationType" onChange={handleChange} required>
          <option value="">Select Type</option>
          <option>Hotel</option>
          <option>Resort</option>
          <option>Inn</option>
          <option>Homestay</option>
        </select>

        <input
          type="text"
          name="municipality"
          placeholder="Municipality"
          onChange={handleChange}
          required
        />

        <textarea
          name="address"
          placeholder="Complete Address"
          rows="3"
          onChange={handleChange}
          required
        />

        {/* Verification */}
        <h3>Verification</h3>

        <label>Business Permit</label>
        <input
          type="file"
          name="businessPermit"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          required
        />

        <label>Valid Government ID</label>
        <input
          type="file"
          name="governmentId"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          required
        />

        <label>DOT Accreditation (Optional)</label>
        <input
          type="file"
          name="dotCertificate"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
        />

        <div className="checkbox">
          <input type="checkbox" name="agree" onChange={handleChange} />
          <label>
            I certify that the information provided is true and correct.
          </label>
        </div>

        <button type="submit">Submit Registration</button>
      </form>
    </div>
  );
}
