#!/bin/bash
set -e

# Create Nginx config for multi-app platform
sudo tee /etc/nginx/sites-available/ai-platform > /dev/null << 'NGINX_CONF'
# =============================================================
# AI 四应用集群 — Nginx 反向代理
# =============================================================
# /ops/     → AI 运营  (port 3000)
# /fran/    → AI 招商  (port 3001)
# /train/   → AI 培训  (port 3002, future)
# /growth/  → AI 引流  (port 3003, future)
# =============================================================

server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Default: redirect to AI 招商
    location = / {
        return 302 /fran/;
    }

    # AI 招商 (AI-Franchise) — port 3001
    location /fran/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    location /fran/_next/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # AI 运营 (AI-Sales) — port 3000 (existing, needs basePath /ops later)
    # For now, keep original / path as fallback
    location /ops/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # AI 培训 (future) — port 3002
    location /train/ {
        return 503 '{"status":"coming_soon","app":"AI Training"}';
        add_header Content-Type application/json always;
    }

    # AI 引流 (future) — port 3003
    location /growth/ {
        return 503 '{"status":"coming_soon","app":"AI Growth"}';
        add_header Content-Type application/json always;
    }
}
NGINX_CONF

# Remove old config, enable new
sudo rm -f /etc/nginx/sites-enabled/ai-sales
sudo ln -sf /etc/nginx/sites-available/ai-platform /etc/nginx/sites-enabled/ai-platform

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
echo "=== Nginx configured ==="
