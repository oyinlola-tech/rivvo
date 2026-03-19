const prefetchTasks: Array<() => Promise<unknown>> = [
  () => import('./layouts/MainLayout'),
  () => import('./layouts/AuthLayout'),
  () => import('./pages/ChatsPage'),
  () => import('./pages/StatusPage'),
  () => import('./pages/CallsPage'),
  () => import('./pages/ContactsPage'),
  () => import('./pages/SettingsPage'),
  () => import('./pages/NotificationsPage'),
  () => import('./pages/ProfilePage'),
  () => import('./pages/GroupSettingsPage'),
  () => import('./pages/calls/VoiceCallPage'),
  () => import('./pages/calls/VideoCallPage'),
  () => import('./pages/admin/AdminDashboard'),
  () => import('./pages/admin/AdminUsers'),
  () => import('./pages/admin/AdminModerators'),
  () => import('./pages/admin/AdminAnalytics'),
  () => import('./pages/admin/AdminSettings'),
  () => import('./pages/auth/LoginPage'),
  () => import('./pages/auth/RegisterPage'),
  () => import('./pages/auth/OTPVerificationPage'),
  () => import('./pages/auth/ForgotPasswordPage'),
  () => import('./pages/auth/ResetPasswordPage'),
  () => import('./pages/NotFoundPage'),
];

export const prefetchAppChunks = () => {
  prefetchTasks.forEach((task) => {
    task().catch(() => {});
  });
};
