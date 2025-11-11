# Redweyne Email Service - Setup Guide

This guide will help you set up the complete email receiving infrastructure for your temporary email service using your domain `redweyne.com`.

## Overview

The system works as follows:
1. Emails sent to `*@redweyne.com` are received by Cloudflare Email Routing (free)
2. Cloudflare Email Worker forwards the raw email to your Replit webhook
3. Your application processes the email and stores it in the database
4. Users can view received emails in the dashboard

## Prerequisites

- Domain `redweyne.com` added to Cloudflare (with Cloudflare as nameserver)
- Cloudflare account (free tier works)
- Node.js and Wrangler CLI installed locally

## Step 1: Configure Environment Variables

1. In your Replit project, go to the **Secrets** tab
2. Add the following secret:
   - Key: `INBOUND_SHARED_SECRET`
   - Value: Generate a secure random string (e.g., use `openssl rand -hex 32`)

This secret will be used to authenticate webhook requests from Cloudflare.

## Step 2: Deploy the Cloudflare Email Worker

### Install Wrangler CLI

```bash
npm install -g wrangler
```

### Deploy the Worker

1. Navigate to the `cloudflare-email-worker` directory in this project
2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Set the webhook URL secret (use your Replit app URL):
   ```bash
   wrangler secret put WEBHOOK_URL
   ```
   Enter: `https://your-replit-app.replit.app/api/inbound`
   
   ℹ️ **Finding your Replit app URL:**
   - Look at the webview URL in Replit
   - Or check the deployment URL if published
   - Format: `https://[repl-name].[username].replit.app`

4. Set the shared secret (must match your Replit secret):
   ```bash
   wrangler secret put INBOUND_SHARED_SECRET
   ```
   Enter the same value you set in Replit Secrets

5. Deploy the worker:
   ```bash
   wrangler deploy
   ```

## Step 3: Configure Cloudflare Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain `redweyne.com`
3. Navigate to **Email** → **Email Routing**
4. Click **Get Started** (if first time using Email Routing)
5. Click **Add records and enable**
   - Cloudflare will automatically configure the required MX and TXT DNS records
   - This may take a few minutes to propagate

6. Go to the **Routes** tab
7. Enable **Catch-all address**:
   - Toggle **Catch-all address** to **Active**
   - For **Action**, select **Send to Worker**
   - Choose `redweyne-email-worker` from the dropdown
   - Click **Save**

⚠️ **Important Notes:**
- Catch-all routing means **ANY** email sent to `@redweyne.com` will be forwarded to your app
- This is perfect for a temporary email service where users create random addresses
- Email Routing will override existing MX records - cannot run alongside Gmail/Google Workspace on the same domain

## Step 4: Test the Setup

### Test Email Reception

1. Send a test email to any address `@redweyne.com` (e.g., `test@redweyne.com`)
2. In the Redweyne app, create an alias with prefix "test"
3. Send an email from your personal email to `test@redweyne.com`
4. Check the dashboard - the email should appear within seconds

### Verify Worker Logs

Check if the worker is processing emails:
```bash
wrangler tail redweyne-email-worker
```

### Check Application Logs

In Replit, check the console logs for messages like:
```
Email received for test@redweyne.com: [subject]
```

## Troubleshooting

### Emails Not Arriving

1. **Check DNS propagation:**
   ```bash
   dig MX redweyne.com
   ```
   Should show Cloudflare MX records

2. **Verify worker deployment:**
   ```bash
   wrangler tail redweyne-email-worker
   ```
   Send a test email and watch for activity

3. **Check webhook endpoint:**
   Test the endpoint directly:
   ```bash
   curl -X POST https://your-app.replit.app/api/inbound \
     -H "Content-Type: text/plain" \
     -H "X-Inbound-Secret: your-secret-here" \
     -d "From: test@example.com..."
   ```

4. **Verify secrets match:**
   - Ensure `INBOUND_SHARED_SECRET` is identical in both:
     - Replit Secrets
     - Cloudflare Worker (set via `wrangler secret`)

### Rate Limiting Issues

If you see rate limiting errors:
- The API is limited to 100 requests per 15 minutes
- The inbound webhook is limited to 30 requests per minute
- These limits prevent abuse and are suitable for normal usage

### Worker Errors

Check worker logs for detailed error messages:
```bash
wrangler tail redweyne-email-worker
```

Common issues:
- `WEBHOOK_URL not configured` → Run `wrangler secret put WEBHOOK_URL`
- `Webhook delivery failed` → Check your Replit app URL is correct and accessible
- `401 Unauthorized` → Secrets don't match between Cloudflare and Replit

## Architecture Details

### Email Flow

```
Sender → redweyne.com (Cloudflare MX) 
       → Cloudflare Email Worker 
       → POST /api/inbound (your Replit app)
       → Parse email with mailparser
       → Store in SQLite database
       → User sees in dashboard
```

### Security

- **Shared Secret Authentication:** Prevents unauthorized webhook calls
- **Rate Limiting:** Protects against abuse
- **Trust Proxy:** Properly handles IP addresses behind Replit's reverse proxy
- **Helmet.js:** Adds security headers

### Data Storage

- Emails stored in SQLite (`emails.db`)
- Aliases have configurable TTL (1-120 minutes, default 30)
- Auto-cleanup removes expired aliases and emails
- Raw email stored as base64 for debugging

## Optional: Sending Emails (Coming Soon)

To enable sending emails (e.g., for replies), you'll need to configure SMTP:

1. Sign up for [SendGrid](https://sendgrid.com) (free tier available)
2. Create an API key
3. Add to Replit Secrets:
   - `SMTP_PASS`: Your SendGrid API key
   - `FROM_EMAIL`: noreply@redweyne.com (or your preferred sender)

## Deployment to Production

When ready to deploy:

1. Click **Publish** in Replit to deploy your app
2. Update the Cloudflare Worker `WEBHOOK_URL` to your production URL:
   ```bash
   wrangler secret put WEBHOOK_URL
   ```
   Enter your published URL: `https://redweyne.com/api/inbound`

3. Verify everything works in production

## Cost

- **Cloudflare Email Routing:** 100% FREE
- **Cloudflare Workers:** FREE (100k requests/day included)
- **Replit Hosting:** Included in your Replit plan
- **Domain:** Your existing domain cost only

Total additional cost: **$0** ✅

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review worker logs: `wrangler tail redweyne-email-worker`
3. Check Replit console logs
4. Verify all secrets are configured correctly

## Next Steps

Once email receiving is working:
- Test with multiple aliases
- Try different TTL settings
- Monitor email reception and cleanup
- Consider adding email sending functionality
- Customize the UI to match your brand
