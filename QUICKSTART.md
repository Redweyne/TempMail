# Quick Start: Getting Emails Working

Your backend is ready! But emails can't reach your app yet. Here's what's missing:

## The Problem

Right now, when someone sends an email to `anything@redweyne.com`:
- ❌ Cloudflare receives it (because you own the domain)
- ❌ But Cloudflare doesn't know what to do with it
- ❌ So the email gets rejected/bounced

## How It Will Work (After Setup)

```
Someone sends email to test@redweyne.com
         ↓
Cloudflare Email Routing receives it
         ↓
Cloudflare Email Worker (forwards to webhook)
         ↓
Your Replit app at /api/inbound (receives & stores)
         ↓
User sees email in dashboard ✅
```

## The Solution (3 steps)

### Step 1: Set Your Webhook Secret

In your Replit **Secrets** tab, add:
- Key: `INBOUND_SHARED_SECRET`
- Value: Any random string (like `my-super-secret-key-12345`)

This authenticates Cloudflare's requests to your app.

### Step 2: Deploy the Cloudflare Email Worker

**What does the worker do?**  
The worker acts as a bridge: when Cloudflare receives an email for `@redweyne.com`, it forwards it to your Replit app's webhook.

**Before you start, get your Replit app URL:**
1. Look at the URL in your Replit webview (the browser showing your app)
2. It looks like: `https://4a1cfd8f-0b7c-4d71-8e36-5bbb3d21c1f7-00-abc123.kirk.replit.dev`
3. Copy this entire URL - you'll need it below

---

**Choose ONE option below:**

#### Option A: Using Cloudflare Dashboard (Easiest - No CLI needed)

1. **Open the worker code:**
   - In Replit, open the file `cloudflare-email-worker/index.js`
   - Select all the code (Ctrl+A or Cmd+A) and copy it

2. **Create a new Cloudflare Worker:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click **Workers & Pages** in the left sidebar
   - Click **Create Application** → **Create Worker**
   - Give it a name: `redweyne-email-worker`
   - Click **Deploy** (it will deploy a default worker first)

3. **Replace the worker code:**
   - After deployment, click **Edit Code** button (top right)
   - Delete all the example code in the editor
   - Paste the code you copied from `index.js`
   - Click **Save and Deploy**

4. **Add environment variables (CRITICAL!):**
   - Click the **Settings** tab
   - Scroll down to **Variables and Secrets**
   - Click **Add Variable** and add these TWO variables:
   
   **First variable:**
   - Variable name: `WEBHOOK_URL`
   - Value: `https://YOUR-REPLIT-URL-HERE/api/inbound`
   - Example: `https://4a1cfd8f-0b7c-4d71-8e36-5bbb3d21c1f7-00-abc123.kirk.replit.dev/api/inbound`
   - Click **Encrypt** (to make it a secret)
   - Click **Save**
   
   **Second variable:**
   - Variable name: `INBOUND_SHARED_SECRET`
   - Value: The EXACT same value you used in Step 1
   - Click **Encrypt** (to make it a secret)
   - Click **Save**

5. **Redeploy with new variables:**
   - After adding both variables, click **Deployments** tab
   - Click **View** on the latest deployment
   - Click **Redeploy** button to apply the new variables

✅ Your worker is now deployed!

---

#### Option B: Using Wrangler CLI (For developers comfortable with command line)

**Prerequisites:** You need Node.js and npm installed on your computer (not in Replit).

1. **Download the worker files to your computer:**
   - Download the entire `cloudflare-email-worker` folder from this Replit
   - Or copy the files manually

2. **Open terminal on your computer** and run:
   ```bash
   # Install Wrangler globally (one-time setup)
   npm install -g wrangler
   
   # Navigate to the worker folder
   cd path/to/cloudflare-email-worker
   
   # Login to Cloudflare (opens browser)
   wrangler login
   ```

3. **Configure secrets:**
   ```bash
   # Set webhook URL
   wrangler secret put WEBHOOK_URL
   ```
   When prompted, paste: `https://YOUR-REPLIT-URL/api/inbound`
   
   ```bash
   # Set shared secret (must match Step 1!)
   wrangler secret put INBOUND_SHARED_SECRET
   ```
   When prompted, paste the same value from Step 1

4. **Deploy:**
   ```bash
   wrangler deploy
   ```

✅ Your worker is now deployed!

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
- **In Replit:** Look at the URL bar in the webview panel (where your app is displayed)
- It will be a long URL like: `https://4a1cfd8f-0b7c-4d71-8e36-5bbb3d21c1f7-00-abc123.kirk.replit.dev`
- **If published:** Use your deployment URL like `https://redweyne.replit.app`
- **Important:** The URL must be accessible from the internet for Cloudflare to reach it

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

## Common Mistakes to Avoid

❌ **Secret mismatch:** The `INBOUND_SHARED_SECRET` in Replit must EXACTLY match the one in Cloudflare Worker  
❌ **Missing `/api/inbound`:** Your webhook URL must end with `/api/inbound` - don't forget this!  
❌ **Wrong URL:** Make sure you use your actual Replit webview URL, not an example  
❌ **Variables not encrypted:** In Cloudflare, click "Encrypt" to make them secrets, not plain variables  
❌ **Forgot to redeploy:** After adding variables to the worker, you MUST redeploy for them to take effect  
❌ **Email Routing not configured:** Deploying the worker isn't enough - you must also set up Email Routing in Step 3

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
