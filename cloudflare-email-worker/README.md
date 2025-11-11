# Redweyne Email Worker

This Cloudflare Email Worker forwards incoming emails to your Replit application webhook.

## Setup Instructions

### 1. Prerequisites
- Cloudflare account (free)
- Domain `redweyne.com` added to Cloudflare
- Wrangler CLI installed: `npm install -g wrangler`

### 2. Deploy the Worker

```bash
cd cloudflare-email-worker

# Login to Cloudflare
wrangler login

# Set the webhook URL (your Replit app URL)
wrangler secret put WEBHOOK_URL
# Enter: https://your-replit-app.replit.app/api/inbound

# Set the shared secret (must match your Replit app)
wrangler secret put INBOUND_SHARED_SECRET
# Enter: a-secure-random-string-here

# Deploy the worker
wrangler deploy
```

### 3. Configure Email Routing in Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Select `redweyne.com`
2. Navigate to **Email → Email Routing**
3. Click **Get Started** (if first time)
4. Click **Add records and enable** - Cloudflare will auto-configure MX records
5. Go to **Routes** tab
6. Enable **Catch-all address**
7. Set action to **Send to Worker**
8. Select `redweyne-email-worker`
9. Save

### 4. Test

Send an email to any address @redweyne.com (e.g., `test@redweyne.com`)

Check worker logs:
```bash
wrangler tail redweyne-email-worker
```

### Notes

- **Catch-all routing** means ANY email sent to @redweyne.com will be forwarded to your app
- This matches your temp email service design perfectly
- Email Routing is 100% free on Cloudflare
- No storage limits - emails are immediately forwarded to your webhook

### Troubleshooting

If emails aren't arriving:
1. Check DNS records are active in Cloudflare
2. Verify WEBHOOK_URL secret is correct
3. Check worker logs with `wrangler tail`
4. Test webhook endpoint directly with curl
