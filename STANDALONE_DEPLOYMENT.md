# Standalone Deployment Guide: Tempmail Service

Deploy the Redweyne temporary email service at `redweyne.com/tempmail` as a **completely separate application** from your existing redweyne.com site.

---

## Prerequisites

- Your VPS running Linux
- Node.js 18+ installed
- PM2 installed globally (`npm install -g pm2`)
- Git installed
- A reverse proxy (Nginx, Apache, Caddy, etc.) already serving your main site
- Cloudflare account with Email Workers set up

---

## Part 1: Deploy the Application

### Step 1: Create Dedicated Directory

```bash
# SSH into your VPS
ssh your-user@your-vps

# Create a dedicated directory for tempmail
sudo mkdir -p /var/www/tempmail
sudo chown -R $USER:$USER /var/www/tempmail
cd /var/www/tempmail
```

### Step 2: Clone and Install

```bash
# Clone your repository
git clone <your-repo-url> .

# Install dependencies
npm install --production
```

### Step 3: Build with Base Path

**CRITICAL:** The app must be built with the base path set.

Use the provided build script:

```bash
chmod +x build-subpath.sh
./build-subpath.sh /tempmail
```

This creates a `dist/` folder with your built application.

### Step 4: Configure Environment

Create a `.env` file in `/var/www/tempmail`:

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5001
BASE_PATH=/tempmail

# Generate with: openssl rand -hex 32
INBOUND_SHARED_SECRET=your_generated_secret_here

# Your SendGrid API key
SMTP_PASS=your_sendgrid_api_key_here
EOF
```

**Generate the secret:**
```bash
openssl rand -hex 32
# Copy the output and paste it into .env
```

### Step 5: Set Up PM2 Process

Create PM2 config at `/var/www/tempmail/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'tempmail',
    script: './dist/index.js',
    cwd: '/var/www/tempmail',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      BASE_PATH: '/tempmail'
    },
    error_file: '/var/www/tempmail/logs/err.log',
    out_file: '/var/www/tempmail/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

Create logs directory:
```bash
mkdir -p /var/www/tempmail/logs
```

Start the application:
```bash
cd /var/www/tempmail
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow the command it gives you
```

Verify it's running:
```bash
pm2 status
pm2 logs tempmail

# Test locally
curl http://localhost:5001/tempmail/api/health
```

---

## Part 2: Configure Your Reverse Proxy

Your app is now running on `localhost:5001` with BASE_PATH `/tempmail`. You need to configure your existing reverse proxy to route `redweyne.com/tempmail` to this service.

### First: Identify Your Web Server

Run these commands to see what you're using:

```bash
# Check what's installed
which nginx
which apache2
which httpd
which caddy

# Check what's running
systemctl list-units --type=service | grep -E 'nginx|apache|httpd|caddy'

# Check listening ports
sudo ss -tulpn | grep :80
sudo ss -tulpn | grep :443
```

---

### Option A: Nginx Configuration

Find your config file:
```bash
# Common locations:
ls /etc/nginx/sites-available/
ls /etc/nginx/conf.d/
```

