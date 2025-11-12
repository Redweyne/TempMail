#!/bin/bash
# VPS Diagnostic Script for Tempmail Application

echo "========================================="
echo "Tempmail VPS Diagnostic"
echo "========================================="
echo ""

echo "1. Checking environment variables..."
echo "   REPL_ID: ${REPL_ID:-<not set>}"
echo "   TRUST_PROXY_HOPS: ${TRUST_PROXY_HOPS:-<not set>}"
echo "   NODE_ENV: ${NODE_ENV:-<not set>}"
echo ""

echo "2. Checking .env file..."
if [ -f /var/www/tempmail/.env ]; then
    echo "   .env file exists"
    echo "   Checking for TRUST_PROXY_HOPS or REPL_ID..."
    grep -E "(TRUST_PROXY_HOPS|REPL_ID)" /var/www/tempmail/.env || echo "   Neither variable found in .env (good!)"
else
    echo "   .env file not found"
fi
echo ""

echo "3. Checking latest code..."
if [ -f /var/www/tempmail/server/index.ts ]; then
    echo "   Checking trust proxy configuration in server/index.ts..."
    grep -A 5 "Configure trust proxy" /var/www/tempmail/server/index.ts | head -10
else
    echo "   server/index.ts not found!"
fi
echo ""

echo "4. PM2 process status..."
pm2 list | grep tempmail
echo ""

echo "5. Latest logs (last 20 lines)..."
pm2 logs tempmail --lines 20 --nostream
echo ""

echo "========================================="
echo "Diagnostic complete!"
echo "========================================="
