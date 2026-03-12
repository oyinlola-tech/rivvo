import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import OTPVerification from "./pages/auth/OTPVerification";
import Home from "./pages/Home";
import Messages from "./pages/Messages";
import Calls from "./pages/Calls";
import Contacts from "./pages/Contacts";
import Status from "./pages/Status";
import Settings from "./pages/Settings";
import DeviceKeys from "./pages/DeviceKeys";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminModerators from "./pages/admin/Moderators";
import NotFound from "./pages/NotFound";
import ModeratorLayout from "./layouts/ModeratorLayout";
import ModeratorReports from "./pages/moderator/Reports";

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "verify-otp", Component: OTPVerification },
    ],
  },
  {
    path: "/terms",
    Component: Terms,
  },
  {
    path: "/privacy",
    Component: Privacy,
  },
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Home },
      { path: "messages", Component: Messages },
      { path: "messages/:id", Component: Messages },
      { path: "calls", Component: Calls },
      { path: "status", Component: Status },
      { path: "contacts", Component: Contacts },
      { path: "settings", Component: Settings },
      { path: "settings/device-keys", Component: DeviceKeys },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "users", Component: AdminUsers },
      { path: "reports", Component: AdminReports },
      { path: "analytics", Component: AdminAnalytics },
      { path: "moderators", Component: AdminModerators },
    ],
  },
  {
    path: "/moderator",
    Component: ModeratorLayout,
    children: [{ path: "reports", Component: ModeratorReports }],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
