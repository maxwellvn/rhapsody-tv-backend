# Rhapsody TV WebSocket API Documentation

This document describes the WebSocket endpoints for real-time interactions on Rhapsody TV.

## Connection Details

- **Namespace**: `/livestream`
- **Base URL**: `ws://<your-api-domain>/livestream`
- **Authentication**: Requires a valid JWT token. You can provide it in three ways:
  1. **Handshake Auth** (Recommended): `{ auth: { token: 'YOUR_JWT_TOKEN' } }`
  2. **Query Parameter**: `?token=YOUR_JWT_TOKEN`
  3. **Authorization Header**: `Bearer YOUR_JWT_TOKEN`

---

## Livestream Interaction

### Client -> Server (Events to Emit)

#### `joinLivestream`

Join a specific livestream room to receive real-time updates (comments, viewer counts, likes).

- **Payload**:
  ```json
  {
    "livestreamId": "string"
  }
  ```

#### `leaveLivestream`

Leave a livestream room.

- **Payload**:
  ```json
  {
    "livestreamId": "string"
  }
  ```

#### `sendComment`

Send a new comment to the livestream chat.

- **Payload**:
  ```json
  {
    "livestreamId": "string",
    "content": "string",
    "parentCommentId": "string (optional)"
  }
  ```

#### `toggleLike`

Toggle (like/unlike) the livestream for the current user.

- **Payload**:
  ```json
  {
    "livestreamId": "string"
  }
  ```

#### `deleteComment` (Admin Only)

Delete a comment by its ID.

- **Payload**:
  ```json
  {
    "commentId": "string"
  }
  ```

#### `banUser` (Admin Only)

Ban a user from the livestream chat.

- **Payload**:
  ```json
  {
    "livestreamId": "string",
    "userId": "string"
  }
  ```

#### `unbanUser` (Admin Only)

Unban a user from the livestream chat.

- **Payload**:
  ```json
  {
    "livestreamId": "string",
    "userId": "string"
  }
  ```

---

### Server -> Client (Events to Listen For)

#### `newComment`

Emitted to all users in the room when a new comment is posted.

- **Payload**:
  ```json
  {
    "id": "string",
    "content": "string",
    "user": {
      "id": "string",
      "fullName": "string"
    },
    "parentCommentId": "string",
    "createdAt": "date-string"
  }
  ```

#### `commentHistory`

Emitted to a user immediately after joining a livestream.

- **Payload**:
  ```json
  {
    "comments": [
      /* Array of newComment objects */
    ]
  }
  ```

#### `commentDeleted`

Emitted when a comment is deleted by an admin.

- **Payload**:
  ```json
  {
    "commentId": "string"
  }
  ```

#### `viewerCount`

Emitted whenever the number of active viewers changes.

- **Payload**:
  ```json
  {
    "count": "number"
  }
  ```

#### `updateLikeCount`

Emitted when someone likes/unlikes the stream.

- **Payload**:
  ```json
  {
    "livestreamId": "string",
    "count": "number"
  }
  ```

#### `userLikeStatus`

Emitted to the specific user after joining or toggling a like to confirm their state.

- **Payload**:
  ```json
  {
    "livestreamId": "string",
    "hasLiked": "boolean"
  }
  ```

#### `userBanned` / `userUnbanned`

Emitted to the target user when their ban status changes.

- **Payload**:
  ```json
  {
    "livestreamId": "string"
  }
  ```

#### `error`

Emitted when an error occurs (e.g., unauthorized, livestream not found).

- **Payload**:
  ```json
  {
    "message": "string"
  }
  ```
