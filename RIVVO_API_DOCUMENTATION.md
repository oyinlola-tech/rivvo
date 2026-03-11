# RIVVO API Documentation

This document outlines all the API endpoints that the RIVVO frontend expects from your Node.js/Express backend.

## Base URL
Configure your API base URL in the environment variable:
```
REACT_APP_API_URL=http://localhost:3000/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST `/auth/login`
Login user with email and password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": false,
    "isModerator": false,
    "isAdmin": false
  }
}
```

### POST `/auth/signup`
Register a new user

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

### POST `/auth/verify-otp`
Verify email with OTP code

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": true,
    "isModerator": false,
    "isAdmin": false
  }
}
```

### POST `/auth/resend-otp`
Resend OTP to email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully"
}
```

---

## User Endpoints

### GET `/users/profile`
Get current user profile (requires auth)

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "verified": true,
  "isModerator": false,
  "isAdmin": false,
  "avatar": "url_to_avatar"
}
```

### PUT `/users/profile`
Update user profile (requires auth)

**Request Body:**
```json
{
  "name": "New Name",
  "avatar": "new_avatar_url"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully"
}
```

---

## Messages Endpoints

### GET `/messages/conversations`
Get all conversations for current user (requires auth)

**Response:**
```json
[
  {
    "id": "conversation_id",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "avatar": "avatar_url",
      "online": true,
      "verified": true,
      "isModerator": false
    },
    "lastMessage": {
      "text": "Hello!",
      "timestamp": "2026-03-11T10:00:00Z",
      "unreadCount": 3
    }
  }
]
```

### GET `/messages/conversations/:id`
Get messages from a specific conversation (requires auth)

**Response:**
```json
[
  {
    "id": "message_id",
    "text": "Hello!",
    "timestamp": "2026-03-11T10:00:00Z",
    "sender": "me" // or "them"
  }
]
```

### POST `/messages/conversations/:id`
Send a message in a conversation (requires auth)

**Request Body:**
```json
{
  "message": "Hello!"
}
```

**Response:**
```json
{
  "id": "message_id",
  "text": "Hello!",
  "timestamp": "2026-03-11T10:00:00Z",
  "sender": "me"
}
```

---

## Calls Endpoints

### GET `/calls/history`
Get call history for current user (requires auth)

**Response:**
```json
[
  {
    "id": "call_id",
    "user": {
      "name": "John Doe",
      "avatar": "avatar_url",
      "verified": true,
      "isModerator": false
    },
    "type": "video", // or "audio"
    "direction": "incoming", // or "outgoing", "missed"
    "timestamp": "2026-03-11T10:00:00Z",
    "duration": 120 // seconds (optional)
  }
]
```

### POST `/calls/initiate`
Initiate a call (requires auth)

**Request Body:**
```json
{
  "userId": "user_id",
  "type": "video" // or "audio"
}
```

**Response:**
```json
{
  "callId": "call_id",
  "roomUrl": "call_room_url"
}
```

---

## Contacts Endpoints

### GET `/contacts`
Get user's contacts (requires auth)

**Response:**
```json
[
  {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "avatar_url",
    "online": true,
    "verified": true,
    "isModerator": false
  }
]
```

### POST `/contacts`
Add a new contact (requires auth)

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "message": "Contact added successfully"
}
```

---

## Admin Endpoints (All require admin auth)

### GET `/admin/users`
Get all users with pagination

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "verified": true,
      "isModerator": false,
      "createdAt": "2026-03-11T10:00:00Z",
      "status": "active" // or "suspended"
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### DELETE `/admin/users/:userId`
Delete a user

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

### PUT `/admin/users/:userId/verification`
Update user verification status

**Request Body:**
```json
{
  "verified": true
}
```

**Response:**
```json
{
  "message": "Verification status updated"
}
```

### GET `/admin/reports`
Get all user reports

**Response:**
```json
[
  {
    "id": "report_id",
    "reportedUser": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "reportedBy": {
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "reason": "Spam",
    "description": "User is sending spam messages",
    "status": "pending", // or "resolved"
    "createdAt": "2026-03-11T10:00:00Z"
  }
]
```

### POST `/admin/reports/:reportId/resolve`
Resolve a report

**Response:**
```json
{
  "message": "Report resolved successfully"
}
```

### GET `/admin/analytics`
Get platform analytics

**Response:**
```json
{
  "totalUsers": 1000,
  "activeUsers": 750,
  "totalMessages": 50000,
  "totalCalls": 5000,
  "userGrowth": [
    {
      "date": "2026-03-01",
      "count": 50
    }
  ],
  "messageStats": [],
  "callStats": []
}
```

### GET `/admin/moderators`
Get all moderators

**Response:**
```json
[
  {
    "id": "mod_id",
    "name": "Mod Name",
    "email": "mod@example.com",
    "createdAt": "2026-03-11T10:00:00Z"
  }
]
```

### POST `/admin/moderators`
Create a new moderator

**Request Body:**
```json
{
  "email": "mod@example.com",
  "password": "password123",
  "name": "Mod Name"
}
```

**Response:**
```json
{
  "id": "mod_id",
  "name": "Mod Name",
  "email": "mod@example.com",
  "createdAt": "2026-03-11T10:00:00Z"
}
```

---

## Verification Badges

The frontend displays two types of verification badges:

1. **Blue Checkmark** (Paid): Set `verified: true` and `isModerator: false`
2. **Black Checkmark** (Moderator): Set `verified: true` and `isModerator: true`

To grant verification:
- Implement a payment system in your backend
- After successful payment, update user with `verified: true`
- For moderators, set both `verified: true` and `isModerator: true`

---

## Error Responses

All endpoints should return appropriate HTTP status codes and error messages:

```json
{
  "error": "Error message here",
  "message": "Detailed error description"
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## WebSocket/Real-time Features

For real-time messaging and call notifications, implement WebSocket connections:

### Events to emit from server:
- `new_message`: When a new message arrives
- `user_online`: When a user comes online
- `user_offline`: When a user goes offline
- `incoming_call`: When receiving a call
- `call_ended`: When a call ends

### Events to listen from client:
- `join_conversation`: Join a conversation room
- `leave_conversation`: Leave a conversation room
- `typing`: User is typing indicator

---

## Notes

1. All timestamps should be in ISO 8601 format
2. Implement rate limiting on auth endpoints
3. Use bcrypt or similar for password hashing
4. Implement proper email verification with OTP expiration (5-10 minutes)
5. Store tokens securely and implement token refresh mechanism
6. Implement proper CORS configuration for your frontend domain
7. Add pagination to list endpoints
8. Implement file upload for avatars and media messages
9. Use environment variables for sensitive configuration

---

## Getting Started

1. Set up your Node.js/Express backend with the above endpoints
2. Configure the API base URL in your `.env` file
3. Implement authentication with JWT
4. Set up a database (MongoDB, PostgreSQL, etc.)
5. Implement email service for OTP verification
6. Test all endpoints with the frontend

For any questions or issues, refer to the frontend code in `/src/app/lib/api.ts`
