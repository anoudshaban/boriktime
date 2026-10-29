#!/usr/bin/env bash
# Deploy Börek Time to the codak-prod server (borektime.com).
#
#   SSH_USER=codaktech93_gmail_com SSH_KEY=~/.ssh/borektime_deploy deploy/deploy.sh
#
# Builds the frontend, uploads backend/ + deploy/ (never the local .env, database or
# uploads), rebuilds the container and runs migrations. The server keeps its own
# deploy/.env.production and the "deploy_storage" volume (database + uploads).
set -euo pipefail

SERVER="${SERVER:-34.18.197.141}"
SSH_USER="${SSH_USER:?set SSH_USER (OS Login user, e.g. codaktech93_gmail_com)}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/borektime_deploy}"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_USER@$SERVER")

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="$(mktemp -d)/borektime.tgz"

echo "→ Building frontend"
(cd "$ROOT/frontend" && npm run build)

echo "→ Packing"
(cd "$ROOT" && tar \
  --exclude='backend/vendor' --exclude='backend/node_modules' --exclude='backend/.env' \
  --exclude='backend/database/*.sqlite' --exclude='backend/storage/logs/*.log' \
  --exclude='backend/storage/framework/cache/data/*' --exclude='backend/storage/framework/sessions/*' \
  --exclude='backend/storage/framework/views/*.php' --exclude='backend/storage/framework/testing' \
  --exclude='backend/storage/app/public/*' --exclude='backend/public/storage' \
  --exclude='deploy/.env.production' \
  -czf "$ARCHIVE" backend deploy)

echo "→ Uploading"
scp -i "$SSH_KEY" -o BatchMode=yes "$ARCHIVE" "$SSH_USER@$SERVER:/tmp/borektime.tgz"

echo "→ Rebuilding on the server"
"${SSH[@]}" 'set -e
cd /srv/borektime
sudo cp deploy/.env.production /tmp/env.keep
sudo rm -rf backend
sudo tar -xzf /tmp/borektime.tgz -C /srv/borektime
sudo cp /tmp/env.keep deploy/.env.production && sudo chmod 600 deploy/.env.production
rm /tmp/borektime.tgz
cd deploy
sudo docker compose build -q
sudo docker compose up -d
sleep 5
sudo docker exec borektime-app php artisan migrate --force
sudo docker exec borektime-app php artisan config:cache
sudo docker exec borektime-app php artisan route:cache
sudo docker exec borektime-app php artisan view:cache
sudo docker exec borektime-app php artisan tinker --execute "App\Support\MenuCache::flush();"'

echo "→ Checking"
for path in welcome reserve admin api/menu; do
  printf '%-10s %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' "https://borektime.com/$path")"
done
