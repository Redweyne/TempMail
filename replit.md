# Redweyne - Temporary Email Service

## Overview

Redweyne is a temporary email service that allows users to create disposable email addresses with auto-expiry functionality. The application enables users to receive emails at temporary addresses, view them in a clean interface, and automatically clean up expired aliases and messages. Built with a modern React frontend and Express backend, it focuses on privacy, simplicity, and a streamlined user experience.

## User Preferences

- Communication style: Simple, everyday language
- Deployment target: VPS at redweyne.com/tempmail (standalone, separate from main site)
- No assumptions: User doesn't use Nginx - provide web-server agnostic guidance

## Recent Changes

### November 12, 2025 - Critical VPS Deployment Fix: ESM Loader & Trust Proxy
- **Fixed ESM module loading error**: Converted loader from CommonJS (.cjs) to ES Module (.mjs) for proper ES module compatibility
- **Fixed trust proxy bypass vulnerability**: Trust proxy now ONLY enabled in Replit environment (when REPL_ID exists), disabled on VPS
- **Production build compatibility**: Loader is now a pure ES module that properly loads the esbuild output
- **Security improvement**: Eliminates IP-based rate limiting bypass on VPS deployments
- **What changed**: 
  - Renamed `loader.cjs` → `loader.mjs` and converted to ES module syntax
  - Updated `ecosystem.config.cjs` to point to `loader.mjs`
  - Removed trust proxy on VPS to prevent security warnings and rate limit bypass
- **VPS Deployment Steps**:
  ```bash
  cd /var/www/tempmail
  git pull
  npm run build
  pm2 restart tempmail
  ```

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