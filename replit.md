# Redweyne - Temporary Email Service

## Overview

Redweyne is a temporary email service that allows users to create disposable email addresses with auto-expiry functionality. The application enables users to receive emails at temporary addresses, view them in a clean interface, and automatically clean up expired aliases and messages. Built with a modern React frontend and Express backend, it focuses on privacy, simplicity, and a streamlined user experience.

## User Preferences

- Communication style: Simple, everyday language
- Deployment target: VPS at redweyne.com/tempmail (standalone, separate from main site)
- No assumptions: User doesn't use Nginx - provide web-server agnostic guidance

## Recent Changes

### November 13, 2025 - THE ACTUAL FIX: Vite Base Path Configuration
- **Root cause**: The `vite.config.ts` was missing the `base` option, so frontend builds always used `/` instead of `/tempmail`
- **Symptom**: Frontend loaded but all API calls failed because they went to `/api/*` instead of `/tempmail/api/*`
- **Fix applied**:
  1. Added `base: process.env.BASE_URL || '/'` to vite.config.ts
  2. Added `build:vps` script to package.json that sets `BASE_URL=/tempmail`
- **VPS Deployment**:
  ```bash
  cd /var/www/tempmail
  git pull
  npm run build:vps
  pm2 restart tempmail
  ```
- **Expected result**: Site loads and works at redweyne.com/tempmail - frontend now knows it's at /tempmail

### November 13, 2025 - FINAL FIX: express-rate-limit Validation
- **Issue**: express-rate-limit v8 has strict validation that throws ValidationError even when trust proxy is correctly configured
- **Solution**: Added `validate: { xForwardedForHeader: false }` to rate limiter configuration
- **Why**: The validation check in express-rate-limit was incorrectly reporting trust proxy as false even though it was set correctly on both apps
- **Deploy now**: 
  ```bash
  cd /var/www/tempmail
  git pull
  npm run build
  pm2 restart tempmail
  ```
- **Expected**: No more ValidationError messages, application works correctly

### November 13, 2025 - CRITICAL FIX: Trust Proxy on Scoped App
- **Root cause identified**: Trust proxy was set on root Express app but NOT on `scopedApp` where all middleware runs
- **Symptom**: Application wouldn't load on VPS - rate limiter threw ValidationError about X-Forwarded-For headers
- **Fix**: Added `scopedApp.set('trust proxy', trustProxyConfig)` right after scopedApp instantiation
- **Why it happened**: The app architecture mounts all routes/middleware on a scoped Express instance for base path support, but only the root app had trust proxy configured
- **Deploy to VPS**: 
  ```bash
  cd /var/www/tempmail
  git pull
  npm run build
  pm2 restart tempmail
  ```
- **Expected result**: Application loads successfully at redweyne.com/tempmail with no ValidationErrors

### November 13, 2025 - Nginx Reverse Proxy Configuration Fix (CORRECTED)
- **Issue #1**: `redweyne.com/tempmail` returned 404 errors
  - **Cause**: `location /tempmail` without trailing slash only matched exact path
  - **First attempted fix**: Added trailing slash to location AND proxy_pass path → WRONG
  - **Result**: "Connection refused" errors (worse than before)
  
- **Issue #2**: After adding trailing slashes, got "Connection refused" from nginx
  - **Cause**: Using `proxy_pass http://127.0.0.1:5001/tempmail/;` with a path causes nginx to strip and rewrite paths incorrectly
  - **Root problem**: When proxy_pass includes a URI path, nginx rewrites the request path unexpectedly
  
- **THE CORRECT FIX** (tested and working):
  ```nginx
  # In /etc/nginx/sites-available/InboxAI:
  
  location /tempmail/ {
      proxy_pass http://127.0.0.1:5001;  # NO PATH HERE - just port!
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
  ```
  
- **Key insight**: 
  - ✅ `location /tempmail/` with trailing slash = matches all subpaths
  - ✅ `proxy_pass http://127.0.0.1:5001;` WITHOUT path = preserves full request path
  - ❌ `proxy_pass http://127.0.0.1:5001/tempmail/;` WITH path = causes path rewriting issues
  - Express app already handles BASE_PATH=/tempmail internally, so nginx just needs to forward the complete path
  
