#!/bin/bash
# Load environment variables from .env file
set -a
source /var/www/tempmail/.env
set +a

# Start the application
exec node /var/www/tempmail/dist/index.js
