#!/bin/bash
# Build script for deploying at a subpath (e.g., /tempmail)
# Usage: ./build-subpath.sh /tempmail

SUBPATH=${1:-/tempmail}

echo "Building application for subpath: $SUBPATH"
echo "============================================"

# Ensure we have node_modules
if [ ! -d "node_modules" ]; then
  echo "Error: node_modules not found. Please run 'npm install' first."
  exit 1
fi

# Add local node_modules/.bin to PATH
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Build the client with Vite using --base flag
echo "Building frontend..."
vite build --base="$SUBPATH/"

# Build the server with esbuild
echo "Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo ""
echo "✅ Build complete!"
echo "Application will be accessible at: https://yourdomain.com$SUBPATH"
echo ""
echo "Next steps:"
echo "1. Deploy to your VPS: scp -r dist/ your-user@your-vps:/var/www/tempmail/"
echo "2. Configure Nginx location block for $SUBPATH"
echo "3. Update Cloudflare Worker webhook URL to include $SUBPATH/api/inbound"
