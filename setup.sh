#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "========================================="
echo "  Chosen Logistics Tracker — First-time Setup"
echo "========================================="

# Verify Node.js
if ! command -v node &>/dev/null; then
  echo ""
  echo "ERROR: Node.js not found."
  echo "Install it from https://nodejs.org (LTS) or via:"
  echo "  Homebrew: brew install node"
  echo "  NVM:      nvm install --lts"
  exit 1
fi

echo "Node: $(node -v)   npm: $(npm -v)"
echo ""

if ! command -v docker &>/dev/null; then
  echo ""
  echo "ERROR: Docker not found."
  echo "Install Docker Desktop from https://www.docker.com/products/docker-desktop"
  exit 1
fi

echo "--- Installing backend dependencies ---"
cd "$BACKEND" && npm install

echo ""
echo "--- Installing frontend dependencies ---"
cd "$FRONTEND" && npm install

if [ ! -f "$BACKEND/.env.local" ]; then
  echo ""
  echo "ERROR: $BACKEND/.env.local not found. Create it (see DATABASE_URL etc.) before running setup."
  exit 1
fi

echo ""
echo "--- Starting local Postgres (docker compose) ---"
cd "$ROOT" && docker compose up -d postgres
echo -n "Waiting for Postgres to be ready"
until [ "$(docker inspect -f '{{.State.Health.Status}}' chosen-logistics-postgres 2>/dev/null)" = "healthy" ]; do
  echo -n "."
  sleep 1
done
echo " ready"

set -a
source "$BACKEND/.env.local"
set +a

echo ""
echo "--- Pushing schema to Postgres ---"
cd "$BACKEND" && npx prisma db push

echo ""
echo "--- Seeding with sample data ---"
cd "$BACKEND" && node src/seed.js

echo ""
echo "========================================="
echo "  Setup complete!"
echo ""
echo "  To start the application, run:"
echo "    ./start.sh"
echo ""
echo "  Default account:"
echo "    Admin: shawnaprince / Admin#123"
echo "========================================="
