# Production deployment and security

This checklist is for deploying the existing backend to Render and frontend to Vercel. Configure all secret values in provider-managed environment settings; this document intentionally contains names and formats only.

## Backend environment

The backend requires these variables in production:

- `NODE_ENV` — must be `production`.
- `MONGODB_URI` — encrypted MongoDB connection URI; use a least-privilege database user and network allowlist.
- `JWT_SECRET` — high-entropy secret, at least 32 characters with at least 16 distinct characters; generate securely and keep private.
- `FRONTEND_URL` — comma-separated trusted HTTPS frontend origins, without paths or trailing slashes. The first origin is used for OAuth redirects.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — Google login OAuth client; callback must be HTTPS and end in `/api/auth/google/callback`.
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` — Gmail OAuth client; redirect must be HTTPS and end in `/api/gmail/callback`.
- `GMAIL_TOKEN_ENCRYPTION_KEY` — Base64 representation of exactly 32 random bytes; do not reuse `JWT_SECRET`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — required because CV upload routes are enabled.
- `COOKIE_SECURE` — must be `true`.
- `COOKIE_SAME_SITE` — must be `none` for the separate Vercel/Render origins; the cookie remains `Secure` and `HttpOnly`.

Optional backend settings:

- `PORT` — supplied by Render; the server also has a development default.
- `MONGODB_MAX_POOL_SIZE` — connection-pool sizing.
- `JWT_EXPIRES_IN` — access-token lifetime.
- `AUTH_COOKIE_MAX_AGE_MS` — cookie lifetime; keep it no longer than the access-token lifetime.

The backend refuses production startup for missing required variables, placeholder/weak JWT values, non-HTTPS frontend or OAuth URLs, malformed Gmail encryption keys, missing Cloudinary settings, or insecure cookie settings. Validation errors identify variable names only.

## Render backend

1. Create a Web Service from the repository and set its root directory to `backend`.
2. Use `npm ci` as the install command and `npm start` as the start command.
3. Set `NODE_ENV` and every required backend variable above in Render's environment settings. Do not add a `.env` file to the repository.
4. Use the Render HTTPS service origin in Google Cloud's authorized redirect URIs and as the API origin.
5. Configure `FRONTEND_URL` with the exact deployed Vercel origin. Do not include a path or trailing slash.
6. Keep one backend instance while the in-process email worker owns batch recovery. Do not scale multiple worker-bearing API instances until cross-instance recovery/coordination is implemented and tested.

## Vercel frontend

1. Set the project root directory to `frontend`.
2. Set `NEXT_PUBLIC_API_URL` to the Render API's HTTPS origin followed by `/api`. This URL is public configuration, not a credential.
3. Do not set `JWT_SECRET`, OAuth client secrets, Cloudinary credentials, MongoDB credentials, or the Gmail encryption key in Vercel's `NEXT_PUBLIC_*` variables.
4. Redeploy after setting environment variables and confirm browser requests include cookies.

## Production security checklist

- [ ] Rotate any credentials that appeared in Git history; verify the new credentials with their providers. Rewriting history does not replace rotation.
- [ ] If old commits were pushed, coordinate history cleanup after rotation and account for forks, caches, and existing clones.
- [ ] Set every backend secret through Render's secret environment configuration; never print or commit values.
- [ ] Verify `NODE_ENV=production`, HTTPS frontend/API origins, and exact Google login and Gmail callback registrations.
- [ ] Verify `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, and HttpOnly cookie behavior in a real browser.
- [ ] Confirm CORS allows only the intended frontend origin(s); test trusted and untrusted origins.
- [ ] Confirm MongoDB TLS, least privilege, backups, and network restrictions.
- [ ] Confirm Cloudinary credentials are configured and CV uploads/downloads remain private and user-scoped.
- [ ] Review provider logs and access logs for unexpected use; alert on repeated authentication, upload, and API rate-limit failures.
- [ ] Keep dependency updates, backups, incident response, and secret rotation procedures in place.
- [ ] Test Google login, Gmail connect/disconnect, CV upload/access, and a controlled email batch before inviting users.

Passing automated tests does not establish production readiness. Provider configuration, domain/TLS setup, credential rotation, and browser workflows must be verified in the deployed environment.
