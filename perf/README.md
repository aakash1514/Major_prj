# AgriFlow performance harness (`perf/`)

Measurement only. Nothing in here modifies `backend/`, `frontend/`, `mobile/`, `ml_service/` or `shared/`.
Published results: [results/summary-2026-10-13.json](results/summary-2026-10-13.json).

## What's here

| Path | Purpose |
|---|---|
| `lib/env.js` | Builds the `agriflow_perf` connection string from `backend/.env` credentials (only the DB name changes; refuses any port other than 5432/PG15) |
| `lib/servers.js` | Starts and stops each service under test on perf-only ports, pointed at `agriflow_perf` |
| `db/create-db.js` | Creates `agriflow_perf` and applies the backend's own schema (`backend/models/schema.js → initDatabase()`) |
| `seed.js` | Re-runnable seed (TRUNCATE then INSERT): 50 farmers, 200 buyers, 10 agents, 1 admin, 2,000 crops, 10,000 orders |
| `load/api.js`, `load/run-api.js` | k6 API scenarios plus a runner (10 s warm-up, then 50 VUs × 60 s, 3 runs, medians) |
| `load/payload-sizes.js` | Size of one successful response per endpoint, current vs before |
| `load/ml.js`, `load/run-ml.js` | k6 ML scenarios (200 sequential requests; 20 VUs × 60 s) across Flask-dev and waitress, current and before |
| `ml/cold_load.py` | Cold `joblib.load` time and memory per model (fresh subprocess each time) |
| `db/explain.js` | `EXPLAIN (ANALYZE, BUFFERS)` on the hot controller queries |
| `build-baseline.js` | Merges `results/raw/*` and environment info into `results/<label>-<date>.json` (kept local) |
| `build-summary.js` | Extracts the published before/after metrics into `results/summary-<date>.json` |
| `run-load-all.sh` | Runs every API and ML load test sequentially |

## Ports used

| Service | Port |
|---|---|
| Backend, current code | 5050 |
| Backend, "before" worktree (`2e2a563`) | 5051 |
| ML service, current code | 5001 |
| ML service, "before" worktree | 5002 |

The dev backend (5000), the dev database (`agriflow`) and PG13 (5433) are never touched.
All services get a perf-only `JWT_SECRET` through environment variables.

## One-time setup

Prerequisites: Node 24, PostgreSQL 15 on `localhost:5432` (credentials in `backend/.env`), and the repo `.venv` with
`ml_service/requirements.txt` installed.

```bash
# 1. Tools
winget install k6 --source winget          # installs to C:\Program Files\k6\k6.exe
.venv/Scripts/python -m pip install waitress
cd perf && npm install                     # local devDependencies

# 2. Isolated database + schema + seed
node db/create-db.js
node seed.js

# 3. "Before" worktree (pre-caching / pre-pagination code, parent of 0f151ee)
cd ..
git worktree add --detach perf/.worktrees/before-2e2a563 2e2a563
cp "ml models/models/price_predictor_xgb.pkl" "perf/.worktrees/before-2e2a563/ml models/models/"   # untracked in git
MSYS_NO_PATHCONV=1 cmd /c mklink /J "perf\.worktrees\before-2e2a563\backend\node_modules" "backend\node_modules"
```

The backend `package.json` is identical in both commits, which is why a junction to `backend/node_modules` is enough.

## How to re-run

Run from the repo root in Git Bash, with PG15 running. Close heavy apps and keep the laptop plugged in.

```bash
cd perf

# 0. Keep the previous run's raw files: run outputs go to results/raw/
mv results/raw results/raw-baseline-2026-10-13

# 1. Database (re-runnable; the schema is applied by the backend's own initDatabase)
node db/create-db.js
node seed.js

# 2. API + ML load tests, sequential, ~100 min (also measures payload sizes)
mkdir -p results/raw
./run-load-all.sh > results/raw/load-run.log 2>&1

# 3. Cold model load and DB query plans
../.venv/Scripts/python -I ml/cold_load.py 3 > results/raw/ml-cold-load.json
node db/explain.js

# 4. Merge into one local JSON, then extract the published summary
node build-baseline.js --label after --date $(date +%F)
```

`build-summary.js` reads `results/baseline-<date>.json`. To produce a summary from the new run, either name it with
`--label baseline` or adjust the filename in the script.

**Comparing after a fix:** diff the new local JSON against the previous one. The key paths are
`api.current.scenarios.<name>.median`, `api.payload_sizes.current` and `ml.load.<server>.results.<model>:<mode>.median`.

To re-test one area quickly:
- `node load/run-api.js --target current --scenarios admin_orders`
- `node load/run-ml.js --servers ml-current-waitress`

The "before" worktree (`2e2a563`) is only needed to reproduce the historical before/after comparison.

## Notes

- The backend and ML service read `DATABASE_URL`, `PORT`, `JWT_SECRET` and `ML_SERVICE_PORT` from the environment.
  dotenv doesn't override variables that are already set, so `backend/.env` is ignored for those keys.
- `PYTHONIOENCODING=utf-8` is set for the ML service. `app.py` prints `✓` at startup, and with stdout redirected to a
  file on Windows (cp1252) the service crashes on import.
- Write tests re-seed before every run, so each run starts from exactly 10,000 orders.
- The pre-cache price model reloads 208 MB on every request. Under 20 concurrent users this exhausts RAM on a 16 GB
  laptop, so `run-load-all.sh` limits that test to 1 run and skips it under the Flask dev server.
- All numbers are localhost-only, with the load generator sharing the CPU with the services.
- Clean up with `git worktree remove --force perf/.worktrees/before-2e2a563` and
  `DROP DATABASE agriflow_perf;` (on PG15).
