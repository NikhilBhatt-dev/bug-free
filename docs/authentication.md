# Authentication and database setup

## MongoDB Atlas

1. Create an Atlas project and a production cluster.
2. Create a least-privilege database user with access only to the JobPilot database.
3. Restrict Atlas Network Access to the deployed backend's outbound addresses where practical.
4. Configure the production `MONGODB_URI` through the hosting provider's secret manager. Do not commit credentials.

Use an encrypted/TLS MongoDB connection. The API creates declared schema indexes, including the unique `{ userId, category }` CV constraint.

## Google login OAuth

1. Configure the Google OAuth consent screen.
2. Create a Web application OAuth client.
3. Register the production callback URL ending in `/api/auth/google/callback`.
4. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in the backend environment.

The login flow requests only `openid`, `profile`, and `email`. It does not request Gmail scopes or retain login access or refresh tokens.

## Gmail OAuth and sending

Gmail uses a separate OAuth client and flow from Google login. Register the exact production callback URL ending in `/api/gmail/callback`, then configure `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI`.

Set `GMAIL_TOKEN_ENCRYPTION_KEY` to Base64-encoded random key material decoding to exactly 32 bytes. Keep it separate from `JWT_SECRET`. Refresh tokens are stored encrypted; credentials are not returned by the API.

The consent flow requests only `https://www.googleapis.com/auth/gmail.send` and offline access. Gmail connection status is under `/api/gmail/status`; connection starts at `/api/gmail/connect`; disconnect uses `POST /api/gmail/disconnect`. The OAuth callback redirects to the frontend `/gmail` page. Confirmed email previews and batch sending are implemented; the backend worker performs sends.

## Cookies and CSRF

Authentication uses an HttpOnly cookie; frontend code must not store JWTs in browser storage. For the separate Vercel and Render origins, configure `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`. Production validation rejects insecure cookie settings. The API accepts mutation requests only from configured frontend origins; originless browser mutations are rejected in production. Provider OAuth callbacks remain separate from this mutation-origin check and validate OAuth state.

For local development, use the local HTTP origins in the example environment and `COOKIE_SAME_SITE=lax`. Do not use development cookie settings in production.

## Production environment variables

See [production deployment and security](./production.md) for all required names, formats, and Render/Vercel setup. Never put actual values in tracked files or frontend `NEXT_PUBLIC_` variables, except the public API base URL.
