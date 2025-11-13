# VPS Deployment Notes

## 🚨 CRITICAL FIX #2 - November 13, 2025: Nginx Reverse Proxy Configuration

### Issue
After deploying with trust proxy fix, `redweyne.com/tempmail` still doesn't load - shows 404 errors.

### Root Cause
Nginx `location /tempmail` block is missing trailing slashes:
- `location /tempmail` only matches the EXACT path `/tempmail`
- Requests to `/tempmail/`, `/tempmail/dashboard`, `/tempmail/api/*` don't match → 404

### Solution
Add trailing slashes to nginx configuration:

**Edit `/etc/nginx/sites-available/InboxAI` on VPS:**

```nginx
# BEFORE (broken):
location /tempmail {
    proxy_pass http://127.0.0.1:5001;
    ...
}

# AFTER (working):
location /tempmail/ {
    proxy_pass http://127.0.0.1:5001/tempmail/;
    ...
}
```

### Exact Steps to Fix

```bash
# 1. Edit nginx config
nano /etc/nginx/sites-available/InboxAI

# 2. Find the tempmail location block (around line 5)
# 3. Change line 5: location /tempmail {  →  location /tempmail/ {
# 4. Change line 6: proxy_pass http://127.0.0.1:5001;  →  proxy_pass http://127.0.0.1:5001/tempmail/;
# 5. Save: Ctrl+X, Y, Enter

# 6. Test nginx config
nginx -t

# 7. Reload nginx
systemctl reload nginx

# 8. Test in browser
# Visit: https://redweyne.com/tempmail/
```

### Why This Works
- `location /tempmail/` with trailing slash matches all paths under `/tempmail/`
- `proxy_pass http://127.0.0.1:5001/tempmail/` preserves the full path when forwarding to Express
- Now all routes work: `/tempmail/`, `/tempmail/dashboard`, `/tempmail/api/*`, etc.

### Important Notes
- **Nginx config is a system file** - lives in `/etc/nginx/` on VPS, NOT in application code
- Cannot be pushed/pulled via Git - must edit directly on server (one-time setup)
- See `NGINX_FIX_GUIDE.md` for quick reference
- See `STANDALONE_DEPLOYMENT.md` for complete nginx configuration example

---

## 🚨 CRITICAL FIX #1 - November 13, 2025: Trust Proxy Configuration

### Issue
The previous trust proxy configuration was breaking VPS deployments behind reverse proxies (nginx, caddy, etc.):
- Trust proxy was ONLY enabled in Replit (when REPL_ID exists)
- VPS deployments behind reverse proxies had trust proxy disabled
- This caused Express to reject X-Forwarded-For headers
- Rate limiting couldn't identify real client IPs (all requests appeared from proxy IP)
- Resulted in warnings and ineffective rate limiting

### Solution
Introduced explicit `TRUST_PROXY` environment variable for secure, flexible proxy configuration:

**Files Modified:**
- `server/index.ts` - Flexible trust proxy configuration based on TRUST_PROXY env var
- `loader.js` - Sets TRUST_PROXY="loopback" by default for VPS deployments

### Deployment Steps for This Fix

```bash
# 1. Pull latest changes
cd /var/www/tempmail
git pull origin main

# 2. Rebuild the application
npm run build

# 3. Restart PM2
pm2 restart tempmail

# 4. Verify logs show: "Trust proxy enabled: loopback"
pm2 logs tempmail | grep "Trust proxy"
```

### Expected Behavior After Fix
- Server logs will show: `Trust proxy enabled: loopback`
- No more X-Forwarded-For warnings
- Rate limiting will correctly identify individual client IPs
- Each visitor gets their own rate limit quota instead of sharing the proxy's IP

### Trust Proxy Configuration Options

The `TRUST_PROXY` environment variable accepts:
- `"loopback"` - Trust only local reverse proxies (nginx on same machine) **[Recommended for VPS]**
- `1` - Trust first proxy in chain (Replit default)
- `true` - Trust all proxies (⚠️ not recommended - security risk)
- `false` or unset - No proxy trust (direct deployment only)
- Custom CIDR notation for specific proxy IPs

### Advanced Configuration
If you need to override the default `loopback` setting (e.g., remote load balancer), add to your `.env` file:

```env
TRUST_PROXY=1  # or another value based on your proxy setup
```

The loader.js respects .env values and only sets the default when TRUST_PROXY is not already defined.

---

## Summary of Changes (November 12, 2025)

This document tracks all modifications made to support the user requirements:

### 1. ✅ Manual Cleanup Button for Expired Emails
**Location:** `client/src/pages/dashboard.tsx`

Added a "Clean Expired" button in the dashboard header that allows users to manually delete expired temporary aliases and their associated emails.

**Implementation Details:**
- Button calls `/api/cleanup` endpoint (GET request)
- Uses React Query mutation for state management
- Shows toast notifications with count of deleted items
- Automatically refreshes alias list after cleanup
- Disabled state while cleanup is in progress
- **Backend Fix:** Exempted `/api/cleanup` from rate limiting in `server/routes.ts` to prevent 429 errors

**API Response:**
```json
{
  "message": "Cleanup completed",
  "deletedAliases": 5,
  "deletedEmails": 12
}
```

### 2. ✅ Replit Logo Removal
**File:** `vite.config.ts` (protected, cannot edit)

**Status:** The Replit dev banner only appears in development mode when:
- `NODE_ENV !== "production"` 
- `REPL_ID` is defined

**For VPS Deployment:**
- When you build for production using `npm run build`, the banner plugin is NOT included
- Your production build at `redweyne.com/tempmail` will NOT show the Replit logo
- This is automatic - no code changes needed

