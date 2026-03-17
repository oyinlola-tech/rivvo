import { createBrowserRouter } from "react-router";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import OTPVerification from "./pages/auth/OTPVerification";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Home from "./pages/Home";
import Messages from "./pages/Messages";
import Calls from "./pages/Calls";
import Contacts from "./pages/Contacts";
import Status from "./pages/Status";
import Settings from "./pages/Settings";
import DeviceKeys from "./pages/DeviceKeys";
import Help from "./pages/Help";
import StorageData from "./pages/StorageData";
import InviteFriend from "./pages/InviteFriend";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import GroupHandle from "./pages/GroupHandle";
import UserProfile from "./pages/UserProfile";
import InviteUser from "./pages/InviteUser";
import InviteGroup from "./pages/InviteGroup";
import CallJoin from "./pages/CallJoin";
import CallRoom from "./pages/CallRoom";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminModerators from "./pages/admin/Moderators";
import AdminVerificationPayments from "./pages/admin/VerificationPayments";
import NotFound from "./pages/NotFound";
import ModeratorLayout from "./layouts/ModeratorLayout";
import ModeratorReports from "./pages/moderator/Reports";
import ModeratorAuditLog from "./pages/moderator/AuditLog";
import ModeratorBlockedUsers from "./pages/moderator/BlockedUsers";
import ModeratorUserSearch from "./pages/moderator/UserSearch";

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "verify-otp", Component: OTPVerification },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
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
      { path: "groups", Component: Groups },
      { path: "groups/:groupId", Component: GroupDetail },
      { path: "g/:handle", Component: GroupHandle },
      { path: "status", Component: Status },
      { path: "contacts", Component: Contacts },
      { path: "settings", Component: Settings },
      { path: "settings/device-keys", Component: DeviceKeys },
      { path: "settings/help", Component: Help },
      { path: "settings/storage", Component: StorageData },
      { path: "settings/invite", Component: InviteFriend },
      { path: "users/:id", Component: UserProfile },
    ],
  },
  { path: "/invite/user/:token", Component: InviteUser },
  { path: "/invite/:groupName/:token", Component: InviteGroup },
  { path: "/call/:token", Component: CallJoin },
  { path: "/call/room/:token", Component: CallRoom },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "users", Component: AdminUsers },
      { path: "reports", Component: AdminReports },
      { path: "analytics", Component: AdminAnalytics },
      { path: "moderators", Component: AdminModerators },
      { path: "verification-payments", Component: AdminVerificationPayments },
    ],
  },
  {
    path: "/moderator",
    Component: ModeratorLayout,
    children: [
      { path: "reports", Component: ModeratorReports },
      { path: "audit-log", Component: ModeratorAuditLog },
      { path: "blocks", Component: ModeratorBlockedUsers },
      { path: "search", Component: ModeratorUserSearch }
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
