#!/usr/bin/env sh
set -eu

APP_DIR=${NIXPACKS_PHP_ROOT_DIR:-/var/www/html}

resolve_app_dir() {
  if [ -f "$APP_DIR/artisan" ]; then echo "$APP_DIR"; return 0; fi
  if [ -f "/app/artisan" ]; then echo "/app"; return 0; fi
  echo "$APP_DIR"
}

APP_DIR_RESOLVED=$(resolve_app_dir)
echo "[post-deploy] cd ${APP_DIR_RESOLVED}"
cd "$APP_DIR_RESOLVED"

echo "[post-deploy] Running migrations..."
php artisan migrate --force

echo "[post-deploy] Warming caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "[post-deploy] Done."
