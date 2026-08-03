#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Run setup.sh first."
  exit 1
fi

if [ ! -f "$ROOT/backend/.env.local" ]; then
  echo "ERROR: backend/.env.local not found. Run setup.sh first."
  exit 1
fi

set -a
source "$ROOT/backend/.env.local"
set +a

# Ensure local Postgres is up
cd "$ROOT" && docker compose up -d postgres >/dev/null
echo -n "Waiting for Postgres to be ready"
until [ "$(docker inspect -f '{{.State.Health.Status}}' chosen-logistics-postgres 2>/dev/null)" = "healthy" ]; do
  echo -n "."
  sleep 1
done
echo " ready"
echo ""

# Regenerate Prisma client if needed
cd "$ROOT/backend" && npx prisma generate --quiet 2>/dev/null || true

echo "Starting Chosen Logistics Tracker..."
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Start backend in background
cd "$ROOT/backend" && node src/index.js &
BACKEND_PID=$!

# Give backend a moment to bind
sleep 1

# Start frontend (foreground)
cd "$ROOT/frontend" && npm run dev -- --host

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
