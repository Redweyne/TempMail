# Quick Start: Getting Emails Working

Your backend is ready! But emails can't reach your app yet. Here's what's missing:

## The Problem

Right now, when someone sends an email to `anything@redweyne.com`:
- ❌ Cloudflare receives it (because you own the domain)
- ❌ But Cloudflare doesn't know what to do with it
- ❌ So the email gets rejected/bounced

## The Solution (3 steps)

### Step 1: Set Your Webhook Secret

In your Replit **Secrets** tab, add:
- Key: `INBOUND_SHARED_SECRET`
- Value: Any random string (like `my-super-secret-key-12345`)

This authenticates Cloudflare's requests to your app.

### Step 2: Deploy the Cloudflare Email Worker

The worker code is ready in `cloudflare-email-worker/`. You need to deploy it:

**Option A: Using Wrangler CLI (Recommended)**
```bash
# Install wrangler globally
npm install -g wrangler

# Go to the worker directory
cd cloudflare-email-worker

# Login to Cloudflare
wrangler login

# Set your webhook URL secret
wrangler secret put WEBHOOK_URL
# Paste your Replit app URL + /api/inbound
# Example: https://redweyne-something.replit.app/api/inbound

# Set the shared secret (MUST match Step 1)
wrangler secret put INBOUND_SHARED_SECRET
# Paste the same value you used in Step 1

# Deploy the worker
wrangler deploy
```

**Option B: Using Cloudflare Dashboard**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to Workers & Pages → Create Worker
3. Copy/paste the code from `cloudflare-email-worker/index.js`
4. Add environment variables:
   - `WEBHOOK_URL`: Your Replit app URL + `/api/inbound`
   - `INBOUND_SHARED_SECRET`: Same as Step 1
5. Save and deploy

### Step 3: Configure Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain `redweyne.com`
3. Go to **Email** → **Email Routing**
4. Click **Get Started** (if first time)
5. Click **Add records and enable** (Cloudflare auto-configures DNS)
6. Go to the **Routes** tab
7. Enable **Catch-all address**:
   - Toggle it to **Active**
   - For **Action**, select **Send to Worker**
   - Choose your deployed worker from the dropdown
   - Click **Save**

## Testing

1. Send an email to any address `@redweyne.com` (e.g., `test@redweyne.com`)
2. In your Redweyne app dashboard, create an alias with prefix "test"
3. The email should appear within seconds!

## Troubleshooting

**"Where is my Replit app URL?"**
- Look at the webview URL in Replit
- Or use your published domain if you've deployed
- Format: `https://[repl-name].[username].replit.app`

**"Still not receiving emails"**
Check in order:
1. Is `INBOUND_SHARED_SECRET` set in Replit Secrets?
2. Is the Cloudflare Worker deployed? Run `wrangler tail` to see activity
3. Is Email Routing enabled in Cloudflare with catch-all → worker?
4. Did you wait 1-2 minutes for DNS to propagate?

**"How do I check if it's working?"**
Watch your Replit console logs. When an email arrives, you'll see:
```
Email received for test@redweyne.com: [subject]
```

## Current Status

✅ Backend webhook endpoint ready at `/api/inbound`  
✅ Email parsing configured  
✅ Database storage ready  
✅ Frontend dashboard working  
❌ **Cloudflare Worker not deployed yet** ← You need to do this!  
❌ **Email Routing not configured yet** ← You need to do this!  

Once you complete Steps 1-3 above, emails will start flowing!

## Need More Details?

See the full `SETUP.md` file for comprehensive documentation.
