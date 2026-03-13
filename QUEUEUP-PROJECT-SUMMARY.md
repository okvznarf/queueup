# QueueUp - Project Summary for Claude Code

## What is QueueUp
A multi-industry appointment booking SaaS platform. One backend serves multiple business types (barbers, restaurants, mechanics, salons, dentists, fitness studios, etc.). Each business gets its own branded booking page and admin dashboard. Fran (the developer) plans to sell this as a service — charging businesses a one-time setup fee + monthly maintenance.

## Tech Stack
- **Framework:** Next.js (App Router) with TypeScript and Tailwind CSS
- **Database:** PostgreSQL 18 (local, running on Windows)
- **ORM:** Prisma 7.4.2 (uses driver adapters, NOT the old `url` in schema approach)
- **Auth:** Custom JWT + bcrypt (NOT NextAuth — we built custom auth)
- **Platform:** Windows 11, PowerShell, VS Code
- **Node:** v24.14.0

## Project Location
`C:\Users\zovko\queueup`

## Critical Prisma 7 Notes
Prisma 7 changed significantly from v6. Key differences:
- Schema file has NO `url` in the datasource block — just `provider = "postgresql"`
- Database URL is configured in `prisma.config.ts` at project root
- Generator uses `provider = "prisma-client"` with `output = "../generated/prisma"`
- Client import path is `from "../../generated/prisma/client"` (or relative equivalent)
- Must use `@prisma/adapter-pg` with `PrismaPg` adapter
- Client instantiation: `const adapter = new PrismaPg({ connectionString }); const prisma = new PrismaClient({ adapter });`
- Uses `npx prisma generate` then `npx prisma db push` (not migrate in dev)
- Seed files use `npx tsx prisma/seed.ts` (not ts-node)

## Database Schema (prisma/schema.prisma)
Models: Shop, User, Staff, Service, Customer, Appointment, WorkingHours, StaffWorkingHours

Key enums: BusinessType (BARBER, RESTAURANT, MECHANIC, SALON, DENTIST, SPA, FITNESS, VETERINARY, OTHER), BookingStatus (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW), DayOfWeek

Customer model has optional `passwordHash` field — supports both guest bookings and registered customers.

Shop model has configurable fields: `showStaffPicker`, `showPartySize`, `showVehicleInfo`, `staffLabel`, `serviceLabel`, `bookingLabel`, `primaryColor`, `darkMode`, `allowWalkIns` (used as active/inactive toggle).

## Database Connection
- `.env` file: `DATABASE_URL="postgresql://postgres:Fran1010@localhost:5432/queueup?schema=public"`
- `prisma.config.ts` at project root reads DATABASE_URL
- `src/lib/prisma.ts` uses PrismaPg adapter

## What's Built and Working

### 1. Booking System (Customer-Facing)
- **Route:** `/booking/[slug]` (e.g., `/booking/sharp-and-co`)
- **Files:** `src/app/booking/[slug]/page.tsx` and `BookingClient.tsx`
- **Features:** Multi-step booking flow that adapts per business type
  - Service selection
  - Staff picker (barbers, mechanics) OR party size (restaurants) OR vehicle info (mechanics)
  - Date picker (next 14 days, respects working hours)
  - **Real availability** from database (not random) via `/api/availability`
  - Customer details with optional account creation
  - Review & confirm step
  - Booking saved to database
  - "Sign In" button for existing customers
  - "My Bookings" link after confirmation

### 2. Customer Authentication & Dashboard
- **Login:** `/customer/login?shop=[slug]`
- **Dashboard:** `/customer/dashboard`
- **APIs:** `/api/auth/register-customer`, `/api/auth/login-customer`, `/api/customer/appointments`
- **Features:**
  - Register with name, email, phone, password (per shop)
  - Login with email + password
  - View upcoming and past appointments
  - Cancel confirmed/pending appointments
  - Guest bookings are linked to registered accounts via phone/email matching
  - JWT stored in `customer_token` httpOnly cookie

### 3. Admin Dashboard (Shop Owner)
- **Route:** `/admin/[slug]/appointments`
- **Files:** `src/app/admin/[slug]/appointments/AdminClient.tsx`
- **Features:**
  - View appointments by date with date picker
  - Stats cards (total, confirmed, completed, revenue)
  - Change appointment status (Start, Complete, Cancel, No Show)
  - View staff list
  - View services list
  - View shop settings
  - Sidebar navigation
  - "View Booking Page" link
  - Protected by auth — redirects to `/admin/login` if not logged in

