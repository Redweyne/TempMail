# Correct Nginx Configuration for Subpath Deployment

## The Issue

When using `proxy_pass` with a path like `/tempmail/`, nginx strips and rewrites paths in unexpected ways, causing connection issues.

## The Solution

Use `proxy_pass` WITHOUT a trailing path. Let the Express app handle routing (it already knows about BASE_PATH=/tempmail).

## Correct Configuration

```nginx
location /tempmail/ {
    proxy_pass http://127.0.0.1:5001;
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

**Key point**: `proxy_pass http://127.0.0.1:5001;` (NO /tempmail/ at the end)

## Why This Works

1. Nginx receives: `https://redweyne.com/tempmail/dashboard`
2. Nginx forwards: `http://127.0.0.1:5001/tempmail/dashboard` (preserves full path)
3. Express app (configured with BASE_PATH=/tempmail) handles the routing

## Apply This Fix

```bash
nano /etc/nginx/sites-available/InboxAI

# Change line 6 from:
#   proxy_pass http://127.0.0.1:5001/tempmail/;
# To:
#   proxy_pass http://127.0.0.1:5001;

# Save, test, reload
nginx -t
systemctl reload nginx
```
