#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building..."
pnpm build > /dev/null 2>&1

echo "Copying schema..."
cp packages/api/src/services/storage/schema.sql packages/api/dist/services/storage/schema.sql 2>/dev/null || true

echo "Starting CodeScan API Server..."
node packages/api/dist/server.js
