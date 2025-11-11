# Deploying Redweyne at a Subpath (redweyne.com/tempmail)

Complete guide for deploying the temporary email service alongside your existing application at `redweyne.com/tempmail`.

## Overview

Your setup will be:
- **Main app**: `redweyne.com/` → Your existing application
- **Tempmail app**: `redweyne.com/tempmail` → This temporary email service

---

## Prerequisites

- Existing application running at `redweyne.com`
- Root or sudo access to your VPS
- Nginx already configured
- PM2 already installed (or install it: `sudo npm install -g pm2`)

---

## Step 1: Understanding the Code Changes

The application code has already been updated to support subpath deployment! Here's what's been configured:

### Built-in Base Path Support

The application automatically detects the base path from the `BASE_URL` environment variable (set during build).

**Key features:**
1. **Base Path Utility** (`client/src/lib/basePath.ts`) - Centralizes base path logic
2. **Route Handling** - All routes automatically prefix with the base path
3. **API Calls** - All API requests automatically use the correct path
4. **Navigation Links** - All internal links work under any base path

**No code changes needed!** The application is ready for subpath deployment out of the box.

---

## Step 2: VPS Deployment

### 1. Deploy Application Files

```bash
# Connect to your VPS
ssh your-user@your-vps-ip

# Navigate to deployment directory
cd /var/www

# Clone or upload your code
sudo git clone https://github.com/yourusername/redweyne.git tempmail
# Or: sudo mkdir tempmail && upload via SFTP

# Set ownership
sudo chown -R nodeapp:nodeapp /var/www/tempmail
cd tempmail
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Build with Base Path

```bash
# Build frontend with base path
BASE_PATH=/tempmail/ npm run build
```

### 4. Create Environment File

```bash
nano .env
```

Add:
```env
NODE_ENV=production
PORT=5001
BASE_PATH=/tempmail
INBOUND_SHARED_SECRET=your_secure_secret_here
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=noreply@redweyne.com
```

**Important:** Use a different port (5001) than your main app.

### 5. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'redweyne-tempmail',
    script: './dist/index.js',
    instances: 2,  // Use fewer instances since it's alongside another app
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      BASE_PATH: '/tempmail'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true
  }]
};
```

### 6. Start Application

