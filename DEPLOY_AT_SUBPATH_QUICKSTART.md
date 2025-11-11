# Quick Guide: Deploy at redweyne.com/tempmail

This is a streamlined guide for deploying your temporary email service at `redweyne.com/tempmail` alongside your existing application.

## What's Been Done

✅ All code changes are already implemented!  
✅ The app automatically adapts to any base path  
✅ Navigation, routing, and API calls all work correctly under `/tempmail`

## Deployment Steps

### 1. On Your VPS: Deploy the Application

```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Clone to a separate directory
cd /var/www
sudo git clone https://github.com/yourusername/redweyne.git tempmail
sudo chown -R nodeapp:nodeapp /var/www/tempmail
cd tempmail

# Install dependencies
npm install --production

# Build with base path (IMPORTANT!)
BASE_PATH=/tempmail/ npm run build

# Or use the helper script
chmod +x build-subpath.sh
./build-subpath.sh /tempmail
```

### 2. Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=5001
BASE_PATH=/tempmail
INBOUND_SHARED_SECRET=your_secure_secret_here
SMTP_PASS=your_sendgrid_api_key
EOF

# Generate a secure secret
openssl rand -hex 32
# Copy the output and paste it in .env for INBOUND_SHARED_SECRET
```

### 3. Start with PM2

```bash
# Create ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'redweyne-tempmail',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      BASE_PATH: '/tempmail'
    }
  }]
};
EOF

# Start the app
pm2 start ecosystem.config.js --env production
pm2 save
```

### 4. Update Nginx Configuration

```bash
# Edit your existing Nginx config
sudo nano /etc/nginx/sites-available/redweyne
```

Add this **BEFORE** your existing `location /` block:

```nginx
    # Tempmail application
    location /tempmail {
        rewrite ^/tempmail(/.*)$ $1 break;
        
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Update Cloudflare Worker

```bash
cd /path/to/cloudflare-email-worker
wrangler secret put WEBHOOK_URL
# Enter: https://redweyne.com/tempmail/api/inbound
wrangler deploy
```

## Verify Deployment

1. **Check app is running:**
   ```bash
   pm2 status
   ```

2. **Test frontend:**
   ```bash
   curl https://redweyne.com/tempmail
   ```

3. **Test API:**
   ```bash
   curl https://redweyne.com/tempmail/api/aliases
   ```

4. **Test in browser:**
   - Visit: `https://redweyne.com/tempmail`
   - Click "Get Started" - should navigate to `/tempmail/dashboard`
   - Create an alias
   - Send a test email

## Update/Redeploy Later

```bash
cd /var/www/tempmail
git pull origin main
npm install --production
BASE_PATH=/tempmail/ npm run build
pm2 reload redweyne-tempmail
```

## Port Configuration

- **Main app:** Runs on port 3000 (or whatever you're using)
- **Tempmail app:** Runs on port 5001
- **Nginx:** Routes `/tempmail` → port 5001, `/` → your main app port

Both apps coexist perfectly! 🎉

## Troubleshooting

**404 on assets:**
```bash
# Rebuild with correct base path
cd /var/www/tempmail
BASE_PATH=/tempmail/ npm run build
pm2 reload redweyne-tempmail
```

**API calls fail:**
```bash
# Check browser console - URLs should be /tempmail/api/...
# If not, ensure BASE_PATH is set during build
```

**Navigation breaks:**
```bash
# Ensure the code is up to date with base path support
git pull origin main
npm install
BASE_PATH=/tempmail/ npm run build
pm2 reload redweyne-tempmail
```

## Resources

- Full guide: `VPS_SUBPATH_DEPLOYMENT.md`
- Functionality verification: `FUNCTIONALITY_VERIFICATION.md`
- VPS deployment (standalone): `VPS_DEPLOYMENT.md`
