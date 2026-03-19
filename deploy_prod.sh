#!/bin/bash
set -e
cd /root/OkoZnaniy

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Building frontend dist ==="
docker run --rm -v /root/OkoZnaniy/frontend-react:/app -w /app node:20-alpine sh -c "npm install && npm run build"

echo "=== Rebuilding frontend container ==="
docker compose stop frontend
docker compose rm -f frontend
docker compose build frontend
docker compose up -d frontend

echo "=== Done ==="
docker ps --format "table {{.Names}}\t{{.Status}}"