```bash
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## Step 3: Nginx Configuration

### Update Existing Nginx Configuration

**Edit your existing Nginx config:**

```bash
sudo nano /etc/nginx/sites-available/redweyne
```

**Add the tempmail location block** (before your main location / block):

```nginx
server {
    listen 80;
    server_name redweyne.com www.redweyne.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name redweyne.com www.redweyne.com;

    ssl_certificate /etc/letsencrypt/live/redweyne.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redweyne.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/redweyne_access.log;
    error_log /var/log/nginx/redweyne_error.log;

    # Tempmail Application (IMPORTANT: This must come BEFORE the main location block)
    location /tempmail {
        # Remove /tempmail prefix and pass to the app
        rewrite ^/tempmail(/.*)$ $1 break;
        
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /tempmail;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }

    # Your existing application
    location / {
        # Your existing proxy_pass or root configuration here
        proxy_pass http://localhost:3000;  # or whatever your main app uses
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Alternative: If Your Main App Serves Static Files

If your main app uses `root` directive instead of `proxy_pass`:

```nginx
server {
    listen 443 ssl http2;
    server_name redweyne.com www.redweyne.com;

    ssl_certificate /etc/letsencrypt/live/redweyne.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redweyne.com/privkey.pem;

    # Tempmail application
    location /tempmail {
        rewrite ^/tempmail(/.*)$ $1 break;
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Prefix /tempmail;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application (static files)
    location / {
        root /var/www/html;  # Your main app's root
        try_files $uri $uri/ /index.html;
    }
}
```

### Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If successful, reload
sudo systemctl reload nginx
```

---

## Step 4: Cloudflare Configuration

The webhook URL needs to point to the subpath.

### Update Cloudflare Worker Secret

```bash
cd cloudflare-email-worker
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/tempmail/api/inbound
```

### Or Update Worker Code

If you prefer to update the code directly:

**Edit `cloudflare-email-worker/index.js`:**

```javascript
const WEBHOOK_URL = 'https://redweyne.com/tempmail/api/inbound';
```

Then redeploy:
```bash
wrangler deploy
```

---

## Step 5: Verification

### 1. Check Application is Running

```bash
pm2 status
# You should see both your main app and redweyne-tempmail running
```

### 2. Test Frontend Access

Visit `https://redweyne.com/tempmail` - you should see the landing page.

### 3. Test API Endpoints

```bash
# Test aliases endpoint
curl https://redweyne.com/tempmail/api/aliases

# Should return empty array [] initially
```

### 4. Test Email Reception

1. Create an alias at `https://redweyne.com/tempmail/dashboard`
2. Send a test email to that alias
3. Email should appear in the dashboard

---

## Troubleshooting

### Issue: 404 Not Found on Assets

**Problem:** CSS/JS files return 404.

**Solution:** Ensure you built with `BASE_PATH=/tempmail/ npm run build`

Rebuild:
```bash
cd /var/www/tempmail
BASE_PATH=/tempmail/ npm run build
pm2 reload redweyne-tempmail
```

### Issue: API Calls Failing

**Problem:** API calls go to wrong path.

**Solution:** Check browser console for the actual URLs being called. They should be `/tempmail/api/...`

### Issue: Routing Not Working

**Problem:** Navigation breaks or 404s on refresh.

**Solution:** Ensure Nginx `rewrite` rule is correct:
```nginx
rewrite ^/tempmail(/.*)$ $1 break;
```

### Issue: Both Apps Conflicting

**Problem:** Tempmail interferes with main app.

**Solution:** Ensure different ports (5001 vs 3000) and verify Nginx location order (tempmail before /).

---

## Resource Usage

Since you're running two applications on the same VPS:

### Recommended Minimum Specs
- **RAM**: 2GB (1GB for each app)
- **CPU**: 2 cores
- **Disk**: 20GB

### PM2 Instance Tuning

If your VPS has limited resources, reduce PM2 instances:

```javascript
// In ecosystem.config.js
instances: 1,  // Instead of 'max' or 2
```

### Monitor Resource Usage

```bash
pm2 monit
htop
free -m
df -h
```

---

## Complete Deployment Commands (Quick Reference)

```bash
# 1. Deploy code
cd /var/www
sudo git clone https://github.com/yourusername/redweyne.git tempmail
sudo chown -R nodeapp:nodeapp /var/www/tempmail
cd tempmail

# 2. Install and build
npm install --production
BASE_PATH=/tempmail/ npm run build

# 3. Configure environment
nano .env  # Add PORT=5001, BASE_PATH=/tempmail, etc.

# 4. Start with PM2
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save

# 5. Update Nginx
sudo nano /etc/nginx/sites-available/redweyne
# Add location /tempmail block
sudo nginx -t
sudo systemctl reload nginx

# 6. Update Cloudflare Worker
cd cloudflare-email-worker
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/tempmail/api/inbound
wrangler deploy

# 7. Test
curl https://redweyne.com/tempmail/api/aliases
```

---

## Updating the Application

When you need to update:

```bash
cd /var/www/tempmail
git pull origin main
npm install --production
BASE_PATH=/tempmail/ npm run build
pm2 reload redweyne-tempmail
```

---

## Checklist

- [ ] Application deployed to `/var/www/tempmail`
- [ ] Dependencies installed
- [ ] Built with `BASE_PATH=/tempmail/`
- [ ] `.env` file configured with `PORT=5001`
- [ ] PM2 running on port 5001
- [ ] Nginx location block added for `/tempmail`
- [ ] Nginx configuration tested and reloaded
- [ ] Cloudflare Worker updated with new webhook URL
- [ ] Frontend accessible at `redweyne.com/tempmail`
- [ ] API working at `redweyne.com/tempmail/api/...`
- [ ] Email reception tested and working

---

Your temporary email service is now running alongside your main application! 🎉
