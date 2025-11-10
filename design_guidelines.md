# Redweyne.com Email Service - Design Guidelines

## Design Approach
**Hybrid Reference System**: Linear's minimalist productivity aesthetic + Gmail's email viewing patterns + Temp mail service simplicity. Clean, function-first interface that makes email management effortless.

## Core Design Principles
1. **Clarity Over Decoration**: Every element serves the email workflow
2. **Instant Comprehension**: Users understand the interface within 3 seconds
3. **Spatial Efficiency**: Maximize content visibility, minimize chrome
4. **Status Transparency**: Clear visual feedback for email states (new, read, expired)

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 6, 8, 12, 16** (e.g., p-4, m-8, gap-6)
- Tight spacing: 2-4 for related elements
- Standard spacing: 6-8 for component padding
- Section spacing: 12-16 for major divisions

### Grid Structure
**Two-Column Dashboard Layout**:
- Left sidebar: 280px fixed width (alias list, controls)
- Right main: flex-1 (email viewer, message list)
- Mobile: Stack vertically with collapsible sidebar

**Container Widths**:
- Dashboard container: w-full with max-w-screen-2xl
- Email content: max-w-3xl for readability
- Forms: max-w-md centered

---

## Typography Hierarchy

**Font Stack**: Inter (primary), SF Mono (code/emails)

**Scale**:
- Page titles: text-3xl font-bold
- Section headers: text-xl font-semibold
- Email subjects: text-base font-medium
- Body text: text-sm
- Metadata/timestamps: text-xs
- Monospace (emails): text-sm font-mono

**Line Heights**: 
- Headers: leading-tight
- Body text: leading-relaxed
- Code/emails: leading-normal

---

## Component Library

### Navigation
**Top Bar** (h-16):
- Logo/brand left (text-xl font-bold)
- New Alias button (primary CTA, right aligned)
- Status indicator (connection state)

### Sidebar (Left Panel)
**Alias Manager**:
- Search/filter input (sticky top, h-10)
- Scrollable alias list
- Each alias card shows:
  - Email address (font-mono, text-sm)
  - Unread count badge (if >0)
  - Expiry timer (text-xs, countdown format)
  - Quick copy button
- Create New Alias button (full-width, bottom of list)

### Main Content Area

**Email List View** (when alias selected):
- Table-based layout with columns:
  - From (30% width, truncate with ellipsis)
  - Subject (50% width, font-medium)
  - Time (20% width, text-xs, relative format)
- Row height: h-14
- Hover state: subtle background shift
- Unread emails: font-semibold treatment
- Empty state: centered illustration + message

**Email Detail View** (when message clicked):
- Header block (sticky, border-b):
  - Subject (text-2xl, font-semibold)
  - From/To/Date metadata (text-sm, grid layout)
  - Action buttons (Delete, Raw View, Forward)
- Body container:
  - Sanitized HTML rendering with max-w-3xl
  - Iframe for HTML emails (sandboxed)
  - Plaintext with preserved formatting
- Attachment section (if present):
  - Grid of attachment cards (icon, filename, size)
  - Download links

### Forms

**Create Alias Modal**:
- Overlay with backdrop blur
- Centered card (max-w-md)
- Form fields with clear labels:
  - Prefix input (optional, with @redweyne.com suffix)
  - TTL dropdown (15min, 30min, 1hr, 2hr)
  - Auto-generate checkbox
- Primary action: "Create Alias"
- Generated alias shown immediately with copy button

**Input Styling**:
- Height: h-11
- Border: border rounded-lg
- Focus: ring treatment
- Label: text-sm font-medium, mb-2

### Status Elements

**Badges**:
- Unread count: pill shape, px-2 py-1, text-xs
- Expiry warning: amber treatment when <5min remaining
- Connection status: dot indicator + text

**Loading States**:
- Skeleton screens for email list
- Spinner for individual messages
- Progress indicators for actions

---

## Page Structure

### Dashboard (Main Application)
Full viewport height with no scroll on outer container:
- Fixed top nav (h-16)
- Flex row layout (remaining height):
  - Left sidebar (scrollable independently)
  - Right content (scrollable independently)

### Landing Page (Marketing, if needed)
**Hero Section** (h-screen with max-h-[800px]):
- Centered content with max-w-4xl
- Headline: "Temporary Email Addresses in Seconds"
- Subheadline explaining use case
- Primary CTA: "Get Started" (large, prominent)
- Hero image: Abstract email/inbox illustration (right side, 40% width)

**Features Grid** (3 columns desktop, 1 mobile):
- Instant Setup
- Auto-Expiry
- SendGrid Integration
Each with icon, title (text-lg font-semibold), description

**How It Works** (3-step process):
Horizontal timeline with numbered steps

**CTA Section**:
- Centered, py-20
- Direct link to app dashboard

---

## Images

**Hero Image**: 
- Placement: Right 40% of hero section
- Description: Modern, minimal 3D illustration of an inbox or envelope with floating email icons, soft gradients, clean aesthetic
- Style: Isometric or flat 3D, tech-forward

**Feature Icons**: 
- Use Heroicons (outline style) via CDN
- Size: 24x24px for feature cards
- Placement: Top of each feature card

**Empty States**:
- Illustration: Simple line drawing of empty mailbox
- Placement: Center of email list when no messages
- Size: 200x200px max

---

## Interactions & Animations

**Minimal Motion**:
- Smooth transitions on hover (duration-200)
- Fade in for modals (duration-300)
- No scroll-triggered animations
- Instant feedback for clicks/actions

**Micro-interactions**:
- Copy button: Brief checkmark confirmation
- Delete: Slide-out animation
- New email: Subtle fade-in to list

---

## Accessibility

- Semantic HTML throughout (main, nav, article for emails)
- ARIA labels for icon buttons
- Keyboard navigation: Tab through alias list, arrow keys for email list
- Focus indicators on all interactive elements
- Screen reader announcements for new emails
- Color-independent status indicators (icons + text)

---

## Responsive Behavior

**Desktop (1024px+)**: Full two-column layout
**Tablet (768-1023px)**: Sidebar toggles to overlay, main content full-width
**Mobile (<768px)**: 
- Stack all elements vertically
- Top nav with hamburger for alias list
- Email list cards instead of table
- Full-width email viewer