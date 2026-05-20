# Agriflow Frontend

React + Vite frontend for the Agriflow marketplace.

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Install

```bash
cd frontend
npm install
```

## Environment Configuration

Copy the example file and edit it for your environment:

```bash
cp .env.example .env
```

Variables are documented in [.env.example](.env.example).

## Start Dev Server

```bash
npm run dev
```

Default URL: `http://localhost:5173`

## Notes

- The frontend reads the API base URL from the shared config in [shared/apiConfig.ts](../shared/apiConfig.ts).
- Ensure the backend is running on `http://localhost:5000` or update the shared config.
