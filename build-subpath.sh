#!/bin/bash
# Build script for deploying at a subpath (e.g., /tempmail)
# Usage: ./build-subpath.sh /tempmail

SUBPATH=${1:-/tempmail}

echo "Building application for subpath: $SUBPATH"
echo "============================================"

# Export BASE_PATH for vite to use
export BASE_PATH=$SUBPATH

# Build the application
npm run build

echo ""
echo "✅ Build complete!"
echo "Application will be accessible at: https://yourdomain.com$SUBPATH"
echo ""
echo "Next steps:"
echo "1. Deploy to your VPS: scp -r dist/ your-user@your-vps:/var/www/tempmail/"
echo "2. Configure Nginx location block for $SUBPATH"
echo "3. Update Cloudflare Worker webhook URL to include $SUBPATH/api/inbound"