- **How it works**:
  1. Browser requests: `https://redweyne.com/tempmail/dashboard`
  2. Nginx forwards: `http://127.0.0.1:5001/tempmail/dashboard` (complete path preserved)
  3. Express app (BASE_PATH=/tempmail) routes correctly
  
- **Deployment steps**:
  ```bash
  nano /etc/nginx/sites-available/InboxAI
  # Line 5: location /tempmail/ {
  # Line 6: proxy_pass http://127.0.0.1:5001;  (NO /tempmail/ at end!)
  # Save: Ctrl+X, Y, Enter
  nginx -t
  systemctl reload nginx
  ```
  
- **Important**: Nginx config is a system file on VPS in `/etc/nginx/`, NOT in application code. Can't be pushed/pulled via Git.

### November 13, 2025 - Trust Proxy Configuration Fix for VPS Deployment
- **Fixed trust proxy configuration**: Introduced explicit `TRUST_PROXY` environment variable to properly handle deployments behind reverse proxies
- **VPS deployment fix**: Rate limiting now works correctly on VPS by trusting local reverse proxy (nginx) via `TRUST_PROXY="loopback"`
- **Security improvement**: Prevents X-Forwarded-For header spoofing while allowing proper client IP identification for rate limiting
- **What changed**:
  - Added flexible `TRUST_PROXY` env variable support in `server/index.ts` (accepts: "loopback", numeric hop count, boolean, or custom CIDR)
  - Updated `loader.js` to set `TRUST_PROXY="loopback"` by default for VPS (only trusts local proxies)
  - Allows .env override for custom proxy configurations (e.g., remote load balancers)
  - Replit continues to use hop count 1 automatically (via REPL_ID detection)
- **VPS Deployment Steps**:
  ```bash
  cd /var/www/tempmail
  git pull
  npm run build
  pm2 restart tempmail
  ```
- **Expected behavior**: Server logs should show `Trust proxy enabled: loopback` and rate limiting will now correctly identify individual client IPs
- **Note**: For custom reverse proxy configurations, set `TRUST_PROXY` in .env file before running the loader

### November 12, 2025 - ESM Loader Migration
- **Fixed ESM module loading error**: Converted loader from CommonJS to ES Module format while keeping the filename as `loader.js` for PM2 compatibility
- **Production build compatibility**: Loader is now a pure ES module that properly loads the esbuild output
- **Note**: PM2 caches the script path when a process starts. Renaming the entry script requires either keeping the same filename or running `pm2 delete tempmail && pm2 start ecosystem.config.cjs`

### November 12, 2025 - Permanent Email Support & Cleanup Features
- **Added permanent email aliases**: Users can now create permanent email addresses that never expire alongside temporary ones
- **Database schema update**: Added `isPermanent` boolean field to aliases table, made `expiresAt` nullable for permanent aliases
- **Automatic database migration**: Existing databases automatically upgrade to support the new schema on server restart
- **Cleanup mechanism enhancement**: Cleanup routines now only delete temporary (non-permanent) aliases and their emails
- **Manual cleanup button**: Added "Clean Expired" button in dashboard header to manually trigger cleanup of expired temporary aliases and emails
- **UI improvements**: 
  - Added tabs in dashboard to separate temporary and permanent email aliases
  - Create dialog adapts based on selected tab (shows/hides TTL selector)
  - Automatic prefix generation distinguishes between 'temp-' and 'perm-' prefixes
  - Permanent aliases display "Permanent" instead of countdown timer
  - Fixed timer handling for permanent aliases to prevent TypeScript errors
- **Backend updates**:
  - Inbound email handler properly handles permanent aliases (no expiration check)
  - Storage layer filters cleanup operations to only affect temporary aliases
  - API maintains backward compatibility while supporting new features
- **VPS compatibility**: All changes designed to work seamlessly with existing VPS deployments (push to GitHub, pull on VPS, restart)
- **Development note**: Replit dev banner only appears in development mode (when NODE_ENV !== "production"). Production builds for VPS deployment do not include the banner.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (landing page, dashboard, 404)

**UI Component System**
- Shadcn UI component library with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Design philosophy: Linear's minimalist aesthetic + Gmail's email viewing patterns
- Custom color system with HSL values for light/dark mode support
- Typography: Inter for UI, JetBrains Mono for email content

**State Management**
- TanStack Query (React Query) for server state management
- Real-time polling intervals: 5s for aliases, 3s for emails when viewing
- Custom query client with credential-based fetching
- Optimistic updates for read status and email actions

