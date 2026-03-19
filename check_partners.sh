#!/bin/bash
docker exec okoznaniy_postgres_1 psql -U postgres -d oko_db -c "SELECT id, username, role, city FROM users_user WHERE role='partner' LIMIT 10;"
echo "---"
docker exec okoznaniy_postgres_1 psql -U postgres -d oko_db -c "SELECT COUNT(*) as total_partners FROM users_user WHERE role='partner';"
