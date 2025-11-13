#!/bin/bash
# Production build script for VPS deployment at /tempmail subpath

export BASE_URL="/tempmail"
export NODE_ENV="production"

echo "Building for production with BASE_URL=$BASE_URL..."
npm run build

echo ""
echo "Build complete! Deploy to VPS with:"
echo "  cd /var/www/tempmail"
echo "  git pull"
echo "  ./build-production.sh"
echo "  pm2 restart tempmail"
