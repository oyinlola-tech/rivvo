# Rivvo

Rivvo is a full-stack messaging platform focused on secure, fast communication. It ships with a modern React/Vite frontend and a Node/Express backend, plus real-time WebSocket features and WebRTC calling.

## Why Rivvo
Rivvo brings together direct messaging, group chats, status updates, calls, and a full moderation + admin workflow in one project. It is designed to be a real-world example of a production-ready chat app with authentication, encryption metadata, rate limiting, audits, and a detailed database schema.

## Feature Map

### Authentication and Security
- Email + password registration and login.
- OTP verification, resend, and expiry handling.
- Password reset request and confirmation.
- JWT access tokens and refresh tokens.
- Device registration and device verification.
- User public keys and group key sharing for encrypted messaging metadata.

### Messaging and Presence
- One-to-one conversations and message previews.
- Typing indicators and read receipts.
- Message edits, deletes, and view-once support.
- Attachments with file signature validation.
- Pinning and muting conversations.
- Contact requests, favorites, and blocking.

### Calls and WebRTC
- Voice and video calls.
- Call links for sharing call entry.
- Presence-based signaling via Socket.IO.
- Direct calls and group call room support.

### Social and Status
- Status posts with media.
- Status views and mutes.
- User search and profile discovery.

### Groups and Communities
- Public and private groups.
- Group invites and join requests.
- Group roles: owner, admin, member.
- Group key rotation and member key distribution.
- Group avatars and banners with file checks.

### Moderation and Admin
- User reports and message reports.
- Moderator assignment and resolution.
- Admin analytics and moderation console.
- Verification pricing and verification badges.
- Audit logging for refresh token events and admin actions.

## Tech Stack
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, MUI, React Router.
- Backend: Node.js, Express, MySQL, Socket.IO, JWT auth, Nodemailer.
- Tooling: Vitest (frontend tests), Jest (backend tests), ESLint.

## Architecture Overview
- The frontend lives in `src/app` and communicates with the backend REST API under `/api`.
- The backend lives in `backend/src` and serves both the API and the static frontend build (`dist`) in production.
- Socket.IO is used for real-time presence, typing, and call signaling.
- MySQL is the primary database and is initialized automatically on server startup.

## Project Structure
- `src/app` React application (pages, layouts, contexts, API clients).
- `src/styles` Design tokens and theme styles.
- `public` Static assets and icons.
- `backend/src` Express app, Socket.IO server, DB setup.
- `backend/routes` API route groups.
- `backend/controllers` Request handlers and business logic.
- `backend/services` Email and background services.
- `uploads` Uploaded files (served at `/uploads`).
- `dist` Frontend build output (served by backend in production).

## Frontend Routes
Auth routes (under `/auth`):
- `/auth/login`
- `/auth/register`
- `/auth/verify-otp`
- `/auth/forgot`
- `/auth/reset`

Main app routes:
- `/` and `/chats`
- `/chats/:chatId`
- `/status`
- `/calls`
- `/contacts`
- `/settings`
- `/notifications`
- `/profile`
- `/profile/:userId`
- `/group/:groupId/settings`

Calls:
- `/call/voice/:callId`
- `/call/video/:callId`

Admin:
- `/admin`
- `/admin/users`
- `/admin/moderators`
- `/admin/analytics`
- `/admin/settings`

## API Overview
All API routes are mounted under `/api`.

Health:
- `GET /api/health`

