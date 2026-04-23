#!/bin/bash
set -e

# 1. Create PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER fran_user WITH PASSWORD 'FranApp2026!';" 2>/dev/null || echo "User may already exist"
sudo -u postgres psql -c "CREATE DATABASE ai_franchise OWNER fran_user;" 2>/dev/null || echo "DB may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_franchise TO fran_user;" 2>/dev/null || true
# Grant schema permissions (needed for PostgreSQL 15+)
sudo -u postgres psql -d ai_franchise -c "GRANT ALL ON SCHEMA public TO fran_user;" 2>/dev/null || true
echo "=== Database ready ==="

# 2. Install PM2
sudo npm install -g pm2 > /dev/null 2>&1 || true
echo "PM2 version: $(pm2 --version)"

# 3. Create app directory
sudo mkdir -p /opt/ai-fran
sudo chown ubuntu:ubuntu /opt/ai-fran
echo "=== Directory ready ==="

# 4. Test PostgreSQL connection
PGPASSWORD='FranApp2026!' psql -U fran_user -h localhost -d ai_franchise -c "SELECT 1;" 2>/dev/null && echo "=== PG connection OK ===" || echo "=== PG connection FAILED - checking pg_hba ==="

# 5. Fix pg_hba if needed (allow local md5 auth)
PG_HBA=$(sudo find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)
if [ -n "$PG_HBA" ]; then
  if ! sudo grep -q "fran_user" "$PG_HBA" 2>/dev/null; then
    echo "host    ai_franchise    fran_user    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA" > /dev/null
    echo "local   ai_franchise    fran_user                    md5" | sudo tee -a "$PG_HBA" > /dev/null
    sudo systemctl reload postgresql
    echo "=== pg_hba updated ==="
  fi
fi

echo "=== Server prep complete ==="
