# Complete Deployment Guide - Tempmail to Contabo VPS

**Your Configuration:**
- VPS IP: `149.102.143.10`
- Domain: `redweyne.com` (IONOS)
- App Name: `Tempmail`
- App URL: `https://redweyne.com/tempmail`
- Database: SQLite

---

## 📋 PREREQUISITES

Before starting, have these ready:
- ✅ Contabo VPS credentials (IP: 149.102.143.10, root password)
- ✅ IONOS domain (redweyne.com) already configured
- ✅ Nginx already installed (from InboxAI setup)
- ✅ PM2 already installed (from InboxAI setup)
- ✅ SendGrid account for email sending
- ✅ Cloudflare account with Email Routing enabled
- ✅ 30 minutes of time

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Connect to Your VPS

**Using SSH:**
```bash
ssh root@149.102.143.10
```
Enter your root password when prompted.

---

### Step 2: Create Application Directory

```bash
# Create dedicated directory for tempmail
mkdir -p /var/www/tempmail
cd /var/www/tempmail
```

---

### Step 3: Upload Your Application Code

**Option A: Using Git (if you pushed to GitHub)**
```bash
cd /var/www/tempmail

# IMPORTANT: Note the dot (.) at the end - it clones INTO current directory
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Verify package.json exists in current directory
ls -la package.json
# You should see: package.json

# Install dependencies
npm install
```

**Option B: Upload from Replit**
1. On Replit: Download your project as ZIP
2. Use SFTP (FileZilla) to upload to `/var/www/tempmail`
3. Or use `scp` from your local machine:
   ```bash
   scp -r /path/to/tempmail root@149.102.143.10:/var/www/tempmail/
   ```

**After upload, install dependencies:**
```bash
cd /var/www/tempmail
npm install
```

⏱️ Wait 2-3 minutes for installation

---

### Step 4: Get SendGrid API Key

