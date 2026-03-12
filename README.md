# Rivvo — Cross‑Platform Secure Messaging

Rivvo is a cross‑platform messaging application that uses an internet connection (Wi‑Fi or data) to send messages, make voice/video calls, and share media securely. It includes end‑to‑end encryption (E2E) for message content, per‑device key support, view‑once messaging, 24‑hour status updates, profile picture uploads, and encrypted local caching for fast offline access.

## Ownership
- Owner: Oluwayemi Oyinlola Michael
- Portfolio: oyinlola.site
- Tech Firm: telente.site

## Product Goals
- Privacy by default through E2E encryption.
- Fast, reliable delivery with real‑time updates.
- Secure multi‑device experience.
- Simple UX for calls, status, and media sharing.

## Core Features
- Encrypted messages with read receipts and typing indicators.
- Audio/video call initiation and history.
- 24‑hour status updates (text, image, video).
- Profile picture upload and management.
- Encrypted local cache (IndexedDB) for offline access.
- Per‑device key verification with QR support.

## Architecture Overview
- **Frontend:** React + Vite + TypeScript + Tailwind.
- **Backend:** Express + MySQL + Socket.IO.
- **Crypto:** Web Crypto API (ECDH + AES‑GCM).
- **Media:** Stored under backend `/uploads` and served statically.

## Data Model Summary
- Users, conversations, messages, calls, contacts
- Status updates with 24‑hour expiry
- Device keys and verification state

## Environment Variables
### Frontend
```
VITE_API_URL=http://localhost:3000/api
```

### Backend
See `backend/.env.example` for full list. Common keys:
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
```

## Signup Requirements
- Email is used for OTP verification.
- Phone number is required and must be unique per user.

## User Discovery
- Users can be found by exact email or phone number.
- Phone numbers are normalized server-side (digits with optional leading `+`).

## Local Development
### Install
```
npm install
cd backend
npm install
```

### Run Backend
```
cd backend
npm run dev
```

### Run Frontend
```
npm run dev
```

## Security Model (Short)
1. Client generates key pair per device.
2. Peer public key used to derive shared secret.
3. Messages encrypted before sending.
4. Server stores encrypted payloads only.
5. Client decrypts locally.

## Usage & Licensing
This code is proprietary and not free to use. See `LICENSE`.

## Contribution Policy
Contributions require explicit written permission. See `CONTRIBUTING.md`.

## Code of Conduct
See `CODE_OF_CONDUCT.md`.

## Security Disclosure
See `SECURITY.md`.

## Feature Details
### Messaging
- End‑to‑end encryption for message content.
- Read receipts and typing indicators via Socket.IO.
- View‑once messages that disappear after viewing.

### Calls
- Audio/video initiation endpoints.
- Real‑time notifications to recipients.

### Status
- 24‑hour lifecycle for posts.
- Text, image, and video supported.

### Media
- Profile picture uploads to `/uploads`.
- Media validation by MIME type and size limits.

## Operational Notes
- Database migrations should be reviewed before deployment.
- Always rotate secrets on environment changes.
- Monitor rate‑limit errors for abuse detection.

## Roadmap (High Level)
- Multi‑device key transparency.
- Expanded analytics and audit trail.
- Optional encrypted media attachments.
