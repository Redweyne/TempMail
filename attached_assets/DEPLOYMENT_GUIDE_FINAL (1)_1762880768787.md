# Complete Deployment Guide - Inbox AI to Contabo VPS

**Your Configuration:**
- VPS IP: `149.102.143.10`
- Domain: `redmeyne.com` (IONOS)
- App Name: `InboxAI`
- Database: PostgreSQL with user `inbox_user`

---

## 📋 PREREQUISITES

Before starting, have these ready:
- ✅ Contabo VPS credentials (IP: 149.102.143.10, root password)
- ✅ IONOS domain (redmeyne.com)
- ✅ Google account for OAuth
- ✅ 45 minutes of time

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Connect to Your VPS

**Using SSH:**
```bash
ssh root@149.102.143.10
```
Enter your root password when prompted.

---

### Step 2: Update System and Install Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x.x
npm --version

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install Git
apt install -y git

# Install Nginx
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
npm install -g pm2
```

---

### Step 3: Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql
```

**In the PostgreSQL shell, run these commands:**
```sql
-- Create database (note the capital letters)
CREATE DATABASE "InboxAI";

-- Create user with your password
CREATE USER inbox_user WITH ENCRYPTED PASSWORD 'Aa55337278';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "InboxAI" TO inbox_user;

-- Grant schema privileges (important!)
\c InboxAI
GRANT ALL ON SCHEMA public TO inbox_user;

-- Exit
\q
```

**Test the database connection:**
```bash
psql -U inbox_user -d InboxAI -h localhost
# Enter password: Aa55337278
# If successful, you'll see InboxAI=> prompt
# Type \q to exit
```

---

### Step 4: Get Google OAuth Credentials

#### 4.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name: **Inbox AI**
4. Click **"Create"**
5. Wait 30 seconds for project creation

#### 4.2 Enable APIs
1. Search for **"Gmail API"** → Click it → Click **"Enable"**
2. Search for **"Google Calendar API"** → Click it → Click **"Enable"**

#### 4.3 Configure OAuth Consent Screen (LEFT SIDEBAR!)
1. Click **"OAuth consent screen"** in the LEFT SIDEBAR
2. User Type: Select available option → Click **"Create"**
3. Fill in the form:
   - **App name:** Inbox AI
   - **User support email:** Your email
   - **Developer contact information:** Your email
4. Click **"Save and Continue"**
5. **Scopes page:** Click **"Save and Continue"** (skip)
6. **Test users page:** Click **"Save and Continue"**
7. **Summary:** Click **"Back to Dashboard"**

#### 4.4 Create OAuth Credentials
1. Click **"Credentials"** in the LEFT SIDEBAR
2. Click blue **"+ Create credentials"** button
3. Select **"OAuth 2.0 Client ID"**
4. **Application type:** Web application
5. **Name:** Inbox AI Web Client
6. **Authorized redirect URIs:** Click **"+ Add URI"**
   
   **Enter this (using your domain):**
   ```
   https://redmeyne.com/api/auth/google/callback
   ```
   
   **OR if domain not ready yet, use nip.io:**
   ```
   http://149.102.143.10.nip.io/api/auth/google/callback
   ```

7. Click **"Create"**
8. **SAVE THESE CREDENTIALS:**
   - Client ID (like: 776732182211-...)
   - Client Secret (like: GOCSPX-...)

---

### Step 5: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select **"Create API key in new project"** OR use existing project
4. Click **"Create"**
5. **Copy the API key** (like: AIzaSy...)
6. Save it!

---

### Step 6: Upload Your Application Code

#### Option A: Using Git (if you pushed to GitHub)
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git InboxAI
cd InboxAI
```

#### Option B: Upload from Replit
1. On Replit: Download your project as ZIP
2. Use SFTP (FileZilla) to upload to `/var/www/InboxAI`
3. Or use `scp` from your local machine:
   ```bash
   scp -r /path/to/InboxAI root@149.102.143.10:/var/www/
   ```

**After upload:**
```bash
cd /var/www/InboxAI
npm install
```

⏱️ Wait 2-3 minutes for installation

---

### Step 7: Create Environment File

```bash
cd /var/www/InboxAI
nano .env
```

**Paste this (with YOUR actual values):**
```env
NODE_ENV=production
PORT=5000

# Your domain (update when DNS is ready)
APP_URL=https://redmeyne.com

# Database connection
DATABASE_URL=postgresql://inbox_user:Aa55337278@localhost:5432/InboxAI

