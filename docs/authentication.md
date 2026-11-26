# Authentication and database setup

## MongoDB Atlas

1. Create an Atlas project and an M0 or production cluster.
2. Create a least-privilege database user with access only to the `jobpilot` database.
3. Add the backend host's IP address to Atlas Network Access. For local development, add your current development IP.
4. Copy the Atlas Node.js connection string to `backend/.env` as `MONGODB_URI`, replacing placeholders with URL-encoded credentials.

The API will not start until it can connect to MongoDB. The connection creates the declared schema indexes, including the unique `{ userId, category }` CV constraint.

## Google login OAuth

1. In Google Cloud Console, configure the OAuth consent screen as **External** or **Internal** for your organization.
2. Create a **Web application** OAuth 2.0 client.
3. Add `http://localhost:5000/api/auth/google/callback` to Authorized redirect URIs for local development.
4. Add the deployed backend callback URL for production.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in `backend/.env`.

The login route requests only `openid`, `profile`, and `email`. It does not request Gmail scopes and does not retain Google's login access or refresh tokens.

## Gmail connection OAuth

Gmail authorization uses a separate OAuth flow from Google login. Configure the Gmail OAuth client with this local Authorized redirect URI:

`http://localhost:5000/api/gmail/callback`

Add the deployed backend callback URL for production. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI` in `backend/.env`. Generate a separate 32-byte `GMAIL_TOKEN_ENCRYPTION_KEY` and encode it as base64; it is used to encrypt the Gmail refresh token before storage. Keep all values private and do not reuse the JWT secret as the encryption key.

The Gmail consent flow requests only `https://www.googleapis.com/auth/gmail.send`, with offline access for a refresh token. Authenticated endpoints are `/api/gmail/connect`, `/api/gmail/status`, and `POST /api/gmail/disconnect`. The OAuth callback validates its user-bound state cookie and redirects to the configured frontend settings page. Gmail message sending is not yet implemented.

## Cookie and frontend deployment settings

Set `FRONTEND_URL` to the exact frontend origin. For localhost use `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`. For distinct HTTPS production sites (for example Vercel and Render), use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` so the HttpOnly session cookie can accompany CORS-approved API calls.

Generate a high-entropy `JWT_SECRET` with a password manager or a cryptographically secure command. Never reuse the example value or expose it to the frontend. `AUTH_COOKIE_MAX_AGE_MS` should not exceed the intended JWT lifetime.
