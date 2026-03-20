#!/bin/sh

# Start queue worker in background
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &

# Start web server as foreground process (PID 1)
exec php artisan serve --host=0.0.0.0 --port=8080
