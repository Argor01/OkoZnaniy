#!/bin/bash
docker exec okoznaniy_postgres_1 psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres123';"
echo "Done"
