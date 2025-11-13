# 🔧 Quick Fix: Nginx Configuration for /tempmail

## The Problem
Your tempmail app doesn't load at `redweyne.com/tempmail` because nginx isn't configured to forward requests properly.

## The Fix (2 minutes)

### Step 1: Edit Nginx Config
```bash
nano /etc/nginx/sites-available/InboxAI
```

### Step 2: Find This Section
Look for the tempmail location block. It currently looks like:
```nginx
location /tempmail {
    proxy_pass http://127.0.0.1:5001;
    ...
}
```

### Step 3: Change It To This
**IMPORTANT: Add trailing slashes!**
```nginx
location /tempmail/ {
    proxy_pass http://127.0.0.1:5001/tempmail/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    client_max_body_size 10M;
}
```

**Key Changes:**
- `location /tempmail` → `location /tempmail/` (added trailing slash)
- `proxy_pass http://127.0.0.1:5001` → `proxy_pass http://127.0.0.1:5001/tempmail/` (added /tempmail/ path)

### Step 4: Save and Test
```bash
# Save: Ctrl+X, then Y, then Enter

# Test nginx config
nginx -t

# Should output: "syntax is ok" and "test is successful"

# Reload nginx
systemctl reload nginx
```

### Step 5: Test Your Site
Open browser and go to:
```
https://redweyne.com/tempmail/
```
(Note the trailing slash)

**You should now see your tempmail app! 🎉**

## Why This Works

Without trailing slashes:
- `location /tempmail` only matches the exact path `/tempmail`
- Requests to `/tempmail/dashboard` or `/tempmail/api/aliases` don't match
- Result: 404 errors

With trailing slashes:
- `location /tempmail/` matches `/tempmail/` and everything under it
- `proxy_pass http://127.0.0.1:5001/tempmail/` forwards the full path to your Express app
- Result: Everything works!

## Still Not Working?

**Check PM2 status:**
```bash
pm2 status
# Should show "tempmail" as "online"

pm2 logs tempmail --lines 20
# Should show "Trust proxy enabled: loopback"
```

**Test local access:**
```bash
curl http://localhost:5001/tempmail/
# Should return HTML
```

**Check nginx logs:**
```bash
tail -f /var/log/nginx/error.log
```

If you see errors, share them and I can help debug further.