Auth:
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Users:
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/storage`
- `GET /api/users/:userId/public`
- `POST /api/users/avatar`
- `PUT /api/users/keys`
- `GET /api/users/keys/:userId`
- `PUT /api/users/devices/register`
- `GET /api/users/devices`
- `POST /api/users/devices/:deviceId/verify`
- `GET /api/users/search`

Messages:
- `GET /api/messages/conversations`
- `GET /api/messages/conversations/:id`
- `GET /api/messages/conversations/:id/preview`
- `POST /api/messages/conversations/with/:userId`
- `POST /api/messages/conversations/:id`
- `PATCH /api/messages/conversations/:id/messages/:messageId`
- `DELETE /api/messages/conversations/:id/messages/:messageId`
- `POST /api/messages/conversations/:id/attachments`
- `POST /api/messages/conversations/:id/read`
- `POST /api/messages/conversations/:id/view-once/:messageId`
- `GET /api/messages/conversations/:id/peer`
- `POST /api/messages/conversations/:id/pin`
- `POST /api/messages/conversations/:id/mute`

Calls:
- `GET /api/calls/history`
- `GET /api/calls/:id`
- `POST /api/calls/initiate`
- `POST /api/calls/:id/answer`
- `POST /api/calls/:id/decline`
- `POST /api/calls/:id/end`
- `POST /api/calls/:id/status`

Contacts:
- `GET /api/contacts`
- `POST /api/contacts`
- `GET /api/contacts/requests`
- `GET /api/contacts/requests/unread-count`
- `POST /api/contacts/requests/mark-read`
- `POST /api/contacts/requests/:requestId/accept`
- `POST /api/contacts/requests/:requestId/reject`
- `POST /api/contacts/:userId/favorite`
- `POST /api/contacts/:userId/block`
- `POST /api/contacts/:userId/unblock`

Status:
- `GET /api/status`
- `GET /api/status/me`
- `POST /api/status`
- `DELETE /api/status/:statusId`
- `GET /api/status/:statusId/views`
- `POST /api/status/:statusId/view`
- `POST /api/status/mute`
- `DELETE /api/status/mute/:mutedUserId`

Notifications:
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `POST /api/notifications/:notificationId/read`
- `DELETE /api/notifications/:notificationId`
- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`
- `POST /api/notifications/devices`
- `DELETE /api/notifications/devices/:deviceId`

Groups:
- `GET /api/groups/public`
- `POST /api/groups`
- `GET /api/groups`
- `GET /api/groups/handle/:handle`
- `GET /api/groups/:groupId`
- `PATCH /api/groups/:groupId`
- `GET /api/groups/:groupId/keys`
- `GET /api/groups/:groupId/keys/members`
- `POST /api/groups/:groupId/keys/rotate`
- `GET /api/groups/:groupId/members`
- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:memberId`
- `POST /api/groups/:groupId/leave`
- `DELETE /api/groups/:groupId`
- `PATCH /api/groups/:groupId/handle`
- `POST /api/groups/:groupId/invites`
- `POST /api/groups/invites/:token/join`
- `POST /api/groups/:groupId/join`
- `GET /api/groups/:groupId/requests`
- `POST /api/groups/:groupId/requests/:requestId/approve`
- `POST /api/groups/:groupId/requests/:requestId/reject`
- `POST /api/groups/:groupId/admins`
- `DELETE /api/groups/:groupId/admins/:memberId`
- `POST /api/groups/:groupId/avatar`
- `POST /api/groups/:groupId/banner`

Reports:
- `POST /api/reports/users`
- `POST /api/reports/messages`

Blocks:
- `GET /api/blocks`
- `POST /api/blocks`
- `DELETE /api/blocks/:blockedUserId`

Moderation:
- `GET /api/moderation/reports`
- `GET /api/moderation/reports/unassigned`
- `GET /api/moderation/reports/:reportId/messages`
- `POST /api/moderation/reports/:reportId/resolve`
- `POST /api/moderation/reports/:reportId/assign`
- `GET /api/moderation/moderators`
- `PUT /api/moderation/users/:userId/status`
- `GET /api/moderation/audit-logs`
- `GET /api/moderation/blocks`
- `GET /api/moderation/users/search`

Admin:
- `GET /api/admin/users`
- `DELETE /api/admin/users/:userId`
- `PUT /api/admin/users/:userId/verification`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:reportId/resolve`
- `POST /api/admin/reports/:reportId/assign`
- `GET /api/admin/reports/:reportId/messages`
- `GET /api/admin/analytics`
- `GET /api/admin/moderators`
- `POST /api/admin/moderators`
- `PUT /api/admin/users/:userId/status`
- `GET /api/admin/verification/pricing`
- `PUT /api/admin/verification/pricing`
- `GET /api/admin/verification/payments`
- `POST /api/admin/verification/payments/:paymentId/review`
- `PUT /api/admin/users/:userId/verification-badge`
- `GET /api/admin/refresh-tokens/audit`