1. Go to [SendGrid](https://sendgrid.com/)
2. Log in or create account
3. Click **Settings** → **API Keys** (in left sidebar)
4. Click **Create API Key**
5. Name: **Tempmail Service**
6. API Key Permissions: **Full Access** (or Restricted with Mail Send enabled)
7. Click **Create & View**
8. **Copy the API key** (starts with `SG.`)
9. Save it - you won't see it again!

---

### Step 5: Create Environment File

```bash
cd /var/www/tempmail
nano .env
```

**Paste this (with YOUR actual values):**
```env
NODE_ENV=production
PORT=5001
BASE_PATH=/tempmail

# Generate secret with: openssl rand -hex 32
INBOUND_SHARED_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET

# Your SendGrid API key (from Step 4)
SMTP_PASS=SG.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Generate the INBOUND_SHARED_SECRET:**
1. Press `Ctrl + Z` to pause nano
2. Run: `openssl rand -hex 32`
3. Copy the output
4. Type `fg` to return to nano
5. Paste the secret where it says `CHANGE_THIS_TO_A_RANDOM_SECRET`

**Save the file:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

### Step 6: Build the Application

```bash
cd /var/www/tempmail

# Make build script executable
chmod +x build-subpath.sh

# Build with the /tempmail base path
./build-subpath.sh /tempmail
```

⏱️ Wait 1-2 minutes for build to complete

---

### Step 7: Start Application with PM2

```bash
cd /var/www/tempmail

# Create logs directory
mkdir -p logs

# Start the application using ecosystem config
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

**You should see:**
```
┌──────────┬────┬─────────┬──────┬───────┐
│ Name     │ id │ status  │ cpu  │ mem   │
├──────────┼────┼─────────┼──────┼───────┤
│ InboxAI  │ 0  │ online  │ 0%   │ 50MB  │
│ tempmail │ 1  │ online  │ 0%   │ 30MB  │
└──────────┴────┴─────────┴──────┴───────┘
```

**View logs:**
```bash
pm2 logs tempmail --lines 20
```

**Test locally:**
```bash
curl http://localhost:5001/tempmail/api/health
# Should return: {"status":"ok"}
```

---

### Step 8: Configure Nginx for Subpath

**Open your existing Nginx configuration:**
```bash
nano /etc/nginx/sites-available/InboxAI
```

**You will see your current configuration. Here's the COMPLETE file with the tempmail location added.**

**Replace your ENTIRE first server block with this:**

```nginx
server {
    server_name redweyne.com www.redweyne.com;

    # NEW: Tempmail application - ADD THIS BLOCK
    location /tempmail {
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

    # EXISTING: InboxAI application - KEEP THIS
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/redweyne.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/redweyne.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparams /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.redweyne.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = redweyne.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name redweyne.com www.redweyne.com;
    return 404; # managed by Certbot
}
```

**What changed:**
- Added the `/tempmail` location block BEFORE the existing `/` location
- Used `127.0.0.1:5001` (same format as your existing config)
- Everything else stays exactly the same

**Save:** `Ctrl+X`, `Y`, `Enter`

**Test and reload Nginx:**
```bash
# Test configuration
nginx -t

# Should say: syntax is ok, test is successful

# Reload Nginx
systemctl reload nginx
```

---

### Step 9: Configure Cloudflare Email Worker

#### 9.1 Set Up Email Routing in Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain (e.g., `redweyne.com`)
3. Go to **Email** → **Email Routing** (in left sidebar)
4. Click **Get started**
5. **Destination address:** Enter your personal email
6. Click **Enable Email Routing**
7. **Important:** Copy the MX records shown and add them to IONOS

#### 9.2 Add MX Records in IONOS

1. Log in to [IONOS](https://www.ionos.com/)
2. Go to **Domains & SSL**
3. Click on **redweyne.com**
4. Click **DNS** or **Manage DNS Settings**
5. Add the MX records from Cloudflare (usually 3 records):
   - Type: `MX`, Host: `@`, Points to: `route1.mx.cloudflare.net`, Priority: `89`
   - Type: `MX`, Host: `@`, Points to: `route2.mx.cloudflare.net`, Priority: `17`
   - Type: `MX`, Host: `@`, Points to: `route3.mx.cloudflare.net`, Priority: `56`
6. Add TXT record for verification (copy from Cloudflare)
7. Click **Save**

⏱️ Wait 5-10 minutes for DNS propagation

#### 9.3 Install Cloudflare Wrangler

**On your VPS:**
```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
# This will open a browser - authorize the connection
```

#### 9.4 Deploy Email Worker

```bash
cd /var/www/tempmail/cloudflare-email-worker

# Set the webhook URL
wrangler secret put WEBHOOK_URL
# When prompted, enter: https://redweyne.com/tempmail/api/inbound

# Set the shared secret (use the SAME secret from your .env file)
wrangler secret put WEBHOOK_SECRET
# When prompted, paste the INBOUND_SHARED_SECRET from your .env file

# Deploy the worker
wrangler deploy
```

**You should see:**
```
✨ Success! Uploaded worker
Published worker (0.XX sec)
  https://cloudflare-email-worker.YOUR-ACCOUNT.workers.dev
```

#### 9.5 Configure Email Routing Rules

1. Back in Cloudflare Dashboard: **Email** → **Email Routing**
2. Go to **Routes** tab
3. Click **Create route** or **Edit** default route
4. **Matcher:** Custom addresses: `*@redweyne.com`
5. **Action:** Send to a Worker → Select your deployed worker
6. Click **Save**

---

## 🎉 TESTING YOUR DEPLOYMENT

### Test 1: Check Application Status
```bash
pm2 status
pm2 logs tempmail --lines 30
```

### Test 2: Access Your Site
Open browser: `https://redweyne.com/tempmail`

You should see the Tempmail landing page!

### Test 3: Test Creating an Alias
1. Click **"Get Started"**
2. Click **"Create New Alias"**
3. Enter a custom name (e.g., `test`)
4. Select TTL (e.g., 30 minutes)
5. Click **"Create"**
6. You should see the alias created (e.g., `test@redweyne.com`)

### Test 4: Test Receiving Emails
1. Copy your alias address (e.g., `test@redweyne.com`)
2. Send a test email to that address from your Gmail/personal email
3. Wait 10-30 seconds
4. Refresh the dashboard - the email should appear!
5. Click on the email to view it
6. Test marking as read, deleting

### Test 5: Test API Endpoints
```bash
# Health check
curl https://redweyne.com/tempmail/api/health

# List aliases
curl https://redweyne.com/tempmail/api/aliases

# All should return valid JSON
```

---

## 🔧 COMMON ISSUES & FIXES

### Issue 1: 404 Not Found on /tempmail

**Fix:**
```bash
# Make sure Nginx config is correct
nano /etc/nginx/sites-available/InboxAI
# Verify the /tempmail location block exists BEFORE location /

# Test Nginx
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Issue 2: Application Not Running

**Fix:**
```bash
# Check PM2 status
pm2 status

# If stopped, restart
pm2 restart tempmail

# View error logs
pm2 logs tempmail --err --lines 50
```

### Issue 3: Build Failed

**Fix:**
```bash
cd /var/www/tempmail

# Make sure all dependencies are installed
npm install

# Try building again
./build-subpath.sh /tempmail

# If build script fails, check it's executable
chmod +x build-subpath.sh
```

### Issue 4: Emails Not Arriving

**Check these:**
1. Cloudflare Email Routing is enabled
2. MX records are set correctly in IONOS
3. Email Worker is deployed and running
4. Webhook URL is correct: `https://redweyne.com/tempmail/api/inbound`
5. Shared secret matches in both .env and Cloudflare

**Test webhook directly:**
```bash
# Get your shared secret
cd /var/www/tempmail
cat .env | grep INBOUND_SHARED_SECRET

# Test webhook (replace YOUR_SECRET with actual secret)
curl -X POST https://redweyne.com/tempmail/api/inbound \
  -H "Content-Type: text/plain" \
  -H "X-Inbound-Secret: YOUR_SECRET" \
  -d 'Subject: Test
From: sender@example.com
To: test@redweyne.com

Test message body'

# Should return 200 OK
```

**Check worker logs:**
```bash
cd /var/www/tempmail/cloudflare-email-worker
wrangler tail
# Send a test email and watch the logs
```

### Issue 5: CSS/JS Not Loading

**Fix:**
```bash
cd /var/www/tempmail

# Rebuild with correct base path
./build-subpath.sh /tempmail

# Restart app
pm2 restart tempmail

# Clear browser cache and refresh
```

### Issue 6: SendGrid Emails Not Sending

**Check:**
1. SendGrid API key is correct in .env
2. SendGrid account is verified
3. Check application logs for SendGrid errors

**Fix:**
```bash
# Verify .env has correct key
cd /var/www/tempmail
cat .env | grep SMTP_PASS

# View logs for errors
pm2 logs tempmail --lines 100 | grep -i sendgrid
```

---

## 📊 MAINTENANCE COMMANDS

### View Logs
```bash
# Application logs
pm2 logs tempmail

# Last 50 lines
pm2 logs tempmail --lines 50

# Error logs only
pm2 logs tempmail --err

# Nginx logs
tail -f /var/log/nginx/access.log | grep tempmail
tail -f /var/log/nginx/error.log
```

### Restart Application
```bash
pm2 restart tempmail
```

### Stop Application
```bash
pm2 stop tempmail
```

### Update Application
```bash
cd /var/www/tempmail
git pull  # If using Git
npm install
./build-subpath.sh /tempmail
pm2 restart tempmail
```

### Database Backup
```bash
# SQLite database backup
cp /var/www/tempmail/emails.db /root/tempmail-backup-$(date +%Y%m%d).db

# Restore from backup
cp /root/tempmail-backup-20250111.db /var/www/tempmail/emails.db
pm2 restart tempmail
```

### Monitor Resources
```bash
# PM2 monitoring
pm2 monit

# Check disk space (SQLite database grows over time)
du -sh /var/www/tempmail/emails.db
```

### Clean Old Emails (if database gets too large)
```bash
# The app auto-deletes expired aliases and their emails
# But you can manually clean if needed

# Stop app
pm2 stop tempmail

# Backup first!
cp /var/www/tempmail/emails.db /root/backup.db

# Delete old data (SQLite)
sqlite3 /var/www/tempmail/emails.db
# In SQLite shell:
DELETE FROM emails WHERE receivedAt < datetime('now', '-7 days');
VACUUM;
.quit

# Restart
pm2 start tempmail
```

---

## 📝 YOUR CONFIGURATION SUMMARY

**VPS Details:**
- IP: `149.102.143.10`
- OS: Ubuntu 24.04
- Provider: Contabo

**Domain:**
- Domain: `redweyne.com`
- Provider: IONOS
- DNS: Pointing to `149.102.143.10`

**Application:**
- Name: `Tempmail`
- Location: `/var/www/tempmail`
- URL: `https://redweyne.com/tempmail`
- Port: `5001`
- Process Manager: PM2

**Database:**
- Type: SQLite
- Location: `/var/www/tempmail/emails.db`

**Email Services:**
- Email Routing: Cloudflare
- Email Sending: SendGrid SMTP
- Worker: Cloudflare Email Worker

**URLs:**
- Frontend: `https://redweyne.com/tempmail`
- Dashboard: `https://redweyne.com/tempmail/dashboard`
- API: `https://redweyne.com/tempmail/api/*`
- Webhook: `https://redweyne.com/tempmail/api/inbound`

**Running Apps on VPS:**
- InboxAI: `https://redweyne.com` (port 5000)
- Tempmail: `https://redweyne.com/tempmail` (port 5001)

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Connected to VPS (149.102.143.10)
- [ ] Created directory /var/www/tempmail
- [ ] Uploaded application code
- [ ] Ran npm install
- [ ] Got SendGrid API key
- [ ] Created .env file with all credentials
- [ ] Generated INBOUND_SHARED_SECRET
- [ ] Built application with ./build-subpath.sh /tempmail
- [ ] Started application with PM2
- [ ] Configured Nginx location /tempmail block
- [ ] Tested and reloaded Nginx
- [ ] Set up Cloudflare Email Routing
- [ ] Added MX records in IONOS
- [ ] Installed Wrangler on VPS
- [ ] Deployed Cloudflare Email Worker
- [ ] Set WEBHOOK_URL in worker
- [ ] Set WEBHOOK_SECRET in worker
- [ ] Configured Email Routing rules
- [ ] Tested frontend access
- [ ] Created test alias
- [ ] Sent test email
- [ ] Verified email received

---

## 🎯 QUICK TROUBLESHOOTING

**Application won't start:**
```bash
pm2 logs tempmail --err --lines 50
cd /var/www/tempmail
node dist/index.js  # Run directly to see errors
```

**404 on /tempmail:**
```bash
nginx -t  # Test Nginx config
systemctl reload nginx
pm2 logs tempmail
```

**Emails not arriving:**
```bash
# Check Cloudflare worker
cd /var/www/tempmail/cloudflare-email-worker
wrangler tail

# Test webhook
curl -X POST https://redweyne.com/tempmail/api/inbound \
  -H "X-Inbound-Secret: YOUR_SECRET" \
  -H "Content-Type: text/plain" \
  -d 'Subject: Test
From: test@gmail.com
To: test@redweyne.com

Hello from webhook test'
```

**Database issues:**
```bash
# Check database file exists
ls -lh /var/www/tempmail/emails.db

# Check permissions
chmod 644 /var/www/tempmail/emails.db
pm2 restart tempmail
```

---

**Your Tempmail service is now live at: https://redweyne.com/tempmail** 🎉

For support, check the logs first:
```bash
pm2 logs tempmail --lines 100
```
