# IMMEDIATE FIX FOR redweyne.com/tempmail

## The Problem
1. PM2 can't find the application (path mismatch or missing files)
2. The trust proxy fix hasn't been built/deployed yet
3. Rate limiter is blocking all requests

## The Solution - Run These Commands on Your VPS

```bash
# 1. Stop any running PM2 processes
pm2 stop tempmail 2>/dev/null || true
pm2 delete tempmail 2>/dev/null || true

# 2. Go to your actual deployment directory
cd /var/www/tempmail

# 3. Pull the latest code (with the trust proxy fix)
git pull origin main

# 4. Install dependencies
npm install

# 5. Build the production bundle with the fix
npm run build

# 6. Verify the build succeeded (should show recent timestamp)
ls -lh dist/index.js

# 7. Start PM2 with the correct config
pm2 start ecosystem.config.cjs

# 8. Check the logs immediately
pm2 logs tempmail --lines 50
```

## What You Should See
After step 8, the logs should show:
- `Trust proxy enabled: loopback` (this means the fix is working)
- `serving on port 5001 with base path: /tempmail`
- NO ValidationError messages
- NO rate limit errors

## Test It
```bash
# From the VPS, test the API directly
curl -I http://127.0.0.1:5001/tempmail/

# Should return 200 OK

# Then test through nginx
curl -I https://redweyne.com/tempmail/

# Should also return 200 OK
```

## If PM2 Still Can't Find Files
The error showed `/var/nnn/tempmail`. If your actual path is different:

1. Check where the repo actually is:
```bash
find /var -name "loader.js" -type f 2>/dev/null | grep tempmail
```

2. Update ecosystem.config.cjs `cwd` field to match that path

3. Run `pm2 start ecosystem.config.cjs` again

## Still Not Working?
Send me the output of:
```bash
pwd
ls -la loader.js dist/index.js
pm2 logs tempmail --lines 20 --nostream
```
