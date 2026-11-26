# JobPilot

JobPilot is a personal job-application workspace. It will provide application tracking, category-specific CVs, reviewable email templates, and carefully rate-limited Gmail sending.

## Repository layout

- `frontend/` — Next.js App Router client (JavaScript, Tailwind CSS, shadcn/ui conventions)
- `backend/` — Express REST API (JavaScript, MVC and services structure)
- `docs/` — API, setup, and deployment documentation
- `postman/` — Postman collection (added in the testing/documentation phase)

## Local setup

1. Copy `frontend/.env.example` to `frontend/.env.local`.
2. Copy `backend/.env.example` to `backend/.env` and set the required values.
3. In one terminal, run `npm run dev` inside `frontend`.
4. In another terminal, run `npm run dev` inside `backend`.

The phase-one backend health check is available at `http://localhost:5000/api/health`.

## Status

Phase 3 backend work is in progress. Application, CV, and email-template APIs are integrated, and Gmail OAuth connection management is implemented. Gmail message sending and batch processing are not yet implemented. See [authentication setup](docs/authentication.md) before running the API.
