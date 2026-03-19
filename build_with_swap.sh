#!/bin/bash
set -e
cd /root/OkoZnaniy

# Добавляем swap если его нет
if [ ! -f /swapfile ]; then
  echo "=== Creating swap ==="
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "Swap created"
fi

echo "=== Building frontend dist ==="
docker run --rm \
  -v /root/OkoZnaniy/frontend-react:/app \
  -w /app \
  -e NODE_OPTIONS="--max-old-space-size=1536" \
  node:20-alpine \
  sh -c "npm install && npm run build"

echo "=== Rebuilding frontend container ==="
docker compose stop frontend
docker compose rm -f frontend
docker compose build frontend
docker compose up -d frontend

echo "=== Done ==="
docker ps --format "table {{.Names}}\t{{.Status}}"
