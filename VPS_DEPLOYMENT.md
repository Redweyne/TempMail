# Redweyne - VPS Deployment Guide

Complete guide for deploying your temporary email service on your own VPS (Ubuntu 20.04/22.04 LTS).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [Database Setup](#database-setup)
5. [PM2 Configuration](#pm2-configuration)
6. [Nginx Setup](#nginx-setup)
7. [SSL Certificate](#ssl-certificate)
8. [Cloudflare Email Routing](#cloudflare-email-routing)
9. [Environment Variables](#environment-variables)
10. [Security Hardening](#security-hardening)
11. [Monitoring & Logs](#monitoring--logs)
12. [Backup & Maintenance](#backup--maintenance)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **VPS Server**: Ubuntu 20.04 or 22.04 LTS (minimum 1GB RAM, 1 CPU core)
- **Domain Name**: `redweyne.com` (or your custom domain)
- **Cloudflare Account**: For email routing (free tier works)
- **SSH Access**: Root or sudo access to your VPS
- **Local Machine**: With SSH client installed

---

## Server Setup

### 1. Connect to Your VPS

```bash
ssh root@your-vps-ip
# Or with SSH key
ssh -i ~/.ssh/your-key.pem root@your-vps-ip
```

### 2. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Create a Non-Root User (Recommended)

```bash
# Create user
sudo adduser nodeapp
sudo usermod -aG sudo nodeapp

# Setup SSH for new user (optional)
sudo mkdir -p /home/nodeapp/.ssh
sudo cp ~/.ssh/authorized_keys /home/nodeapp/.ssh/
sudo chown -R nodeapp:nodeapp /home/nodeapp/.ssh
sudo chmod 700 /home/nodeapp/.ssh
sudo chmod 600 /home/nodeapp/.ssh/authorized_keys

# Switch to new user
su - nodeapp
```

### 4. Install Node.js (v20 LTS)

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 5. Install Build Tools

```bash
# Required for native modules like better-sqlite3
sudo apt install -y build-essential g++ python3
```

### 6. Install Git

```bash
sudo apt install -y git
```

---

## Application Deployment

### 1. Clone Your Repository

```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
sudo git clone https://github.com/yourusername/redweyne.git
# Or upload your code via SFTP/SCP

# Set ownership
sudo chown -R nodeapp:nodeapp /var/www/redweyne
cd redweyne
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Build the Frontend

```bash
# Build React frontend for production
npm run build
```

This creates optimized production files in `dist/public/`.

### 4. Test the Application

```bash
# Set environment variable
export NODE_ENV=production
export PORT=5000

# Test run (should fail if .env not configured yet, but checks if build works)
node dist/index.js
```

Press `Ctrl+C` to stop.

---

## Database Setup

The application uses **SQLite** by default, which stores data in a file called `emails.db`.

### Database Choice: SQLite vs PostgreSQL

**Current Setup: SQLite (File-based)**

✅ **Advantages:**
- Zero configuration required
- No separate database server needed
- Perfect for small-to-medium traffic
- Fast for read-heavy operations
- Built-in with the application

⚠️ **Considerations:**
- Not ideal for very high concurrent writes
- All data stored in a single file
- Requires proper backup strategy (covered below)

**For most temporary email services handling <1000 emails/day, SQLite is perfectly adequate.**

### 1. SQLite Setup (Default)

```bash
cd /var/www/redweyne
# Database will be created automatically on first run
# Ensure the app has write permissions
chmod 755 /var/www/redweyne
```

The database file `emails.db` will be created in `/var/www/redweyne/`.

### 2. PostgreSQL Setup (Optional - For High Traffic)

If you expect very high traffic or prefer a client-server database:

**Install PostgreSQL:**
```bash
sudo apt install -y postgresql postgresql-contrib
```

**Create Database and User:**
```bash
sudo -u postgres psql

-- In PostgreSQL prompt:
CREATE DATABASE redweyne;
CREATE USER redweyne_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE redweyne TO redweyne_user;
\q
```

**Update Your Code:**

You'll need to modify `server/storage.ts` to use PostgreSQL instead of SQLite. The application structure supports this through the `IStorage` interface, but the PostgreSQL implementation needs to be created.

**Note:** For most use cases, stick with SQLite. Only migrate to PostgreSQL if you're experiencing performance issues or need advanced database features.

---

## Environment Variables

### 1. Create `.env` File

```bash
cd /var/www/redweyne
nano .env
```

### 2. Add Configuration

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Inbound Email Secret (generate a secure random string)
# Generate with: openssl rand -hex 32
INBOUND_SHARED_SECRET=your_secure_random_secret_here

# SMTP Configuration (Optional - for sending emails)
# Sign up at https://sendgrid.com for free tier
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=noreply@redweyne.com
```

**Important:** Replace `your_secure_random_secret_here` with a secure random string:

```bash
# Generate secure secret
openssl rand -hex 32
```

### 3. Secure the `.env` File

```bash
chmod 600 .env
```

---

## PM2 Configuration

PM2 will keep your application running 24/7, restart on crashes, and enable clustering.

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 2. Create PM2 Ecosystem File

```bash
cd /var/www/redweyne
nano ecosystem.config.js
```

Add this configuration:

```javascript
module.exports = {
  apps: [{
    name: 'redweyne',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. Create Logs Directory

```bash
mkdir -p logs
```

### 4. Start Application with PM2

```bash
pm2 start ecosystem.config.js --env production
```

### 5. View Status

```bash
pm2 status
pm2 logs redweyne
```

### 6. Enable Auto-Start on Boot

```bash
# Generate startup script
pm2 startup systemd

# Copy and run the command it outputs, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u nodeapp --hp /home/nodeapp

# Save current process list
pm2 save
```

### 7. Essential PM2 Commands

```bash
pm2 status              # View status
pm2 logs redweyne       # View logs
pm2 restart redweyne    # Restart app
pm2 reload redweyne     # Zero-downtime reload
pm2 stop redweyne       # Stop app
pm2 monit               # Real-time monitoring
```

---

## Nginx Setup

Nginx will act as a reverse proxy, handle SSL, and serve your application.

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/redweyne
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name redweyne.com www.redweyne.com;

    access_log /var/log/nginx/redweyne_access.log;
    error_log /var/log/nginx/redweyne_error.log;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # Increase timeout for large email uploads
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }
}
```

### 3. Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/redweyne /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

**Important:** Port 5000 should NOT be exposed externally. Only Nginx accesses it internally.

---

## SSL Certificate

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d redweyne.com -d www.redweyne.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 3. Auto-Renewal Setup

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

### 4. Verify HTTPS

Visit `https://redweyne.com` in your browser. You should see a secure connection.

---

## Cloudflare Email Routing

Configure Cloudflare to forward emails to your VPS webhook.

### 1. Configure DNS A Record

In Cloudflare dashboard:

1. Go to **DNS** → **Records**
2. Add/Update A record:
   - **Type**: A
   - **Name**: @ (or redweyne.com)
   - **IPv4 address**: Your VPS IP address
   - **Proxy status**: DNS only (grey cloud) for now
   - **TTL**: Auto

3. Add A record for www:
   - **Type**: A
   - **Name**: www
   - **IPv4 address**: Your VPS IP address
   - **Proxy status**: DNS only
   - **TTL**: Auto

### 2. Setup Cloudflare Email Routing

1. Go to **Email** → **Email Routing**
2. Click **Get Started** (if first time)
3. Click **Add records and enable**
   - Cloudflare will add MX and TXT records automatically
4. Wait for DNS propagation (5-10 minutes)

### 3. Deploy Cloudflare Email Worker

From your local machine:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Navigate to worker directory
cd cloudflare-email-worker

# Login to Cloudflare
wrangler login

# Set webhook URL secret
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/api/inbound

# Set shared secret (must match .env file on VPS)
wrangler secret put INBOUND_SHARED_SECRET
# Enter: (the same secret from your VPS .env file)

# Deploy worker
wrangler deploy
```

### 4. Configure Catch-All Route

In Cloudflare dashboard:

1. Go to **Email** → **Email Routing** → **Routes**
2. Enable **Catch-all address**
3. Set action to **Send to Worker**
4. Select `redweyne-email-worker`
5. Click **Save**

### 5. Test Email Reception

1. Create an alias in your app: `test@redweyne.com`
2. Send an email to `test@redweyne.com` from your personal email
3. Check the dashboard - email should appear within seconds

---

## Security Hardening

### 1. Update `.env` Permissions

```bash
cd /var/www/redweyne
chmod 600 .env
chown nodeapp:nodeapp .env
```

### 2. Disable Root SSH Login (Optional but Recommended)

```bash
sudo nano /etc/ssh/sshd_config
```

Find and change:
```
PermitRootLogin no
PasswordAuthentication no  # If using SSH keys
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Install Fail2Ban (Prevent Brute Force)

```bash
sudo apt install -y fail2ban

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 4. Keep System Updated

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5. Database Backups

```bash
# Create backup script
nano ~/backup-db.sh
```

Add this:
```bash
#!/bin/bash
BACKUP_DIR="/home/nodeapp/backups"
mkdir -p $BACKUP_DIR
cp /var/www/redweyne/emails.db $BACKUP_DIR/emails-$(date +%Y%m%d-%H%M%S).db
# Keep only last 7 days
find $BACKUP_DIR -name "emails-*.db" -mtime +7 -delete
```

Make executable and schedule:
```bash
chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add line:
```
0 2 * * * /home/nodeapp/backup-db.sh
```

---

## Monitoring & Logs

### 1. View Application Logs

```bash
# PM2 logs
pm2 logs redweyne
pm2 logs redweyne --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/redweyne_access.log
sudo tail -f /var/log/nginx/redweyne_error.log
```

### 2. Monitor System Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h  # Disk usage
free -m  # Memory usage
```

### 3. Setup Log Rotation

PM2 logs will grow over time. Install log rotation:

```bash
pm2 install pm2-logrotate
```

Configure:
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Deployment & Updates

### 1. Update Application Code

```bash
cd /var/www/redweyne

# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Rebuild frontend
npm run build

# Reload PM2 (zero downtime)
pm2 reload redweyne
```

### 2. Automated Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash
cd /var/www/redweyne
git pull origin main
npm install --production
npm run build
pm2 reload redweyne
echo "Deployment completed!"
```

Make executable:
```bash
chmod +x deploy.sh
```

---

## Backup & Maintenance

### 1. Scheduled Cleanup

The app has an automatic cleanup endpoint. Schedule it:

```bash
crontab -e
```

Add:
```
0 * * * *  curl -s https://redweyne.com/api/cleanup > /dev/null 2>&1
```

This runs cleanup every hour.

### 2. Database Backup

Already covered in Security Hardening section.

### 3. Full System Backup

Consider using VPS provider's snapshot/backup feature or tools like:
- rsnapshot
- Duplicity
- Restic

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs redweyne

# Common issues:
# 1. Missing dependencies
npm install --production

# 2. Build not created
npm run build

# 3. Port already in use
sudo lsof -i :5000
kill -9 <PID>
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Restart app
pm2 restart redweyne

# Check Nginx logs
sudo tail -f /var/log/nginx/redweyne_error.log
```

### Emails Not Arriving

1. **Check Cloudflare Worker logs:**
   ```bash
   wrangler tail redweyne-email-worker
   ```

2. **Verify webhook endpoint:**
   ```bash
   curl -X POST https://redweyne.com/api/inbound \
     -H "Content-Type: text/plain" \
     -H "X-Inbound-Secret: your-secret" \
     -d "test email"
   ```

3. **Check DNS records:**
   ```bash
   dig MX redweyne.com
   ```

4. **Verify secrets match:**
   - Cloudflare Worker `INBOUND_SHARED_SECRET`
   - VPS `.env` file `INBOUND_SHARED_SECRET`
   - Must be identical

### SSL Certificate Issues

```bash
# Renew manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Restart app
pm2 restart redweyne

# Reduce PM2 instances if needed
pm2 scale redweyne 2
```

---

## Performance Optimization

### 1. Nginx Caching

Add to Nginx config:

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 2. Gzip Compression

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 3. Database Optimization

```bash
# Run VACUUM periodically to optimize SQLite
sqlite3 /var/www/redweyne/emails.db "VACUUM;"
```

---

## Complete Checklist

Use this checklist during deployment:

- [ ] VPS provisioned with Ubuntu 20.04/22.04
- [ ] Non-root user created with sudo access
- [ ] Node.js v20 installed
- [ ] Build tools installed
- [ ] Application code deployed to `/var/www/redweyne`
- [ ] Dependencies installed (`npm install --production`)
- [ ] Frontend built (`npm run build`)
- [ ] `.env` file configured with secrets
- [ ] PM2 installed and configured
- [ ] Application started with PM2
- [ ] PM2 startup script enabled
- [ ] Nginx installed and configured
- [ ] Nginx site enabled and tested
- [ ] Firewall (UFW) configured
- [ ] SSL certificate obtained
- [ ] DNS A records configured
- [ ] Cloudflare Email Routing enabled
- [ ] Cloudflare Worker deployed
- [ ] Worker secrets configured
- [ ] Catch-all route enabled
- [ ] Email reception tested
- [ ] Database backup scheduled
- [ ] Log rotation configured
- [ ] Fail2Ban installed (optional)
- [ ] Auto-updates enabled

---

## Cost Breakdown

- **VPS Hosting**: $5-10/month (DigitalOcean, Linode, Vultr, Hetzner)
- **Domain**: $10-15/year (if not already owned)
- **Cloudflare**: $0 (free tier)
- **SSL Certificate**: $0 (Let's Encrypt)
- **Total**: ~$5-10/month

---

## Recommended VPS Providers

1. **DigitalOcean** - $6/month (1GB RAM, 1 vCPU)
2. **Linode** - $5/month (1GB RAM, 1 vCPU)
3. **Vultr** - $6/month (1GB RAM, 1 vCPU)
4. **Hetzner** - €4.51/month (2GB RAM, 1 vCPU) - Best value

---

## Support & Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Certbot Documentation**: https://certbot.eff.org/
- **Cloudflare Email Routing**: https://developers.cloudflare.com/email-routing/

---

## Next Steps After Deployment

1. Test all functionality thoroughly
2. Create custom aliases and receive emails
3. Monitor logs for any errors
4. Set up monitoring/alerting (e.g., UptimeRobot)
5. Consider adding analytics
6. Customize the UI to match your brand
7. Add additional features as needed

---

Your Redweyne temporary email service is now fully deployed on your own VPS! 🎉
