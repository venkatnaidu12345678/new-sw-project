import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Rides from "./pages/Rides";
import PassengerRides from "./pages/PassengerRides";
import Couriers from "./pages/Couriers";
import LiveTracking from "./pages/LiveTracking";
import Ads from "./pages/Ads";
import Locations from "./pages/Locations";
import LookupTypes from "./pages/LookupTypes";
import Feedbacks from "./pages/Feedbacks";
import LegalPolicies from "./pages/LegalPolicies";

const isAuthed = () => !!localStorage.getItem("adminToken");

const ProtectedRoute = ({ children }) =>
  isAuthed() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="rides" element={<Rides />} />
        <Route path="passenger-rides" element={<PassengerRides />} />
        <Route path="couriers" element={<Couriers />} />
        <Route path="live-tracking" element={<LiveTracking />} />
        <Route path="ads" element={<Ads />} />
        <Route path="locations" element={<Locations />} />
        <Route path="lookup-types" element={<LookupTypes />} />
        <Route path="feedback" element={<Feedbacks />} />
        <Route path="legal" element={<LegalPolicies />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