### 4. Super Admin Panel (Fran's Control Panel)
- **Login:** `/superadmin/login`
- **Dashboard:** `/superadmin/shops`
- **APIs:** `/api/superadmin/shops`, `/api/superadmin/toggle`, `/api/superadmin/setup`
- **Features:**
  - One-time super admin account creation
  - View all client businesses with stats (appointments, customers, staff, services counts)
  - Create new client businesses with name, type, contact info, brand color
  - Toggle businesses active/inactive
  - Quick links to each shop's admin panel and booking page
  - Copy booking link button
  - Protected by auth — only `superadmin` role can access

### 5. Admin Editing APIs (Built but no UI yet)
- **`/api/admin/services`** — POST (create), PATCH (edit), DELETE
- **`/api/admin/staff`** — POST (create), PATCH (edit), DELETE
- **`/api/admin/hours`** — PATCH (update working hours)
- **`/api/admin/shop`** — PATCH (update shop details)
- These APIs work but the admin dashboard UI doesn't have edit forms yet — it only views data

### 6. Authentication System
- **Admin login:** `/admin/login` — for shop owners
- **Customer login:** `/customer/login` — for customers booking appointments
- **Super admin login:** `/superadmin/login` — for Fran only
- **Auth lib:** `src/lib/auth.ts` — hashPassword, verifyPassword, createToken, verifyToken, getAuthUser
- JWT tokens with 7-day expiry (admin) and 30-day expiry (customer)
- Passwords hashed with bcrypt (12 rounds)
- Tokens stored in httpOnly cookies (`auth_token` for admin, `customer_token` for customers)

### 7. Security
- **Middleware:** `src/middleware.ts` — security headers, CORS, route protection
- **Security lib:** `src/lib/security.ts` — input sanitization, email/phone validation, rate limiting
- **Rate limiting:** Login (10/15min), registration (5/hour), bookings (20/hour)
- **Security headers:** X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **CORS:** Configured for localhost in dev, production URL in prod
- Admin routes redirect to login if no token
- Super admin routes redirect to super admin login if no token

### 8. Real Availability System
- **File:** `src/lib/availability.ts`
- **API:** `/api/availability?shopId=X&date=Y&staffId=Z&duration=30`
- Checks working hours for the day
- Queries existing appointments from database
- Calculates time conflicts based on service duration
- Filters out past time slots
- Returns only genuinely available slots

## File Structure
```
C:\Users\zovko\queueup\
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data seeder
├── prisma.config.ts           # Prisma 7 config (datasource URL)
├── .env                       # Environment variables
├── generated/prisma/          # Generated Prisma client (auto-generated)
├── src/
│   ├── middleware.ts           # Security headers, CORS, route protection
│   ├── lib/
│   │   ├── prisma.ts          # Database client (PrismaPg adapter)
│   │   ├── auth.ts            # JWT + bcrypt helpers
│   │   ├── security.ts        # Sanitization, validation, rate limiting
│   │   └── availability.ts    # Real slot availability calculator
│   ├── types/
│   │   └── booking.ts         # TypeScript types & business configs
│   ├── app/
│   │   ├── api/
│   │   │   ├── shops/route.ts              # GET shop by slug, POST create shop
│   │   │   ├── services/route.ts           # GET/POST services
│   │   │   ├── staff/route.ts              # GET/POST staff
│   │   │   ├── appointments/
│   │   │   │   ├── route.ts                # GET/POST appointments
│   │   │   │   └── [id]/route.ts           # PATCH appointment status
│   │   │   ├── availability/route.ts       # GET available time slots
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts          # Admin login
│   │   │   │   ├── register/route.ts       # Admin register
│   │   │   │   ├── me/route.ts             # Get current user
│   │   │   │   ├── login-customer/route.ts # Customer login
│   │   │   │   └── register-customer/route.ts # Customer register
│   │   │   ├── customer/
│   │   │   │   └── appointments/route.ts   # GET/PATCH customer appointments
│   │   │   ├── superadmin/
│   │   │   │   ├── shops/route.ts          # GET all shops, POST new shop
│   │   │   │   ├── toggle/route.ts         # Toggle shop active/inactive
│   │   │   │   └── setup/route.ts          # One-time super admin creation
│   │   │   └── admin/
│   │   │       ├── services/route.ts       # CRUD services
│   │   │       ├── staff/route.ts          # CRUD staff
│   │   │       ├── hours/route.ts          # Update working hours
│   │   │       └── shop/route.ts           # Update shop details
│   │   ├── booking/[slug]/
│   │   │   ├── page.tsx                    # Server component — fetches shop
│   │   │   └── BookingClient.tsx           # Client component — booking flow
│   │   ├── admin/
│   │   │   ├── login/page.tsx              # Admin login page
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                # Redirects to appointments
│   │   │       └── appointments/
│   │   │           ├── page.tsx            # Server component
│   │   │           └── AdminClient.tsx     # Admin dashboard UI
│   │   ├── customer/
│   │   │   ├── login/page.tsx              # Customer login/register
│   │   │   └── dashboard/page.tsx          # Customer booking management
│   │   └── superadmin/
│   │       ├── login/page.tsx              # Super admin login/setup
│   │       └── shops/page.tsx              # Super admin dashboard
```

