# Rivvo - WhatsApp-like Chat Application

A comprehensive chat application built with React, TypeScript, and Tailwind CSS, featuring all the core functionality of WhatsApp.

## Features

### Authentication
- Email and password login
- User registration with email verification
- OTP verification system
- Secure token-based authentication

### Chat Features
- One-on-one messaging
- Group chats with admin controls
- Message status indicators (sent, delivered, read)
- Chat pinning and muting
- Chat search functionality
- Chat streak system with fire emoji indicator

### Status/Stories
- Create and view image, video, and text statuses
- 24-hour expiration
- View count tracking
- Status viewer with progress indicators

### Voice & Video Calls
- Voice call interface with mute and speaker controls
- Video call interface with camera and fullscreen controls
- Call history tracking
- Incoming and outgoing call indicators

### User Management
- User profiles with avatars and bios
- Verification badges (Blue for verified users, Black for admins/mods)
- Contact management with favorites
- Block/unblock functionality

### Admin Dashboard
- User management (view, verify, delete users)
- Moderator creation and management
- Analytics dashboard with charts
- Platform settings configuration
- Real-time statistics

### Theme System
- Light mode: White and blue color scheme
- Dark mode: Black and blue color scheme
- Seamless theme switching

### Responsive Design
- Desktop layout with sidebar navigation
- Tablet-optimized interface
- Mobile layout with bottom navigation
- Adaptive components for all screen sizes

## Project Structure

```
src/
├── app/
│   ├── api/               # API service layer
│   │   ├── config.ts      # API configuration
│   │   ├── auth.ts        # Authentication APIs
│   │   ├── chat.ts        # Chat APIs
│   │   ├── status.ts      # Status APIs
│   │   ├── calls.ts       # Call APIs
│   │   ├── contacts.ts    # Contact APIs
│   │   └── admin.ts       # Admin APIs
│   ├── components/        # Reusable components
│   │   ├── chat/          # Chat-specific components
│   │   ├── ui/            # UI components (shadcn/ui)
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── VerificationBadge.tsx
│   │   └── ChatStreak.tsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── ThemeContext.tsx
│   ├── layouts/           # Layout components
│   │   ├── AuthLayout.tsx
│   │   └── MainLayout.tsx
│   ├── pages/             # Page components
│   │   ├── auth/          # Authentication pages
│   │   ├── calls/         # Call pages
│   │   ├── admin/         # Admin dashboard pages
│   │   ├── ChatsPage.tsx
│   │   ├── StatusPage.tsx
│   │   ├── CallsPage.tsx
│   │   ├── ContactsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── GroupSettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── routes.tsx         # Route configuration
│   └── App.tsx            # Root component
└── styles/
    └── theme.css          # Theme configuration

## Backend Integration

All API calls are ready to connect to your Node.js backend. Update the API base URL in:
- `src/app/api/config.ts`

Set the following environment variables:
- `REACT_APP_API_URL` - Your backend API URL
- `REACT_APP_WS_URL` - Your WebSocket server URL

## API Endpoints Expected

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- POST `/api/auth/verify-otp` - OTP verification
- POST `/api/auth/resend-otp` - Resend OTP
- GET `/api/auth/me` - Get current user
- PATCH `/api/auth/profile` - Update profile
- POST `/api/auth/logout` - Logout
- POST `/api/auth/change-password` - Change password

### Chats
- GET `/api/chats` - Get all chats
- GET `/api/chats/:id` - Get chat details
- GET `/api/chats/:id/messages` - Get messages
- POST `/api/chats/:id/messages` - Send message
- DELETE `/api/messages/:id` - Delete message
- POST `/api/chats/:id/read` - Mark as read
- POST `/api/chats/private` - Create private chat
- POST `/api/chats/group` - Create group
- PATCH `/api/chats/:id` - Update chat
- POST `/api/chats/:id/members` - Add members
- DELETE `/api/chats/:id/members/:userId` - Remove member
- POST `/api/chats/:id/leave` - Leave group
- POST `/api/chats/:id/pin` - Pin/unpin chat
- POST `/api/chats/:id/mute` - Mute/unmute chat

### Status
- GET `/api/status` - Get all statuses
- GET `/api/status/me` - Get my statuses
- POST `/api/status` - Create status
- DELETE `/api/status/:id` - Delete status
- POST `/api/status/:id/view` - View status
- GET `/api/status/:id/views` - Get status views

### Calls
- GET `/api/calls` - Get call history
- POST `/api/calls/initiate` - Initiate call
- POST `/api/calls/:id/answer` - Answer call
- POST `/api/calls/:id/decline` - Decline call
- POST `/api/calls/:id/end` - End call
- GET `/api/calls/:id` - Get call details

### Contacts
- GET `/api/contacts` - Get contacts
- POST `/api/contacts` - Add contact
- DELETE `/api/contacts/:id` - Remove contact
- POST `/api/contacts/:id/favorite` - Toggle favorite
- POST `/api/contacts/:id/block` - Block contact
- POST `/api/contacts/:id/unblock` - Unblock contact
- GET `/api/users/search` - Search users

### Admin
- GET `/api/admin/stats` - Get platform statistics
- GET `/api/admin/users` - Get all users
- GET `/api/admin/users/:id` - Get user details
- PATCH `/api/admin/users/:id` - Update user
- DELETE `/api/admin/users/:id` - Delete user
- POST `/api/admin/users/:id/verify` - Verify user
- GET `/api/admin/moderators` - Get moderators
- POST `/api/admin/moderators` - Create moderator
- DELETE `/api/admin/moderators/:id` - Remove moderator
- POST `/api/admin/users/:id/promote` - Promote to moderator
- POST `/api/admin/users/:id/demote` - Demote from moderator
- POST `/api/admin/users/:id/ban` - Ban user
- POST `/api/admin/users/:id/unban` - Unban user

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables (create `.env` file):
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   REACT_APP_WS_URL=ws://localhost:3000
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

4. Build for production:
   ```bash
   pnpm build
   ```

## Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **React Router 7** - Routing
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts and analytics
- **date-fns** - Date formatting
- **Sonner** - Toast notifications
- **Radix UI** - Accessible components

## User Roles

1. **User** - Regular users with blue verification badge (optional)
2. **Moderator** - Can manage users and content, black verification badge
3. **Admin** - Full access to admin panel, black verification badge

## Notes

- The logo supports both light and dark mode automatically
- All responsive breakpoints are handled by Tailwind's default breakpoints (sm, md, lg, xl)
- WebSocket integration for real-time messaging should be added to the backend
- File uploads (images, videos, documents) need to be implemented in the backend
- Push notifications can be added using service workers

## License

Proprietary - All rights reserved
```
