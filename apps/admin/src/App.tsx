
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/layout/AdminLayout";
import LoginPage from "./features/auth/pages/LoginPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import SeatConfigurationsPage from "./features/seat-configurations/pages/SeatConfigurationsPage";
import CreateSeatConfigurationPage from "./features/seat-configurations/pages/CreateSeatConfigurationPage";
import EditSeatConfigurationPage from "./features/seat-configurations/pages/EditSeatConfigurationPage";
import VehiclesPage from "./features/vehicles/pages/VehiclesPage";
import CreateVehiclePage from "./features/vehicles/pages/CreateVehiclePage";
import VehicleDetailsPage from "./features/vehicles/pages/VehicleDetailsPage";
import EditVehiclePage from "./features/vehicles/pages/EditVehiclePage";
import VehicleSeatsPage from "./features/vehicles/pages/VehicleSeatsPage";

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff5a1f]" />
      </div>
    );
  }

  return isAuthenticated ? (
    <AdminLayout />
  ) : (
    <Navigate to="/login" replace />
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-bold text-zinc-900">404</h1>
      <p className="mt-3 text-sm text-zinc-500">Page not found.</p>
      <a href="/dashboard" className="mt-5 text-sm font-semibold text-[#ff5a1f]">
        Return to dashboard
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/seat-configurations"
          element={<SeatConfigurationsPage />}
        />

        <Route
          path="/seat-configurations/new"
          element={<CreateSeatConfigurationPage />}
        />

        <Route
          path="/seat-configurations/:id/edit"
          element={<EditSeatConfigurationPage />}
        />

        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/new" element={<CreateVehiclePage />} />
        <Route path="/vehicles/:id" element={<VehicleDetailsPage />} />
        <Route path="/vehicles/:id/edit" element={<EditVehiclePage />} />
        <Route path="/vehicles/:id/seats" element={<VehicleSeatsPage />} />
      </Route>


      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
