#!/usr/bin/env bash
# Runs all API + ML load benchmarks sequentially (nothing else should run meanwhile). ~100 min.
# Results land in results/raw/; move that folder aside first if you want to keep a previous run.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p results/raw
date -Iseconds > results/raw/load-started.txt
node load/run-api.js --target current
node load/run-api.js --target before --scenarios admin_orders,admin_users,admin_crops
node load/run-ml.js --servers ml-current-waitress,ml-current-flask,ml-before-waitress,ml-before-flask \
  --limit ml-before-waitress:price:conc=1 \
  --limit-reason "Limited to 1 run: free physical RAM fell to 7 MB during run 1 (pre-cache code reloads the 208 MB RandomForest, +216 MB each, on up to 8 waitress threads). Repeating risked destabilising the test machine. Latency is dominated by paging." \
  --skip ml-before-flask:price:conc \
  --skip-reason "Not run: pre-cache code reloads the 208 MB RandomForest (+216 MB RAM each) per request. With the waitress 8-thread cap, free RAM already fell to 7 MB; Flask dev server threads are unbounded (up to 20 concurrent loads), so it was not attempted."
node load/payload-sizes.js
date -Iseconds > results/raw/load-finished.txt
