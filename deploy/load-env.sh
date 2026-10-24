#!/usr/bin/env bash
# Writes deploy/.env from SSM Parameter Store (/agriflow/*) for docker compose.
# Run on EC2 with an instance role allowed ssm:GetParametersByPath (+ kms:Decrypt
# for SecureString). Parameter /agriflow/FOO (any depth) becomes FOO=value.
# Values are never printed.
set -euo pipefail

REGION="ap-south-1"
SSM_PATH="/agriflow/"
REQUIRED=(JWT_SECRET DATABASE_URL RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET ALLOWED_ORIGINS MODELS_S3_BUCKET)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/.env"

umask 077
TMP="$(mktemp "$SCRIPT_DIR/.env.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

# JSON output keeps values with tabs/spaces intact; the CLI paginates automatically.
RAW="$(aws ssm get-parameters-by-path \
  --path "$SSM_PATH" --recursive --with-decryption --region "$REGION" \
  --query 'Parameters[].{n:Name,v:Value}' --output json)"

# python3 is on Amazon Linux / Ubuntu AMIs; used only to turn JSON into KEY=value lines.
TO_ENV="$(cat <<'PY'
import json, re, sys
params = json.load(sys.stdin)
out = []
for p in params:
    key = p["n"].rstrip("/").rsplit("/", 1)[-1]
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
        sys.exit(f"invalid env var name from parameter {p['n']}")
    if "\n" in p["v"] or "\r" in p["v"]:
        sys.exit(f"value of {key} contains a newline; not supported in an env file")
    out.append(f"{key}={p['v']}")
with open(sys.argv[1], "w", newline="\n") as f:
    f.write("\n".join(out) + ("\n" if out else ""))
PY
)"
printf '%s' "$RAW" | python3 -c "$TO_ENV" "$TMP"

missing=()
for key in "${REQUIRED[@]}"; do
  grep -q "^${key}=." "$TMP" || missing+=("$key")
done
if ((${#missing[@]})); then
  echo "load-env: missing or empty in SSM $SSM_PATH: ${missing[*]}" >&2
  exit 1
fi

chmod 600 "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
echo "load-env: wrote $(wc -l <"$OUT") variables to $OUT (mode 600)"
