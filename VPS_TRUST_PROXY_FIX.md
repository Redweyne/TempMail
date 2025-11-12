# VPS Trust Proxy Fix Guide

## The Problem

The Express rate limiter is detecting that `trust proxy` is enabled on your VPS, which is a security issue if you're not actually behind a reverse proxy.

## Quick Fix Steps

### Step 1: Run the Diagnostic Script

```bash
# On your VPS, in the tempmail directory
cd /var/www/tempmail
chmod +x vps-diagnostic.sh
./vps-diagnostic.sh
```

This will show you what environment variables are set and help identify the issue.

### Step 2: Check Your .env File

```bash
# Look for TRUST_PROXY_HOPS or REPL_ID in your .env file
cat /var/www/tempmail/.env | grep -E "(TRUST_PROXY|REPL_ID)"
```

**If you see `TRUST_PROXY_HOPS` set to any value (even 0 or 1), remove it or comment it out:**

```bash
# Edit your .env file
nano /var/www/tempmail/.env

# Remove or comment out this line:
# TRUST_PROXY_HOPS=1
```

### Step 3: Update Your Code

```bash
cd /var/www/tempmail
git pull origin main  # or whatever your branch name is
```

### Step 4: Rebuild the Application

```bash
cd /var/www/tempmail
npm run build
```

### Step 5: Restart PM2

```bash
pm2 restart tempmail
pm2 logs tempmail --lines 50
```

Look for this line in the logs:
```
[config] trust proxy: false (default (no proxy))
```

If you see this, you're good! If not, continue to the next section.

## Advanced Troubleshooting

### Check PM2 Environment Variables

```bash
# Check if PM2 has environment variables set
pm2 env tempmail | grep -E "(TRUST_PROXY|REPL_ID)"
```

### Check for Nginx or Reverse Proxy

If you **ARE** using nginx, apache, or another reverse proxy in front of your app:

1. Edit `/var/www/tempmail/.env` and add:
   ```
   TRUST_PROXY_HOPS=1
   ```

2. Rebuild and restart:
   ```bash
   npm run build
   pm2 restart tempmail
   ```

3. Check the logs - you should see:
   ```
   [config] trust proxy: 1 (explicit TRUST_PROXY_HOPS=1)
   ```

### Manual Code Verification

Check that the latest code is present:

```bash
grep -A 10 "Configure trust proxy" /var/www/tempmail/server/index.ts
```

You should see:
```javascript
// Configure trust proxy based on deployment environment
// Default: false (no proxy) - safest for direct VPS deployments
let trustProxySetting: boolean | number = false;
let trustProxyReason = "default (no proxy)";

if (process.env.REPL_ID) {
  // Replit environment - trust their proxy
  trustProxySetting = true;
  trustProxyReason = "Replit environment detected";
} else if (process.env.TRUST_PROXY_HOPS && parseInt(process.env.TRUST_PROXY_HOPS, 10) > 0) {
  // Explicit proxy configuration for VPS with reverse proxy
  trustProxySetting = parseInt(process.env.TRUST_PROXY_HOPS, 10);
  trustProxyReason = `explicit TRUST_PROXY_HOPS=${trustProxySetting}`;
}
```

## Still Having Issues?

### Nuclear Option - Clean Restart

```bash
cd /var/www/tempmail

# Stop PM2
pm2 stop tempmail
pm2 delete tempmail

# Clean build
rm -rf dist node_modules
npm install
npm run build

# Start fresh
pm2 start ecosystem.config.cjs
pm2 save

# Check logs
pm2 logs tempmail --lines 50
```

Look for the `[config] trust proxy:` line to verify the setting.

## What Should You See?

### For Direct VPS (No Reverse Proxy)
```
[config] trust proxy: false (default (no proxy))
```

### For VPS Behind Nginx/Apache
```
[config] trust proxy: 1 (explicit TRUST_PROXY_HOPS=1)
```

### For Replit Environment (This One)
```
[config] trust proxy: true (Replit environment detected)
```

## Common Causes

1. ✅ **TRUST_PROXY_HOPS set in .env** - Remove it if you're not using a reverse proxy
2. ✅ **Old code not updated** - Run `git pull` and rebuild
3. ✅ **PM2 not restarted** - Run `pm2 restart tempmail`
4. ✅ **Build not updated** - Run `npm run build` before restarting PM2

## Need Help?

Share the output of the diagnostic script (`./vps-diagnostic.sh`) to help troubleshoot further.
