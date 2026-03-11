# Rivvo — Cross‑Platform Secure Messaging

Rivvo is a cross‑platform messaging application that uses an internet connection (Wi‑Fi or data) to send messages, make voice/video calls, and share media securely. It includes end‑to‑end encryption (E2E) for messages, per‑device key support, view‑once messages, user statuses that expire after 24 hours, and media uploads such as profile pictures.

This repository contains both the frontend and backend implementation.

## Owner & Contact

- **Owner:** Oluwayemi Oyinlola Michael  
- **Portfolio:** `oyinlola.site`  
- **Tech Firm:** `telente.site`

## Key Features

- **End‑to‑End Encryption:** ECDH + AES‑GCM for message payloads.
- **Per‑Device Keys:** Device key registration and verification support.
- **View‑Once Messages:** One‑time view flow similar to WhatsApp.
- **24‑Hour Status:** Status updates auto‑expire.
- **Profile Pictures:** Avatar uploads with secure storage.
- **Real‑time Messaging:** Socket.IO events for live updates.
- **Unread Counts:** Accurate, server‑side tracking and sync.
- **Local Encrypted Cache:** IndexedDB cache with encryption at rest.

## Repository Structure

```
/
  backend/                 # Express + MySQL backend
  src/                     # Frontend (React + Vite)
  RIVVO_API_DOCUMENTATION.md
```

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind
- **Backend:** Node.js, Express, MySQL (AMPPs), Socket.IO
- **Crypto:** Web Crypto API (ECDH, AES‑GCM)
- **Uploads:** Multer (avatars, status media)

## Environment Variables

### Frontend

Set your frontend API base URL:

```
REACT_APP_API_URL=http://localhost:3000/api
```

### Backend

See `backend/.env.example` for full configuration. Common keys:

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

## Local Development

### 1) Install dependencies

```
npm install
```

```
cd backend
npm install
```

### 2) Run backend

```
cd backend
npm run dev
```

### 3) Run frontend

```
npm run dev
```

## Data & Storage

- **MySQL** stores users, conversations, messages, calls, reports, and device keys.
- **Media** is stored in `backend/uploads` and served at `/uploads`.
- **Local Cache** uses IndexedDB, encrypted at rest using AES‑GCM.

## Security Model (High Level)

- **E2E encryption** is performed on the client before sending.
- **Server stores encrypted payloads**; it cannot read message contents.
- **Device verification** uses QR payloads and fingerprint hashes.
- **Local cache encryption** protects data at rest on device.

## License & Usage

This project is **proprietary** and **not free to use**.  
See `LICENSE` for full terms.

## Contributing

Please read `CONTRIBUTING.md`. All contributions require explicit permission from the owner.

## Code of Conduct

See `CODE_OF_CONDUCT.md` for standards and enforcement.

## Security

See `SECURITY.md` for vulnerability reporting and disclosure policy.