## Demo Data in Database
3 seeded businesses:
- **Sharp & Co.** (BARBER) — slug: `sharp-and-co`, color: #C8A45A, 3 barbers, 6 services
- **Ember & Oak** (RESTAURANT) — slug: `ember-and-oak`, color: #D4644E, no staff, 6 experiences
- **Iron Works Auto** (MECHANIC) — slug: `iron-works-auto`, color: #4A9EE5, 3 technicians, 6 services

## What Still Needs to Be Built (Priority Order)

### Priority 1 — Needed Before Launch
1. **Admin dashboard edit UI** — The APIs exist (`/api/admin/services`, `/api/admin/staff`, `/api/admin/hours`, `/api/admin/shop`) but the admin dashboard only views data. Need forms to add/edit/delete services, add/edit/delete staff, change working hours, and update shop branding.
2. **Email confirmations** — Send booking confirmation emails via SendGrid (already installed: `@sendgrid/mail`). Packages installed but not wired up.
3. **SMS reminders** — Send 24-hour reminder texts via Twilio (already installed). Packages installed but not wired up.
4. **Deploy to internet** — Vercel (app) + Neon (database). Domain on Porkbun.

### Priority 2 — Growth Features
5. Landing/marketing page for QueueUp itself
6. Custom domains per business (subdomain routing)
7. Google Calendar sync
8. Password reset flow
9. Recurring appointments
10. Mobile responsive polish

### Priority 3 — Revenue Features (Fran's Business Model)
- Fran sells the frontend + backend setup to businesses as a one-time fee
- Monthly maintenance fee for hosting, updates, support
- Super admin panel lets Fran manage all clients
- Toggle shops active/inactive if they stop paying
- NO subscription/SaaS model — direct B2B service

### Priority 4 — Advanced Features
- Staff visual scheduling
- Analytics dashboard for shop owners
- Review/rating system
- Loyalty program
- Multi-location support
- White-label option
- Embeddable booking widget (iframe)

## Known Issues / Notes
- Next.js shows a warning about "middleware" convention being deprecated — use "proxy" instead. Doesn't break anything currently.
- PowerShell can't handle `&&` for chaining commands — use `;` or run commands separately
- PowerShell `Set-Content` adds BOM to files — use `[System.IO.File]::WriteAllText()` with UTF8 encoding instead
- The `allowWalkIns` field is repurposed as the active/inactive toggle in super admin (not ideal, should be a dedicated `isActive` field)
- Rate limiting is in-memory (resets on server restart) — fine for dev, needs Redis for production
- Email/SMS packages installed but not configured — need SendGrid and Twilio API keys in .env

## Environment Variables (.env)
```
DATABASE_URL="postgresql://postgres:Fran1010@localhost:5432/queueup?schema=public"
NEXTAUTH_SECRET="change-this-to-any-long-random-string-you-want"
NEXTAUTH_URL="http://localhost:3000"
# Not yet configured:
# SENDGRID_API_KEY=
# STRIPE_SECRET_KEY=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=
```

## How to Run
```powershell
cd C:\Users\zovko\queueup
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
npm run dev
# Open http://localhost:3000/booking/sharp-and-co
```

## Key URLs When Running
- Booking: `http://localhost:3000/booking/[slug]`
- Customer login: `http://localhost:3000/customer/login?shop=[slug]`
- Customer dashboard: `http://localhost:3000/customer/dashboard`
- Admin login: `http://localhost:3000/admin/login`
- Admin dashboard: `http://localhost:3000/admin/[slug]/appointments`
- Super admin login: `http://localhost:3000/superadmin/login`
- Super admin dashboard: `http://localhost:3000/superadmin/shops`
- API test: `http://localhost:3000/api/shops?slug=sharp-and-co`