Edit your existing site config (e.g., `/etc/nginx/sites-available/redweyne`):

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name redweyne.com;

    # SSL configuration (your existing SSL settings)
    # ...

    # NEW: Tempmail application
    location /tempmail {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }

    # Your existing location / block for your main app
    location / {
        # Your existing main app configuration
        proxy_pass http://localhost:3000;  # Or wherever your main app is
        # ...
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option B: Apache Configuration

Find your config:
```bash
# Common locations:
ls /etc/apache2/sites-available/
ls /etc/httpd/conf.d/
```

Enable required modules:
```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo systemctl restart apache2
```

Add to your VirtualHost (e.g., `/etc/apache2/sites-available/redweyne.conf`):

```apache
<VirtualHost *:80>
<VirtualHost *:443>
    ServerName redweyne.com
    
    # Your existing SSL settings
    # ...

    # NEW: Tempmail application
    ProxyPreserveHost On
    ProxyPass /tempmail http://localhost:5001/tempmail
    ProxyPassReverse /tempmail http://localhost:5001/tempmail
    
    RequestHeader set X-Forwarded-Proto "https" env=HTTPS
    RequestHeader set X-Forwarded-Prefix "/tempmail"

    # Your existing main app proxy
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

Test and reload:
```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

---

### Option C: Caddy Configuration

Find your Caddyfile:
```bash
# Common locations:
ls /etc/caddy/Caddyfile
ls ~/Caddyfile
```

Edit the Caddyfile:

```caddy
redweyne.com {
    # NEW: Tempmail application
    handle /tempmail* {
        reverse_proxy localhost:5001
    }

    # Your existing main app
    handle {
        reverse_proxy localhost:3000
    }
}
```

Reload:
```bash
sudo systemctl reload caddy
```

---

### Option D: Other Reverse Proxies / CDN

If you're using:
- **Cloudflare Workers / Pages**: Add a Worker route for `/tempmail/*` → `http://your-vps-ip:5001`
- **AWS ALB / API Gateway**: Add a path-based routing rule
- **Traefik**: Add a router with PathPrefix(`/tempmail`)

**General principles:**
1. Route requests to `/tempmail` → `http://localhost:5001`
2. Preserve the `/tempmail` prefix in the URL
3. Set headers: `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`

---

## Part 3: Configure Cloudflare Email Worker

Update your Cloudflare Email Worker to send to the new webhook URL:

```bash
cd /path/to/your/cloudflare-email-worker

# Set the webhook URL
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/tempmail/api/inbound

# Set the shared secret (must match your .env INBOUND_SHARED_SECRET)
wrangler secret put WEBHOOK_SECRET
# Enter: (paste the same secret from your .env file)

# Deploy
wrangler deploy
```

---

## Part 4: Verify Deployment

### Test Frontend
```bash
curl https://redweyne.com/tempmail
# Should return HTML

curl -I https://redweyne.com/tempmail
# Should return 200 OK
```

### Test API
```bash
curl https://redweyne.com/tempmail/api/health
# Should return {"status":"ok"}

curl https://redweyne.com/tempmail/api/aliases
# Should return []
```

### Test in Browser
1. Visit `https://redweyne.com/tempmail`
2. Click "Get Started" → should go to `/tempmail/dashboard`
3. Create an alias with custom name
4. Send a test email to the generated address
5. Verify email appears in the dashboard
6. Test viewing, marking as read, deleting

### Check Logs
```bash
# Application logs
pm2 logs tempmail

# Web server logs
sudo tail -f /var/log/nginx/access.log  # Nginx
sudo tail -f /var/log/apache2/access.log  # Apache
sudo journalctl -u caddy -f  # Caddy
```

---

## Your Final Setup

```
/var/www/tempmail/              ← Dedicated directory
├── dist/                       ← Built application
│   ├── index.js               ← Express server
│   └── public/                ← React frontend
├── .env                       ← Environment variables
├── ecosystem.config.js        ← PM2 configuration
├── logs/                      ← Application logs
├── emails.db                 ← SQLite database
└── package.json

Process: PM2 app "tempmail" on port 5001
Reverse Proxy: Routes /tempmail → localhost:5001
Database: SQLite at /var/www/tempmail/emails.db
```

**Completely separate from your main application!**

---

## Maintenance

### Update Application
```bash
cd /var/www/tempmail
git pull origin main

# Reinstall dependencies to ensure all build tools are available
npm install --production

# Rebuild with the base path
./build-subpath.sh /tempmail

# Reload the application
pm2 reload tempmail
```

### View Logs
```bash
pm2 logs tempmail
# Or
tail -f /var/www/tempmail/logs/out.log
```

### Backup Database
```bash
cp /var/www/tempmail/emails.db /var/www/tempmail/backups/emails-$(date +%Y%m%d).db
```

### Stop/Start
```bash
pm2 stop tempmail
pm2 start tempmail
pm2 restart tempmail
pm2 delete tempmail  # Remove completely
```

---

## Troubleshooting

**502 Bad Gateway**
```bash
# Check if app is running
pm2 status tempmail
pm2 logs tempmail

# Restart if needed
pm2 restart tempmail
```

**404 on frontend routes**
```bash
# Ensure you built with the correct base path
cd /var/www/tempmail
./build-subpath.sh /tempmail
pm2 reload tempmail
```

**API calls failing**
- Check browser console - API URLs should be `/tempmail/api/...`
- Verify `BASE_PATH=/tempmail` in your `.env` file
- Verify reverse proxy is passing requests correctly

**Emails not arriving**
```bash
# Check webhook URL in Cloudflare Worker
wrangler secret list

# Test webhook directly
curl -X POST https://redweyne.com/tempmail/api/inbound \
  -H "Content-Type: application/json" \
  -H "X-Shared-Secret: your_secret" \
  -d '{"to":"test@redweyne.com","from":"sender@example.com","subject":"Test","text":"Test"}'
```
