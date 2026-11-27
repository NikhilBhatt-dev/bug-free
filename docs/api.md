# JobPilot API

All private endpoints require the HttpOnly `jobpilot_auth` cookie or a bearer token. Responses use:

```json
{"success":true,"message":"...","data":{},"error":null}
```

## Email preview and confirmation

- `POST /api/email-preview/preview` — generate a preview for an application. Supply `applicationId`, optional `templateId`, optional `recipient`, and optional `hrName`.
- `POST /api/email-preview/confirm` — confirm an exact preview snapshot and confirmation token.

The preview selects only the CV in the application's category. Missing or wrong-category CVs return `MATCHING_CV_REQUIRED`. Confirmation tokens bind immutable subject, body, recipient, and CV selection.

## Email batches and jobs

- `GET /api/email-batches`
- `POST /api/email-batches`
- `GET /api/email-batches/:batchId`
- `POST /api/email-batches/:batchId/cancel`
- `GET /api/email-batches/:batchId/jobs/:jobKey`

Batches accept between 1 and 10 confirmed items and an `idempotencyKey`. Duplicate application IDs or recipients are rejected. The daily limit is 20 successful emails per user.

Job states include `pending`, `processing`, `sent`, `failed`, `cancelled`, `uncertain`, `paused`, and `completed`. Pending jobs are processed sequentially with the configured delay.

On restart, interrupted `processing` jobs are marked `uncertain` and are never blindly retried. Gmail quota responses pause processing and expose the pause reason through user settings.

## Sending settings

- `GET /api/user-settings/sending`
- `PUT /api/user-settings/sending`

Accepted settings:

- `emailDelayMs`: 1000–300000 milliseconds.
- `dailySendingLimit`: 1–20 emails per day.
- `timezone`: 1–100 characters.
- `resumeSending`: boolean. Setting this to true clears a persisted pause and resumes paused batches.

## Sent email history

- `GET /api/sent-emails`
- `GET /api/sent-emails/:sentEmailId`

History supports `page`, `limit`, `category`, `applicationId`, `search`, `sortBy`, and `sortOrder`. Sent records contain immutable subject, body, recipient, CV metadata, sent time, and Gmail message/thread IDs.
