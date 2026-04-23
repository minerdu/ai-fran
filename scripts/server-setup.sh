#!/bin/bash
set -e

: "${DB_NAME:=ai_franchise}"
: "${DB_USER:=fran_user}"
: "${APP_DIR:=/opt/ai-fran}"
: "${APP_USER:=ubuntu}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "DB_PASSWORD is required"
  echo "Example: DB_PASSWORD='change-me' APP_USER=ubuntu ./scripts/server-setup.sh"
  exit 1
fi

DB_PASSWORD_ESCAPED=${DB_PASSWORD//\'/\'\'}

# 1. Create PostgreSQL user and database
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD_ESCAPED}';"
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD_ESCAPED}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
# Grant schema permissions (needed for PostgreSQL 15+)
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null || true
echo "=== Database ready ==="

# 2. Install PM2
sudo npm install -g pm2 > /dev/null 2>&1 || true
echo "PM2 version: $(pm2 --version)"

# 3. Create app directory
sudo mkdir -p "${APP_DIR}"
sudo chown "${APP_USER}:${APP_USER}" "${APP_DIR}"
echo "=== Directory ready ==="

# 4. Test PostgreSQL connection
PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h localhost -d "${DB_NAME}" -c "SELECT 1;" 2>/dev/null && echo "=== PG connection OK ===" || echo "=== PG connection FAILED - checking pg_hba ==="

# 5. Fix pg_hba if needed (allow local md5 auth)
PG_HBA=$(sudo find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)
if [ -n "$PG_HBA" ]; then
  if ! sudo grep -q "${DB_USER}" "$PG_HBA" 2>/dev/null; then
    echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA" > /dev/null
    echo "local   ${DB_NAME}    ${DB_USER}                    md5" | sudo tee -a "$PG_HBA" > /dev/null
    sudo systemctl reload postgresql
    echo "=== pg_hba updated ==="
  fi
fi

echo "=== Server prep complete ==="
