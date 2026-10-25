#!/usr/bin/env bash
# Runs ON the EC2 server (as root, via SSM Run Command from GitHub Actions).
# The workflow first does: cd /opt/agriflow && git fetch origin main && git reset --hard origin/main
# so this file is always the version from the commit being deployed.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Deploying: $(git log -1 --oneline)"

# RDS CA bundle (gitignored *.pem) - copied into the backend image at /app/certs/.
if [ ! -s backend/certs/rds-global-bundle.pem ]; then
  mkdir -p backend/certs
  curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    -o backend/certs/rds-global-bundle.pem
fi

# Settings from SSM Parameter Store -> deploy/.env
bash deploy/load-env.sh

C="docker compose -f deploy/docker-compose.prod.yml"
$C build
$C up -d --remove-orphans
# nginx.conf is a single-file bind mount; recreate so a pulled config change is picked up.
$C up -d --force-recreate --no-deps nginx

# Wait up to ~5 min for every container to report healthy.
unhealthy="not-checked"
for _ in $(seq 1 30); do
  unhealthy="$($C ps --format '{{.Name}} {{.Health}}' | grep -v ' healthy$' || true)"
  [ -z "$unhealthy" ] && break
  sleep 10
done
$C ps
if [ -n "$unhealthy" ]; then
  echo "DEPLOY_FAILED - not healthy: $unhealthy"
  exit 1
fi

# Remove old, now-unused image layers so the 20 GB disk doesn't fill up.
docker image prune -f > /dev/null
echo "DEPLOY_OK"