# Google OAuth credentials (from Step 4)
GOOGLE_CLIENT_ID=776732182211-0hvjn2gfvdiu693g26tr56qSlkterqg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Gemini API key (from Step 5)
GEMINI_API_KEY=AIzaSyApHZazQNgbLxKXU4fLjaAWyFTzY9riQyU
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

### Step 8: Build and Initialize Application

```bash
cd /var/www/InboxAI

# Build the application
npm run build

# Push database schema
npm run db:push
```

If `db:push` fails, try:
```bash
npm run db:push --force
```

---

### Step 9: Start Application with PM2

```bash
cd /var/www/InboxAI

# Start the application
pm2 start npm --name "InboxAI" -- start

# Configure PM2 to start on boot
pm2 startup
# Copy and run the command it gives you

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

**You should see:**
```
┌─────────┬────┬─────────┬──────┬───────┐
│ Name    │ id │ status  │ cpu  │ mem   │
├─────────┼────┼─────────┼──────┼───────┤
│ InboxAI │ 0  │ online  │ 0%   │ 50MB  │
└─────────┴────┴─────────┴──────┴───────┘
```

**View logs:**
```bash
pm2 logs InboxAI --lines 20
```

---

### Step 10: Configure Nginx Reverse Proxy

```bash
nano /etc/nginx/sites-available/InboxAI
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name redmeyne.com www.redmeyne.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save:** `Ctrl+X`, `Y`, `Enter`

**Enable the site:**
```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Enable your site
ln -s /etc/nginx/sites-available/InboxAI /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

### Step 11: Configure Firewall

```bash
# Allow SSH (IMPORTANT - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw enable

# Confirm: Type 'y' and press Enter

# Check status
ufw status
```

---

### Step 12: Configure IONOS DNS

1. Log in to [IONOS](https://www.ionos.com/)
2. Go to **Domains & SSL**
3. Click on **redmeyne.com**
4. Click **DNS** or **Manage DNS Settings**
5. Add/Edit A Record for root domain:
   - Type: `A`
   - Host name: `@` (or leave blank)
   - Points to: `149.102.143.10`
   - TTL: `3600`
   - Click **Save**
6. Add/Edit A Record for www:
   - Type: `A`
   - Host name: `www`
   - Points to: `149.102.143.10`
   - TTL: `3600`
   - Click **Save**

⏱️ **Wait 5-15 minutes** for DNS to propagate

**Test DNS propagation:**
```bash
# On your VPS
dig redmeyne.com +short
# Should return: 149.102.143.10
```

---

### Step 13: Install SSL Certificate (HTTPS)

**Wait until DNS is propagated (Step 12 complete), then:**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d redmeyne.com -d www.redmeyne.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms: `Y`
3. Share email with EFF: `N` (or `Y` if you want)
4. Redirect HTTP to HTTPS: `2` (recommended)

✅ **SSL installed!** Your site now uses HTTPS

**Update your .env file:**
```bash
nano /var/www/InboxAI/.env
# Change APP_URL to: APP_URL=https://redmeyne.com
# Save: Ctrl+X, Y, Enter

# Restart app
pm2 restart InboxAI
```

---

## 🎉 TESTING YOUR DEPLOYMENT

### Test 1: Check Application Status
```bash
pm2 status
pm2 logs InboxAI --lines 30
```

### Test 2: Access Your Site
Open browser: `https://redmeyne.com`

You should see the Inbox AI dashboard!

### Test 3: Test Google OAuth
1. Click **"Sync Now"** button
2. Should redirect to Google login
3. After login, should return to dashboard
4. Should show "Connected" status

### Test 4: Test AI Chat
1. Click **"Chat"** in sidebar
2. Send a test message
3. AI should respond

---

## 🔧 COMMON ISSUES & FIXES

### Issue 1: "No database connection string" Error

**Fix:**
```bash
# Make sure .env file exists
cd /var/www/InboxAI
cat .env

# If missing DATABASE_URL, add it:
nano .env
# Add: DATABASE_URL=postgresql://inbox_user:Aa55337278@localhost:5432/InboxAI
# Save and restart
pm2 restart InboxAI
```

### Issue 2: PM2 Not Loading .env File

**Fix:**
```bash
# Stop and delete current process
pm2 stop InboxAI
pm2 delete InboxAI

# Restart properly
cd /var/www/InboxAI
pm2 start npm --name "InboxAI" -- start
pm2 save
```

### Issue 3: Database Schema Not Created

