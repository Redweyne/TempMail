# Quick Deploy: Tempmail at redweyne.com/tempmail

30-minute deployment guide for running tempmail as a standalone service.

## What You Need to Know

1. **What web server do you use?** (Run this on your VPS to find out)
   ```bash
   systemctl list-units --type=service | grep -E 'nginx|apache|httpd|caddy'
   ```

2. **Where is your main app?**
   - If you don't know, that's fine - this will be completely separate
   - Main app stays wherever it is
   - Tempmail goes in `/var/www/tempmail`

---

## Deploy in 5 Steps

### 1. Set Up Directory (2 min)

```bash
ssh your-user@your-vps
sudo mkdir -p /var/www/tempmail
sudo chown -R $USER:$USER /var/www/tempmail
cd /var/www/tempmail
git clone <your-repo-url> .
npm install --production
```

### 2. Build Application (2 min)

```bash
BASE_PATH=/tempmail/ npm run build
```

### 3. Configure Environment (3 min)

```bash
# Generate a secure secret
openssl rand -hex 32  # Copy this output

# Create .env file
nano .env
```

Paste this (replace the placeholders):

```env
NODE_ENV=production
PORT=5001
BASE_PATH=/tempmail
INBOUND_SHARED_SECRET=paste_the_generated_secret_here
SMTP_PASS=your_sendgrid_api_key
```

Save and exit (Ctrl+X, Y, Enter).

### 4. Start with PM2 (3 min)

```bash
# Create logs directory
mkdir -p logs

# Start the app
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow the command it shows
```

Verify:
```bash
pm2 status  # Should show "tempmail" online
curl http://localhost:5001/tempmail/api/health  # Should return {"status":"ok"}
```

### 5. Configure Your Web Server (10-15 min)

**Don't know which one you use?**
```bash
which nginx && echo "You use Nginx" || \
which apache2 && echo "You use Apache" || \
which caddy && echo "You use Caddy"
```

#### If Nginx:

```bash
# Find your config
ls /etc/nginx/sites-available/

# Edit your site config
sudo nano /etc/nginx/sites-available/redweyne  # Or whatever it's named
```

Add this **before** your existing `location /` block:

```nginx
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
    }
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### If Apache:

```bash
# Enable modules
sudo a2enmod proxy proxy_http headers
sudo systemctl restart apache2

# Edit config
sudo nano /etc/apache2/sites-available/redweyne.conf
```

Add inside your `<VirtualHost>`:

```apache
    ProxyPreserveHost On
    ProxyPass /tempmail http://localhost:5001/tempmail
    ProxyPassReverse /tempmail http://localhost:5001/tempmail
```

Test and reload:
```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

#### If Caddy:

```bash
sudo nano /etc/caddy/Caddyfile
```

Add:

```caddy
redweyne.com {
    handle /tempmail* {
        reverse_proxy localhost:5001
    }
    
    # Your existing config...
}
```

Reload:
```bash
sudo systemctl reload caddy
```

---

## Configure Cloudflare Worker (5 min)

```bash
cd /path/to/cloudflare-email-worker

# Set webhook URL
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/tempmail/api/inbound

# Set shared secret (use the SAME value from your .env file)
wrangler secret put WEBHOOK_SECRET
# Enter: (paste your INBOUND_SHARED_SECRET)

# Deploy
wrangler deploy
```

---

## Test It Works (5 min)

```bash
# Test frontend
curl https://redweyne.com/tempmail
# Should return HTML

# Test API
curl https://redweyne.com/tempmail/api/health
# Should return {"status":"ok"}
```

**In your browser:**
1. Go to `https://redweyne.com/tempmail`
2. Click "Get Started"
3. Create an alias
4. Send a test email to the generated address
5. Verify it appears

**Done!** 🎉

---

## Your Setup

```
Main App:     redweyne.com/          → Your existing app (untouched)
Tempmail:     redweyne.com/tempmail  → New service (port 5001)

Directory:    /var/www/tempmail/     → Completely separate
PM2 Process:  "tempmail"             → Separate process
Database:     /var/www/tempmail/emails.db → Separate database
```

---

## Common Issues

**"502 Bad Gateway"**
```bash
pm2 status tempmail  # Is it running?
pm2 logs tempmail    # Any errors?
```

**"404 Not Found"**
```bash
# Did you build with BASE_PATH?
cd /var/www/tempmail
BASE_PATH=/tempmail/ npm run build
pm2 reload tempmail
```

**Need Help?**
- Full guide: `STANDALONE_DEPLOYMENT.md`
- Check logs: `pm2 logs tempmail`
- Restart: `pm2 restart tempmail`
