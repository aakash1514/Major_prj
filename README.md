# Agriflow Monorepo

Full stack marketplace for agriculture: backend API, web frontend, mobile app, and ML service.

## Tech Stack

- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite
- Mobile: Expo (React Native)
- ML Service: Flask

## Prerequisites

- Node.js 18+ (npm)
- Python 3.10+
- PostgreSQL
- Git
- Expo Go app (for mobile testing)

## Environment Setup

Create local env files from the examples:

```bash
# from repo root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp mobile/.env.example mobile/.env
cp ml_service/.env.example ml_service/.env
```

Windows PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item mobile\.env.example mobile\.env
Copy-Item ml_service\.env.example ml_service\.env
```

Update `backend/.env` with your PostgreSQL connection string and secrets.

## Install Dependencies

If you use a virtual environment for Python, activate it before installing ML dependencies.

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install

# mobile
cd ../mobile
npm install

# ml service
cd ../ml_service
pip install -r requirements.txt
```

## Run the Project (local dev)

Start services in this order:

```bash
# 1) ML service (port 5001)
cd ml_service
python app.py

# 2) Backend API (port 5000)
cd ../backend
npm run dev

# 3) Web frontend (port 5173)
cd ../frontend
npm run dev

# 4) Mobile app
cd ../mobile
npx expo start
```

## Shared API Config

Web and mobile use the shared config in [shared/apiConfig.ts](shared/apiConfig.ts). Update it if you use a custom host, LAN IP, or ngrok.

## Database

Create a database and set `DATABASE_URL` in `backend/.env`.

Example (psql):

```sql
CREATE DATABASE agriflow;
```

## Optional: ngrok

If you expose the backend with ngrok, update [shared/apiConfig.ts](shared/apiConfig.ts) to the current tunnel URL.

## Troubleshooting

- Port already in use: change the service port in its `.env` file or stop the process using that port.
- CORS errors: ensure `ALLOWED_ORIGINS` in `backend/.env` includes your frontend URL (e.g., `http://localhost:5173`).
- API not reachable from mobile: update [shared/apiConfig.ts](shared/apiConfig.ts) with your LAN IP or ngrok URL and restart the app.

## Folder Overview

- backend
- frontend
- mobile
- ml_service
- shared

## Performance

Measured with k6 load tests (50 concurrent users, 60 s runs, median of 3) against PostgreSQL seeded with 10,000 orders and 2,000 crops, all on localhost. ML rows: median of 200 sequential requests, median of 3 runs.

Before = commit `2e2a563`, after = commit `e3e1155` (includes `0f151ee`), same seeded database and hardware.

| Metric | Before | After |
|---|---:|---:|
| `/api/admin/orders` p95 latency | 20.5 s | 974 ms (21.1× faster) |
| `/api/admin/orders` throughput | 4.9 req/s | 81.5 req/s |
| `/api/admin/orders` error rate | 38.7% | 0% |
| `/api/admin/orders` response size | 6.4 MiB | 13 KiB |
| Price prediction, median latency | 738.7 ms | 183.8 ms (4.0× faster) |
| Demand prediction, median latency | 15.8 ms | 5.2 ms (3.0× faster) |

- **Server-side pagination (LIMIT/OFFSET)** on the admin orders, crops and users endpoints.
- **In-memory model caching** in the ML service: models load once at startup instead of on every request (both sides measured under waitress).

Raw numbers: [perf/results/summary-2026-10-13.json](perf/results/summary-2026-10-13.json). To reproduce, see [perf/README.md](perf/README.md).
