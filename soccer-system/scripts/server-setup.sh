#!/usr/bin/env bash
# One-time server-side setup for the soccer-system frontend (绿茵汇).
# Run it FROM YOUR PC (PowerShell), password asked once:
#   Get-Content scripts\server-setup.sh -Raw | ssh root@39.96.61.195 "bash -s"
# Safe to re-run. English-only comments on purpose (avoids encoding issues through ssh pipes).
set -euo pipefail

PORT=8083                            # site port; 80/443/8000/8081/8082/8443 are taken by other projects
DEST=/www/wwwroot/soccer-system      # web root, matches $DestDir in deploy.ps1

echo "==> [1/5] Checking port $PORT is free ..."
if ss -tln | grep -q ":$PORT "; then
  echo "!! Port $PORT is OCCUPIED:"; ss -tlnp | grep ":$PORT " || true
  echo "   Edit PORT in this script (and nginx conf) to another port, then re-run."
  exit 1
fi

echo "==> [2/5] Creating web root $DEST ..."
mkdir -p "$DEST"

echo "==> [3/5] Locating nginx ..."
NGINX="$(command -v nginx || true)"
if [ -z "$NGINX" ] && [ -x /www/server/nginx/sbin/nginx ]; then
  NGINX="/www/server/nginx/sbin/nginx"   # BT-panel (宝塔) nginx
fi
if [ -z "$NGINX" ]; then
  echo "    nginx not found, installing ..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nginx && systemctl enable --now nginx
  else
    echo "!! Neither apt-get nor yum found. Install nginx manually, then re-run."
    exit 1
  fi
  NGINX="$(command -v nginx)"
fi
echo "    nginx: $NGINX"

echo "==> [4/5] Writing site config (listen $PORT) ..."
CONF=""
for d in /www/server/panel/vhost/nginx /etc/nginx/conf.d /etc/nginx/sites-enabled; do
  if [ -d "$d" ]; then CONF="$d/soccer-system.conf"; break; fi
done
if [ -z "$CONF" ]; then
  mkdir -p /etc/nginx/conf.d
  CONF="/etc/nginx/conf.d/soccer-system.conf"
fi
cat > "$CONF" <<EOF
server {
    listen $PORT;
    server_name _;
    root $DEST;
    index index.html;

    # SPA history-mode fallback: deep links like /user/dashboard survive refresh
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # hashed static assets can be cached long-term
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
echo "    conf: $CONF"

echo "==> [5/5] Testing and reloading nginx ..."
"$NGINX" -t
"$NGINX" -s reload 2>/dev/null || systemctl reload nginx || service nginx reload || true

CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" 2>/dev/null || echo FAIL)"
echo "    self-test http://127.0.0.1:$PORT/ -> $CODE (200/403/404 all fine before upload)"

echo ""
echo "DONE. Now on your PC run:  npm run deploy"
echo "Then visit:  http://39.96.61.195:$PORT/"
echo "(Remember: add TCP $PORT inbound rule in Aliyun security group if not yet.)"
