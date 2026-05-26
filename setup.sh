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

echo "--- Installing backend dependencies ---"
cd "$BACKEND" && npm install

echo ""
echo "--- Installing frontend dependencies ---"
cd "$FRONTEND" && npm install

echo ""
echo "--- Initialising SQLite database ---"
cd "$BACKEND" && npx prisma db push

echo ""
echo "--- Seeding with sample data ---"
cd "$BACKEND" && DATABASE_URL="file:./prisma/dev.db" node src/seed.js

echo ""
echo "========================================="
echo "  Setup complete!"
echo ""
echo "  To start the application, run:"
echo "    ./start.sh"
echo ""
echo "  Default accounts:"
echo "    Admin:    admin / admin123"
echo "    Operator: operator1 / operator123"
echo "========================================="
