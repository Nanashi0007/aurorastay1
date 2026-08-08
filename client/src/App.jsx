import { BrowserRouter, Routes, Route } from "react-router-dom";

// Home
import Home from "./pages/Home/Home";
import AccommodationDetails from "./pages/Owner/components/pages/components/AccommodationDetails";
import HotelDetails from "./pages/Home/Pages/HotelDetails";
import HotelsPage from "./pages/Home/HotelsPage";

// Auth
import Login from "./pages/Auth/Login";
import TouristRegister from "./pages/Auth/TouristRegister";
import OwnerRegister from "./pages/Auth/OwnerRegister";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Dashboards
import TouristDashboard from "./pages/Tourist/Dashboard";
import AdminDashboard from "./pages/Admin/Dashboard";
import OwnerDashboard from "./pages/Owner/Dashboard";
import OwnerBookings from "./pages/Home/Pages/OwnerBookings";
//owner
import OwnerListings from "./pages/Owner/components/pages/OwnerListings";
import MyBookings from "./pages/Home/Pages/MyBookings";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      {
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/tourist/register" element={<TouristRegister />} />
            <Route path="/owner/register" element={<OwnerRegister />} />
            <Route path="/hotels/:id" element={<HotelDetails />} />

            <Route path="/hotels" element={<HotelsPage />} />

            <Route path="/owner/bookings" element={<OwnerBookings />} />

            <Route
              path="/owner/listings/:id"
              element={<AccommodationDetails />}
            />

            {/* Tourist */}
            <Route path="/tourist/dashboard" element={<TouristDashboard />} />
            <Route path="/bookings" element={<MyBookings />} />
            {/* Owner */}
            <Route path="/owner-dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/listings" element={<OwnerListings />} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      }
    </GoogleOAuthProvider>
  );
}

export default App;