**Fix:**
```bash
cd /var/www/InboxAI
npm run db:push --force
pm2 restart InboxAI
```

### Issue 4: OAuth Redirect Error

**Check these:**
1. Google Console redirect URI matches: `https://redmeyne.com/api/auth/google/callback`
2. .env file has: `APP_URL=https://redmeyne.com`
3. DNS is propagated: `dig redmeyne.com +short` returns `149.102.143.10`

**Fix:**
```bash
# Update .env
nano /var/www/InboxAI/.env
# Make sure APP_URL matches your domain exactly
pm2 restart InboxAI
```

### Issue 5: Can't Access Site

**Check Nginx:**
```bash
systemctl status nginx
nginx -t
systemctl restart nginx
```

**Check PM2:**
```bash
pm2 status
pm2 logs InboxAI --err --lines 50
```

**Check Firewall:**
```bash
ufw status
# Make sure ports 80 and 443 are allowed
```

### Issue 6: SSL Certificate Fails

**Requirements:**
- DNS must be propagated first
- Nginx must be configured correctly
- Port 80 must be accessible

**Fix:**
```bash
# Wait for DNS propagation
dig redmeyne.com +short

# Try again
certbot --nginx -d redmeyne.com -d www.redmeyne.com
```

---

## 📊 MAINTENANCE COMMANDS

### View Logs
```bash
# Application logs
pm2 logs InboxAI

# Last 50 lines
pm2 logs InboxAI --lines 50

# Error logs only
pm2 logs InboxAI --err

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart Application
```bash
pm2 restart InboxAI
```

### Stop Application
```bash
pm2 stop InboxAI
```

### Update Application
```bash
cd /var/www/InboxAI
git pull  # If using Git
npm install
npm run build
npm run db:push
pm2 restart InboxAI
```

### Database Backup
```bash
# Create backup
pg_dump -U inbox_user -d InboxAI > /root/backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U inbox_user -d InboxAI < /root/backup_20250108.sql
```

### Monitor Resources
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

---

## 📝 YOUR CONFIGURATION SUMMARY

**VPS Details:**
- IP: `149.102.143.10`
- OS: Ubuntu 24.04
- Provider: Contabo

**Domain:**
- Domain: `redmeyne.com`
- Provider: IONOS
- DNS: Pointing to `149.102.143.10`

**Application:**
- Name: `InboxAI`
- Location: `/var/www/InboxAI`
- Port: `5000`
- Process Manager: PM2

**Database:**
- Type: PostgreSQL
- Database: `InboxAI`
- User: `inbox_user`
- Password: `Aa55337278`

**APIs:**
- Google OAuth: Configured
- Gmail API: Enabled
- Calendar API: Enabled
- Gemini API: Configured

**URLs:**
- Application: `https://redmeyne.com`
- OAuth Callback: `https://redmeyne.com/api/auth/google/callback`

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Connected to VPS (149.102.143.10)
- [ ] Installed Node.js, PostgreSQL, Git, Nginx, PM2
- [ ] Created PostgreSQL database "InboxAI"
- [ ] Created database user inbox_user
- [ ] Enabled Gmail API and Calendar API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth credentials
- [ ] Got Gemini API key
- [ ] Uploaded application code to /var/www/InboxAI
- [ ] Created .env file with all credentials
- [ ] Ran npm install
- [ ] Ran npm run build
- [ ] Ran npm run db:push
- [ ] Started application with PM2
- [ ] Configured Nginx reverse proxy
- [ ] Enabled firewall (ports 22, 80, 443)
- [ ] Configured IONOS DNS
- [ ] Waited for DNS propagation
- [ ] Installed SSL certificate
- [ ] Updated APP_URL to https://redmeyne.com
- [ ] Tested application access
- [ ] Tested Google OAuth login
- [ ] Tested AI chat feature

---

## 🎯 QUICK TROUBLESHOOTING

**Application won't start:**
```bash
pm2 logs InboxAI --err --lines 50
cd /var/www/InboxAI
node dist/index.js  # Run directly to see errors
```

**Can't connect to database:**
```bash
psql -U inbox_user -d InboxAI -h localhost
# If this fails, database setup is wrong
```

**Nginx errors:**
```bash
nginx -t  # Test configuration
tail -f /var/log/nginx/error.log
```

**DNS not working:**
```bash
dig redmeyne.com +short  # Should show 149.102.143.10
```

---

**Your application is now live at: https://redmeyne.com** 🎉

For support, check the logs first:
```bash
pm2 logs InboxAI --lines 100
```