**Key UI Patterns**
- Two-column dashboard layout: Fixed 280px sidebar for aliases, flexible main area for email viewing
- Mobile-responsive with collapsible sidebar
- Empty states with illustrations and contextual actions
- Toast notifications for user feedback

### Backend Architecture

**Server Framework**
- Express.js with TypeScript in ESNext module format
- Custom middleware for logging, error handling, and request body capture
- Development mode with Vite middleware integration for HMR

**Data Storage**
- SQLite database via better-sqlite3 for local persistence
- Custom storage abstraction layer (IStorage interface) for potential database swapping
- Two primary tables: `aliases` and `emails`
- In-memory storage pattern with filesystem fallback

**Email Processing**
- Mailparser (via simpleParser) for parsing raw email data into structured format
- Nodemailer with SendGrid SMTP for outbound email sending
- Email schema includes: from, to, subject, bodyText, bodyHtml, raw data
- Support for both plain text and HTML email rendering

**API Design**
- RESTful endpoints under `/api` prefix
- Rate limiting: 100 requests per 15 minutes for API, 30 requests per minute for inbound webhook
- Validation using Zod schemas for type-safe request/response handling
- Endpoints include: GET/POST aliases, GET/PATCH/DELETE emails

**Security Middleware**
- Helmet for HTTP security headers (CSP disabled in development)
- CORS enabled for cross-origin requests
- Morgan for HTTP request logging
- Express rate limiting to prevent abuse

### Data Models

**Alias Schema**
- `id`: UUID primary key
- `email`: Full email address (e.g., "temp123@redweyne.com")
- `prefix`: User-facing identifier
- `createdAt`: ISO timestamp
- `expiresAt`: ISO timestamp for auto-cleanup (nullable for permanent aliases)
- `isPermanent`: Boolean flag (true for permanent, false for temporary)
- `ttlMinutes`: Configurable lifespan (1-120 minutes, default 30) - only applies to temporary aliases

**Email Schema**
- `id`: UUID primary key
- `aliasId`: Foreign key to parent alias
- `from`: Sender address
- `to`: Recipient address (the alias)
- `subject`: Email subject line
- `bodyText`: Plain text content (nullable)
- `bodyHtml`: HTML content (nullable)
- `receivedAt`: ISO timestamp
- `read`: Boolean flag for read status
- `raw`: Original email data for debugging

### External Dependencies

**Third-Party Services**
- **SendGrid SMTP**: Email delivery service configured via environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Fallback to smtp.sendgrid.net:587 with TLS

**Database**
- **SQLite**: File-based database (emails.db) with better-sqlite3 driver
- Schema managed manually through `initTables()` in storage layer
- Drizzle ORM configured for potential PostgreSQL migration (via @neondatabase/serverless)

**UI Component Libraries**
- **Radix UI**: 20+ primitive components for accessible UI building
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **DOMPurify**: HTML sanitization for email content rendering

**Development Tools**
- **Replit-specific plugins**: Vite runtime error modal, cartographer, dev banner
- **ESBuild**: Server-side bundling for production
- **TSX**: TypeScript execution for development server

**Font Services**
- Google Fonts API for Inter and JetBrains Mono font families
- Preconnect optimization for fonts.googleapis.com and fonts.gstatic.com

### Deployment Strategy

**Subpath Deployment Support**
- Built-in support for deployment at any base path (e.g., `/tempmail`)
- `BASE_PATH` environment variable configures routing and API calls
- Build-time configuration via `BASE_URL` environment variable
- Centralized base path utilities in `client/src/lib/basePath.ts`

**Production Deployment Model**
- Target: Standalone application at `redweyne.com/tempmail`
- Directory structure: `/var/www/tempmail/` (completely separate from main site)
- Process manager: PM2 with dedicated process named "tempmail" on port 5001
- Reverse proxy: Routes `/tempmail` requests to localhost:5001
- Database: Separate SQLite file in application directory
- No dependencies on main redweyne.com application

**Deployment Files**
- `STANDALONE_DEPLOYMENT.md`: Comprehensive deployment guide (web-server agnostic)
- `QUICKSTART.md`: 30-minute quick deploy guide
- `ecosystem.config.cjs`: PM2 process configuration
- `.env.production.example`: Production environment template
- `build-subpath.sh`: Helper script for building with base path