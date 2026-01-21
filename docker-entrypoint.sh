#!/bin/sh
set -e

echo "Running database seed..."
node dist/seed.js || echo "Seed completed (or skipped if admin exists)"

echo "Starting application..."
exec node dist/main.js