Invites and Call Links:
- `GET /api/invites/users/:token`
- `GET /api/invites/groups/:token`
- `POST /api/invites/users`
- `GET /api/call-links/:token`
- `POST /api/call-links`

Verification and Support:
- `GET /api/verification/pricing`
- `GET /api/verification/eligibility`
- `GET /api/verification/status`
- `POST /api/verification/checkout`
- `POST /api/verification/confirm`
- `POST /api/verification/webhook`
- `POST /api/support/contact`

## Real-Time Events
Socket.IO is initialized in `backend/src/server.js` and expects a JWT in the socket handshake. The key events used by the app are:
- `join_conversation`
- `leave_conversation`
- `typing`
- `call:join`
- `call:leave`
- `call:signal`
- `call:ringing`
- `call:accept`
- `call:decline`
- `call:cancel`

## Database Schema (Created on Startup)
The backend auto-creates the database and tables in `backend/src/dbInit.js`. Core tables include:
- `users`
- `otps`
- `conversations`
- `conversation_participants`
- `messages`
- `message_attachments`
- `contacts`
- `contact_favorites`
- `contact_requests`
- `calls`
- `reports`
- `report_messages`
- `blocks`
- `statuses`
- `status_views`
- `status_mutes`
- `user_keys`
- `user_invites`
- `groups`
- `group_key_shares`
- `group_members`
- `group_invites`
- `group_join_requests`
- `call_links`
- `device_keys`
- `refresh_tokens`
- `refresh_token_audit`
- `admin_audit_logs`
- `verification_settings`
- `verification_payments`
- `verification_payment_locks`

## File Uploads
- Uploads are stored in `uploads` (or `UPLOADS_DIR` if set).
- Media files are validated by signature before saving.
- The backend exposes uploads at `/uploads` for public access.

## Environment Variables
Frontend (copy `.env.example` to `.env`):
- `VITE_API_URL` Base URL of the backend API (no trailing slash).
- `VITE_WS_URL` Optional WebSocket URL for real-time features.
- `VITE_ICE_SERVERS` Optional WebRTC ICE servers (JSON array).

Backend (copy `backend/.env.example` to `backend/.env`):
- Server: `PORT`, `NODE_ENV`
- CORS: `CLIENT_URL`, `CLIENT_URLS`, `CORS_PUBLIC_URLS`, `CORS_ADMIN_URLS`
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `REFRESH_TOKEN_EXPIRES_DAYS`, `OTP_EXPIRES_MINUTES`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Calls: `CALL_ROOM_BASE_URL`, `CALL_JOIN_BASE_URL`
- Rate limits: `RATE_LIMIT_*`, `SOCKET_*`
- Admin bootstrap: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- Storage: `UPLOADS_DIR`, `ATTACHMENT_RETENTION_DAYS`

## Getting Started

### Prerequisites
- Node.js and npm.
- MySQL database.

### Installation
1. Install frontend dependencies: `npm install`
2. Install backend dependencies: `npm --prefix backend install`
3. Create env files: `.env` and `backend/.env`
4. Run both apps together: `npm run dev`

### Running Separately
- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`

### Production
1. Build the frontend: `npm run build`
2. Start the backend (serves `dist`): `npm --prefix backend start`

## Scripts
Frontend:
- `npm run dev`
- `npm run dev:frontend`
- `npm run build`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`
- `npm run typecheck`

Backend:
- `npm --prefix backend run dev`
- `npm --prefix backend start`
- `npm --prefix backend test`
- `npm --prefix backend test:coverage`
- `npm --prefix backend run lint`
- `npm --prefix backend run db:cleanup`

## Testing
- Frontend tests run with Vitest.
- Backend tests run with Jest.

## Linting and Typecheck
- Lint frontend: `npm run lint`
- Typecheck frontend: `npm run typecheck`
- Lint backend: `npm --prefix backend run lint`

## Author
Oluwayemi Oyinlola Michael  
Portfolio: `https://www.oyinlola.site`

## Contributing
See `CONTRIBUTING.md`.

## Security
See `SECURITY.md`.
