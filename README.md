# QueueUp - Multi-Industry Booking Platform

One backend. One codebase. Any appointment-based business.

## Quick Start

1. Update .env with your PostgreSQL password
2. Run: npx prisma generate
3. Run: npx prisma db push
4. Run: npm install -D ts-node
5. Run: npx ts-node prisma/seed.ts
6. Run: npm run dev
7. Open: http://localhost:3000

## Test API

- http://localhost:3000/api/shops?slug=sharp-and-co (Barber)
- http://localhost:3000/api/shops?slug=ember-and-oak (Restaurant)
- http://localhost:3000/api/shops?slug=iron-works-auto (Mechanic)
