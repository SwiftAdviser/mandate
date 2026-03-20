#!/bin/sh

# Re-cache config at runtime when env vars are available
php artisan config:cache
php artisan route:cache

php artisan migrate --force

exec supervisord -c /app/scripts/supervisord.conf
