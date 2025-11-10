# Redweyne - Temporary Email Service

## Overview

Redweyne is a temporary email service that allows users to create disposable email addresses with auto-expiry functionality. The application enables users to receive emails at temporary addresses, view them in a clean interface, and automatically clean up expired aliases and messages. Built with a modern React frontend and Express backend, it focuses on privacy, simplicity, and a streamlined user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- `expiresAt`: ISO timestamp for auto-cleanup
- `ttlMinutes`: Configurable lifespan (1-120 minutes, default 30)

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