import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Home from "./pages/Home/Home";
import AccommodationDetails from "./pages/Owner/components/pages/components/AccommodationDetails";
import HotelDetails from "./pages/Home/Pages/HotelDetails";
import HotelsPage from "./pages/Home/HotelsPage";

import BackupRestore from "./pages/Admin/Pages/BackupRestore";

import Login from "./pages/Auth/Login";
import TouristRegister from "./pages/Auth/TouristRegister";
import OwnerRegister from "./pages/Auth/OwnerRegister";
import { AuthProvider } from "./pages/Auth/AuthContext";

import TouristDashboard from "./pages/Tourist/Dashboard";
import AdminDashboard from "./pages/Admin/Dashboard";
import OwnerDashboard from "./pages/Owner/Dashboard";
import OwnerBookings from "./pages/Home/Pages/OwnerBookings";
import OwnerListings from "./pages/Owner/components/pages/OwnerListings";
import MyBookings from "./pages/Home/Pages/MyBookings";
import MyOwnerDashboard from "./pages/Owner/OwnerDashboard";
import Footer from "./components/layout/Footer";

import OwnerNotifications from "./pages/Owner/OwnerNotifications";

import RequireAdmin from "./pages/Admin/components/RequireAdmin";
import RequireAuth from "./components/auth/RequireAuth";

import ProfilePage from "./components/modals/ProfilePage";

import ScrollToTop from "./pages/Home/components/ScrollToTop";

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const redirectOnExpiredSession = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== "/") {
        window.location.replace("/");
      }
    };

    window.addEventListener("aurora-session-expired", redirectOnExpiredSession);
    return () => {
      window.removeEventListener(
        "aurora-session-expired",
        redirectOnExpiredSession,
      );
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/tourist/register" element={<TouristRegister />} />
            <Route path="/owner/register" element={<OwnerRegister />} />
            <Route path="/hotels/:id" element={<HotelDetails />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route
              path="/owner/bookings"
              element={
                <RequireAuth>
                  <OwnerBookings />
                </RequireAuth>
              }
            />
            <Route
              path="/owner/listings/:id"
              element={
                <RequireAuth>
                  <AccommodationDetails />
                </RequireAuth>
              }
            />
            <Route
              path="/owner/dashboard"
              element={
                <RequireAuth>
                  <MyOwnerDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/tourist/dashboard"
              element={
                <RequireAuth allowedRoles={["tourist"]}>
                  <TouristDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/bookings"
              element={
                <RequireAuth>
                  <MyBookings />
                </RequireAuth>
              }
            />
            <Route
              path="/owner-dashboard"
              element={
                <RequireAuth>
                  <OwnerDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/owner/listings"
              element={
                <RequireAuth>
                  <OwnerListings />
                </RequireAuth>
              }
            />
            <Route
              path="/portal/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />

            <Route
              path="/owner/notification"
              element={
                <RequireAuth>
                  <OwnerNotifications />
                </RequireAuth>
              }
            />

            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/admin/backup" element={<BackupRestore />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
