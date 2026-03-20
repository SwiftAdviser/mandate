#!/bin/sh

php artisan migrate --force

exec supervisord -c /app/scripts/supervisord.conf
