import { createBrowserRouter } from "react-router";
import { MainLayout } from "./layouts/MainLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { OTPVerificationPage } from "./pages/auth/OTPVerificationPage";
import { ChatsPage } from "./pages/ChatsPage";
import { StatusPage } from "./pages/StatusPage";
import { CallsPage } from "./pages/CallsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { VoiceCallPage } from "./pages/calls/VoiceCallPage";
import { VideoCallPage } from "./pages/calls/VideoCallPage";
import { GroupSettingsPage } from "./pages/GroupSettingsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminModerators } from "./pages/admin/AdminModerators";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "verify-otp", Component: OTPVerificationPage },
    ],
  },
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: ChatsPage },
      { path: "chats", Component: ChatsPage },
      { path: "chats/:chatId", Component: ChatsPage },
      { path: "status", Component: StatusPage },
      { path: "calls", Component: CallsPage },
      { path: "contacts", Component: ContactsPage },
      { path: "settings", Component: SettingsPage },
      { path: "notifications", Component: NotificationsPage },
      { path: "profile", Component: ProfilePage },
      { path: "profile/:userId", Component: ProfilePage },
      { path: "group/:groupId/settings", Component: GroupSettingsPage },
    ],
  },
  {
    path: "/call",
    children: [
      { path: "voice/:callId", Component: VoiceCallPage },
      { path: "video/:callId", Component: VideoCallPage },
    ],
  },
  {
    path: "/admin",
    Component: AdminDashboard,
    children: [
      { index: true, Component: AdminUsers },
      { path: "users", Component: AdminUsers },
      { path: "moderators", Component: AdminModerators },
      { path: "analytics", Component: AdminAnalytics },
      { path: "settings", Component: AdminSettings },
    ],
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
