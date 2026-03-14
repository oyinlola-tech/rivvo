# Rivvo - Cross-Platform Secure Messaging

Rivvo is a cross-platform messaging application that uses an internet connection (Wi-Fi or data) to send messages, make voice/video calls, and share media securely. It includes end-to-end encryption (E2E) for message content, per-device key support, view-once messaging, 24-hour status updates, profile picture uploads, and encrypted local caching for fast offline access.

## Ownership
- Owner: Oluwayemi Oyinlola Michael
- Portfolio: oyinlola.site
- Tech Firm: telente.site

## Product Goals
- Privacy by default through E2E encryption.
- Fast, reliable delivery with real-time updates.
- Secure multi-device experience.
- Simple UX for calls, status, and media sharing.

## Core Features
- Encrypted messages with read receipts and typing indicators.
- Audio/video call initiation and history.
- 24-hour status updates (text, image, video) with story-style viewer.
- Profile picture upload and management.
- Encrypted local cache (IndexedDB) for offline access.
- Per-device key verification with QR support.
- Verification badge system with admin review.

## Verification Badges
- Paid monthly.
- Only available after 3 months on the platform.
- Requires both username and phone number.
- Admin reviews all payments and can approve or reject with a reason.
- Renewals are allowed within 7 days of expiry.
- Normal users get a blue badge; moderators/admins get a black badge.

## Authentication and Identity
- Users can log in with email, phone number, or username.
- Phone number is optional at signup.
- Username is optional and can be created after signup in Settings.
- Username can be changed once every 15 days.

## Status (Stories)
- 24-hour lifecycle for posts.
- Text, image, and video supported.
- Story viewer with tap/click navigation and keyboard controls.
- Mute/unmute controls for quick management.

## Architecture Overview
- Frontend: React + Vite + TypeScript + Tailwind.
- Backend: Express + MySQL + Socket.IO.
- Crypto: Web Crypto API (ECDH + AES-GCM).
- Media: Stored under backend /uploads and served statically.

## Data Model Summary
- Users, conversations, messages, calls, contacts.
- Status updates with 24-hour expiry.
- Device keys and verification state.
- Verification payments + admin audit logs.

## Environment Variables
### Frontend
```
VITE_API_URL=http://localhost:3000/api
```

### Backend
See `backend/.env.example` for the full list. Common keys:
```
PORT=3000
CLIENT_URLS=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rivvo
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=30
CALL_ROOM_BASE_URL=http://localhost:5173/call/
ADMIN_EMAIL=admin@rivvo.com
ADMIN_PASSWORD=change_this_admin_password
ADMIN_NAME=Rivvo Admin
```

Flutterwave (verification payments):
```
FLW_BASE_URL=https://api.flutterwave.com
FLW_PUBLIC_KEY=
FLW_SECRET_KEY=
FLW_WEBHOOK_SECRET=
FLW_REDIRECT_URL=http://localhost:5173/verification/complete
```

## Local Development
### Install
```
npm install
cd backend
npm install
```

### Run (Frontend + Backend)
```
npm run dev
```
- This starts both servers.
- The backend will create the database automatically if it does not exist.
- A main admin account will be created if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.

## Testing
### Frontend
```
npm test
npm run test:coverage
```

### Backend
```
cd backend
npm test
npm run test:coverage
```

## Lint and Build
```
npm run lint
npm run typecheck
npm run build
```

## Security Model (Short)
1. Client generates key pair per device.
2. Peer public key used to derive shared secret.
3. Messages encrypted before sending.
4. Server stores encrypted payloads only.
5. Client decrypts locally.

## Usage and Licensing
This code is proprietary and not free to use. See `LICENSE`.

## Contribution Policy
Contributions require explicit written permission. See `CONTRIBUTING.md`.

## Code of Conduct
See `CODE_OF_CONDUCT.md`.

## Security Disclosure
See `SECURITY.md`.

## Operational Notes
- Database migrations should be reviewed before deployment.
- Always rotate secrets on environment changes.
- Monitor rate-limit errors for abuse detection.
