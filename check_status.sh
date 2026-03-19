#!/bin/bash
sleep 3
docker ps --format "table {{.Names}}\t{{.Status}}"
echo "--- Backend logs ---"
docker logs okoznaniy_backend_1 2>&1 | tail -15