**Verification:**
- Dev mode (Replit): Logo appears (expected)
- Production mode (VPS): Logo does NOT appear (after `npm run build`)

### 3. ✅ Permanent Email Support (Already Implemented)
**Files Modified:**
- `shared/schema.ts` - Added `isPermanent` field to Alias type
- `server/storage.ts` - Database migration, permanent alias handling
- `client/src/pages/dashboard.tsx` - Tabs for temporary vs permanent
- `client/src/components/alias-list.tsx` - Fixed timer for permanent aliases
- `client/src/components/create-alias-dialog.tsx` - Conditional UI based on type

**How It Works:**
- **Temporary emails:** Auto-expire based on TTL, deleted completely from database
- **Permanent emails:** Never expire, stored indefinitely with all received emails
- Users can switch between tabs to view each type
- Create dialog shows/hides TTL selector based on selected tab
- Cleanup operations ONLY affect temporary aliases (permanent are preserved)

## Database Schema

**Aliases Table:**
```sql
CREATE TABLE aliases (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT,              -- NULL for permanent aliases
  isPermanent INTEGER NOT NULL DEFAULT 0  -- 1 for permanent, 0 for temporary
)
```

**Migration:** Runs automatically on server start if `isPermanent` column doesn't exist

## VPS Deployment Workflow

### Step 1: Push Changes to GitHub
```bash
git add .
git commit -m "Add manual cleanup button, permanent email support, fix rate limiting"
git push origin main
```

### Step 2: Pull on VPS
```bash
cd /var/www/tempmail
git pull origin main
```

### Step 3: Install Dependencies (if needed)
```bash
npm install
```

### Step 4: Build for Production
```bash
BASE_URL=/tempmail npm run build
```

### Step 5: Restart PM2
```bash
pm2 restart tempmail
```

### Step 6: Verify
- Check that the application is running: `pm2 status`
- Visit `https://redweyne.com/tempmail`
- Verify:
  - ✅ No Replit logo visible
  - ✅ "Clean Expired" button in dashboard header
  - ✅ Temporary and Permanent tabs working
  - ✅ Cleanup button successfully deletes expired items

## Files Changed

### Backend Files
1. **server/routes.ts**
   - Exempted `/api/cleanup` from rate limiting
   - Cleanup endpoint returns structured response

2. **server/storage.ts**
   - Added automatic database migration for `isPermanent` column
   - Modified cleanup methods to only delete temporary aliases
   - Fixed prefix generation for permanent vs temporary

### Frontend Files
1. **client/src/pages/dashboard.tsx**
   - Added cleanup mutation with toast notifications
   - Added "Clean Expired" button to header
   - Import `Trash2` icon and `useMutation`, `useQueryClient`

2. **client/src/components/alias-list.tsx**
   - Fixed timer to handle permanent aliases (null check for `expiresAt`)
   - Display "Permanent" instead of countdown for permanent aliases
   - Fixed `isExpiringSoon` to return false for permanent aliases

3. **client/src/components/create-alias-dialog.tsx**
   - Already fully implemented (no changes needed)
   - Conditional UI based on `isPermanent` prop

### Documentation Files
1. **replit.md**
   - Updated "Recent Changes" section
   - Documented all three user requirements
   - Added VPS compatibility notes

2. **VPS_DEPLOYMENT_NOTES.md** (this file)
   - Comprehensive deployment guide
   - Step-by-step instructions for future deployments

## Troubleshooting

### Issue: Cleanup Button Says "Cleanup Failed"
**Cause:** Rate limiting blocking the `/api/cleanup` endpoint (429 status)
**Solution:** Fixed by exempting cleanup endpoint from rate limiter in `server/routes.ts`

### Issue: Timer Shows "NaN" for Permanent Aliases
**Cause:** Trying to create Date object from null `expiresAt`
**Solution:** Added null checks in `alias-list.tsx` to show "Permanent" instead

### Issue: Replit Logo Still Visible on VPS
**Cause:** Using development build instead of production build
**Solution:** Always use `npm run build` for production deployments

## Environment Variables

No new environment variables required for these features. Existing variables:
- `BASE_PATH=/tempmail` (for VPS deployment)
- `NODE_ENV=production` (automatically disables dev banner)

## Database Compatibility

**Automatic Migration:** The database schema migration runs automatically when:
- Aliases table exists
- `isPermanent` column doesn't exist
- Server starts up

**No Manual SQL Required:** Just restart the server after pulling code

## Testing Checklist

Before deploying to VPS, verify in development:
- [ ] Create temporary alias - should show countdown timer
- [ ] Create permanent alias - should show "Permanent" label
- [ ] Switch between tabs - aliases filter correctly
- [ ] Click "Clean Expired" - should show success toast with counts
- [ ] Expired temporary aliases deleted, permanent ones preserved

## Future Maintenance

When future versions need to modify this functionality:

1. **Cleanup Logic:** See `server/storage.ts` methods:
   - `deleteExpiredAliases()` - Only deletes temporary (isPermanent = 0)
   - `deleteExpiredEmails()` - Only deletes emails from expired temporary aliases

2. **UI State:** See `client/src/pages/dashboard.tsx`:
   - `activeTab` state manages temporary vs permanent view
   - `cleanupMutation` handles manual cleanup

3. **Timer Logic:** See `client/src/components/alias-list.tsx`:
   - Must check `alias.isPermanent` before accessing `alias.expiresAt`
   - Permanent aliases return early from timer logic

## Summary

All three requirements have been successfully implemented:
1. ✅ Manual cleanup button working (rate limiting issue fixed)
2. ✅ Replit logo documented (only in dev, not production)
3. ✅ Permanent emails fully functional (verified and tested)

Changes are VPS-compatible. Simply push to GitHub, pull on VPS, build, and restart PM2.
