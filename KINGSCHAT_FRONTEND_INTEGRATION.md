# KingsChat Login Integration (Frontend)

This document explains how to integrate KingsChat login with the Rhapsody backend.

## Backend Endpoint

- **Method:** `POST`
- **URL:** `/auth/kingschat`
- **Auth:** Public (no bearer token required)
- **Content-Type:** `application/json`

### Request Body

```json
{
  "accessToken": "<kingschat-access-token>",
  "refreshToken": "<optional-kingschat-refresh-token>"
}
```

- `accessToken` is required.
- `refreshToken` is optional and currently ignored by backend (safe to send for future compatibility).

## Expected Frontend Flow

1. Start KingsChat OAuth/login flow from your UI.
2. Receive KingsChat token(s) in your callback screen/page.
3. Extract `accessToken` from callback payload.
4. Call `POST /auth/kingschat` with the token.
5. Save backend tokens from response (`accessToken`, `refreshToken`) and authenticated `user` object.
6. Navigate user into app.

## Example Client Code

```ts
async function loginWithKingsChat() {
  // 1) Get KingsChat tokens from your KingsChat SDK/service/callback page
  const kingsChatTokens = await kingsChatService.login();

  // 2) Exchange KingsChat access token for platform JWTs
  const response = await api.post('/auth/kingschat', {
    accessToken: kingsChatTokens.accessToken,
    refreshToken: kingsChatTokens.refreshToken,
  });

  // 3) Persist backend auth session
  const payload = response.data.data;
  authStore.setSession({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
  });

  return payload;
}
```

## Success Response Shape

```json
{
  "success": true,
  "message": "KingsChat login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "example@domain.com",
      "fullName": "John Doe",
      "roles": ["user"],
      "isEmailVerified": true
    },
    "accessToken": "<backend-jwt-access-token>",
    "refreshToken": "<backend-jwt-refresh-token>"
  }
}
```

## Error Handling

### `401 Unauthorized`
Possible causes:
- KingsChat token is invalid/expired.
- KingsChat profile endpoint rejected the token.
- KingsChat profile did not return a valid user identifier.

Suggested UI message:
- `KingsChat login failed. Please try again.`

### Generic/network errors
Suggested UI message:
- `Unable to complete login right now. Please check your connection and retry.`

## Important Notes

- Use backend-issued JWTs for all app API calls after login.
- Do **not** use KingsChat access token directly for your app's protected endpoints.
- Keep your existing `/auth/refresh` flow unchanged for backend JWT refresh.
- If KingsChat callback can be cancelled, handle cancellation separately and avoid showing a hard error toast.

## Callback Page Checklist

- Read token from callback payload/location used by your KingsChat flow.
- Validate token exists before calling backend.
- Prevent duplicate submissions while request is in flight.
- Redirect to login page with friendly message if callback has no token.

## Minimal UI Logic (Pseudo)

```ts
if (!kingsChatAccessToken) {
  showError('No authentication data received');
  navigate('/login');
  return;
}

try {
  await authService.loginWithKingsChat();
  navigate('/dashboard');
} catch {
  showError('KingsChat login failed. Please try again.');
}
```

## Optional: Suggested Environment Variables (Backend)

These are already supported by backend and may help if KingsChat changes values:

- `KINGSCHAT_PROFILE_URL` (default: `https://connect.kingsch.at/api/profile`)
- `KINGSCHAT_CLIENT_ID` (default: `com.kingschat`)
- `KINGSCHAT_CLIENT_VERSION` (default: `web-2.0`)
- `KINGSCHAT_DEVICE_ID` (default: `web`)
- `KINGSCHAT_PLATFORM` (default: `web`)
- `KINGSCHAT_REQUEST_TIMEOUT_MS` (default: `10000`)
