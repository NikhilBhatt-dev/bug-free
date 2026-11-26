# Development notes

## Phase 1 baseline

The frontend runs separately on port 3000 and the Express API on port 5000 by default. The API accepts browser requests only from `FRONTEND_URL`, which is `http://localhost:3000` locally.

`backend/.env.example` documents all credentials that will be needed for MongoDB, Google OAuth/Gmail, and Cloudinary. Do not place real values in any tracked file.

The health endpoint follows the project response envelope:

```json
{
  "success": true,
  "message": "JobPilot API is healthy",
  "data": { "status": "ok" },
  "error": null
}
```
