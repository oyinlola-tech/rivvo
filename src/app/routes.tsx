import { createBrowserRouter } from "react-router";
import { lazy } from "react";

const MainLayout = lazy(() => import("./layouts/MainLayout").then((m) => ({ default: m.MainLayout })));
const AuthLayout = lazy(() => import("./layouts/AuthLayout").then((m) => ({ default: m.AuthLayout })));
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const OTPVerificationPage = lazy(() => import("./pages/auth/OTPVerificationPage").then((m) => ({ default: m.OTPVerificationPage })));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const ChatsPage = lazy(() => import("./pages/ChatsPage").then((m) => ({ default: m.ChatsPage })));
const StatusPage = lazy(() => import("./pages/StatusPage").then((m) => ({ default: m.StatusPage })));
const CallsPage = lazy(() => import("./pages/CallsPage").then((m) => ({ default: m.CallsPage })));
const ContactsPage = lazy(() => import("./pages/ContactsPage").then((m) => ({ default: m.ContactsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const VoiceCallPage = lazy(() => import("./pages/calls/VoiceCallPage").then((m) => ({ default: m.VoiceCallPage })));
const VideoCallPage = lazy(() => import("./pages/calls/VideoCallPage").then((m) => ({ default: m.VideoCallPage })));
const GroupSettingsPage = lazy(() => import("./pages/GroupSettingsPage").then((m) => ({ default: m.GroupSettingsPage })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminModerators = lazy(() => import("./pages/admin/AdminModerators").then((m) => ({ default: m.AdminModerators })));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics").then((m) => ({ default: m.AdminAnalytics })));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "verify-otp", Component: OTPVerificationPage },
      { path: "forgot", Component: ForgotPasswordPage },
      { path: "reset", Component: ResetPasswordPage },
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
], { basename: import.meta.env.BASE_URL });
