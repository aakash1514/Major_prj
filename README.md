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
