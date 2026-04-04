import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Properties from "./components/Properties";
import Units from "./pages/Units";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Financial from "./pages/Financial";
import Maintenance from "./pages/Maintenance";
import PropertyMedia from "./pages/PropertyMedia";
import EmailIntegration from "./pages/EmailIntegration";
import TenantRating from "./pages/TenantRating";
import PaymentAlerts from "./pages/PaymentAlerts";
import OccupancyForecast from "./pages/OccupancyForecast";
import UtilityMeters from "./pages/UtilityMeters";
import MaintenanceInventory from "./pages/MaintenanceInventory";
import VisitorLog from "./pages/VisitorLog";
import TaxDeductions from "./pages/TaxDeductions";
import QRInspections from "./pages/QRInspections";
import VoiceNotes from "./pages/VoiceNotes";
import EmergencyContacts from "./pages/EmergencyContacts";
import LandlordNetwork from "./pages/LandlordNetwork";
import PetPolicy from "./pages/PetPolicy";
import VehicleManagement from "./pages/VehicleManagement";
import InsuranceWarranty from "./pages/InsuranceWarranty";
import DisputeLog from "./pages/DisputeLog";
import PaymentPage from "./pages/PaymentPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import PublicPay from "./pages/PublicPay";
import MessagesGate from "./pages/MessagesGate";
import PublicChat from "./pages/PublicChat";
import PublicInviteAccept from "./pages/PublicInviteAccept";
import TenantDashboard from "./pages/TenantDashboard";
import Billing from "./pages/Billing";
import AdminMonetization from "./pages/AdminMonetization";
import NotificationsPage from "./pages/NotificationsPage";
import CopilotPage from "./pages/CopilotPage";
import WorkflowPage from "./pages/WorkflowPage";
import TimelinePage from "./pages/TimelinePage";
import CommandCenter from "./pages/CommandCenter";
import CollectionsCenter from "./pages/CollectionsCenter";
import Marketplace from "./pages/Marketplace";
import TeamManagement from "./pages/TeamManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider, NotificationContainer } from "./context/NotificationContext";
import MainLayout from "./components/MainLayout";

function App() {
  const isLoggedIn = Boolean(localStorage.getItem("user"));
  let role = null;
  try {
    const raw = localStorage.getItem("user");
    role = raw ? JSON.parse(raw)?.role : null;
  } catch {
    role = null;
  }
  const defaultAuthedPath = role === "tenant" ? "/tenant" : "/dashboard";

  const LandlordOnly = ({ children }) => (
    <ProtectedRoute roles={["landlord", "admin"]}>{children}</ProtectedRoute>
  );
  const TenantOnly = ({ children }) => (
    <ProtectedRoute roles={["tenant"]}>{children}</ProtectedRoute>
  );
  const AnyAuthed = ({ children }) => (
    <ProtectedRoute roles={["landlord", "tenant", "admin"]}>{children}</ProtectedRoute>
  );
  // Pages that require both landlord role + active subscription
  const LandlordSubOnly = ({ children }) => (
    <ProtectedRoute roles={["landlord", "admin"]}>
      <SubscriptionGuard>{children}</SubscriptionGuard>
    </ProtectedRoute>
  );
  const AdminOnly = ({ children }) => (
    <ProtectedRoute roles={["admin"]}>{children}</ProtectedRoute>
  );

  return (
    <NotificationProvider>
      <ThemeProvider>
        <BrowserRouter>
          <NotificationContainer />
          <Routes>
            <Route path="/" element={<Navigate to={isLoggedIn ? defaultAuthedPath : "/login"} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/tenant"
              element={
                <TenantOnly>
                  <MainLayout>
                    <TenantDashboard />
                  </MainLayout>
                </TenantOnly>
              }
            />
            <Route
              path="/properties"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Properties />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/units"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Units />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/tenants"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Tenants />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/payments"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Payments />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/marketplace"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Marketplace />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/team-management"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <TeamManagement />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/pay-rent"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <PaymentPage />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/payment-history"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <PaymentHistoryPage />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-failed" element={<PaymentFailedPage />} />
            <Route path="/pay/:token" element={<PublicPay />} />
            <Route path="/chat/:token" element={<PublicChat />} />
            <Route path="/invite/:token" element={<PublicInviteAccept />} />
            <Route
              path="/messages"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <MessagesGate />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/analytics"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Analytics />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/profile"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/financial"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <Financial />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/billing"
              element={
                <LandlordOnly>
                  <MainLayout>
                    <Billing />
                  </MainLayout>
                </LandlordOnly>
              }
            />
            <Route
              path="/admin-monetization"
              element={
                <AdminOnly>
                  <MainLayout>
                    <AdminMonetization />
                  </MainLayout>
                </AdminOnly>
              }
            />
            <Route
              path="/notifications"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <NotificationsPage />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/copilot"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <CopilotPage />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/workflows"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <WorkflowPage />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/timeline"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <TimelinePage />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/command-center"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <CommandCenter />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/collections-center"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <CollectionsCenter />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/maintenance"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <Maintenance />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/media"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <PropertyMedia />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/email"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <EmailIntegration />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/tenant-rating"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <TenantRating />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/payment-alerts"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <PaymentAlerts />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/occupancy"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <OccupancyForecast />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/utility-meters"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <UtilityMeters />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/maintenance-inventory"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <MaintenanceInventory />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/visitor-log"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <VisitorLog />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/tax-deductions"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <TaxDeductions />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/qr-inspections"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <QRInspections />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/voice-notes"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <VoiceNotes />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/emergency-contacts"
              element={
                <AnyAuthed>
                  <MainLayout>
                    <EmergencyContacts />
                  </MainLayout>
                </AnyAuthed>
              }
            />
            <Route
              path="/landlord-network"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <LandlordNetwork />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/pet-policy"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <PetPolicy />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/vehicle-management"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <VehicleManagement />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/insurance-warranty"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <InsuranceWarranty />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route
              path="/dispute-log"
              element={
                <LandlordSubOnly>
                  <MainLayout>
                    <DisputeLog />
                  </MainLayout>
                </LandlordSubOnly>
              }
            />
            <Route path="*" element={<Navigate to={isLoggedIn ? defaultAuthedPath : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </NotificationProvider>
  );
}

export default App;
