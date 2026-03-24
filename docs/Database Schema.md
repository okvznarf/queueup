# Database Schema

## Models

### Shop
Core business entity. Each shop is one customer of QueueUp.
- `id`, `name`, `slug` (unique URL), `email`, `phone`, `address`
- `businessType` (barber, spa, restaurant, etc.)
- `timezone` (e.g. "Europe/Zagreb")
- `color`, `darkMode` (branding)
- `serviceLabel`, `staffLabel` (customizable UI labels)
- `subscriptionActive`, `trialEndsAt`, `paidUntil`, `employeeCount`, `monthlyPrice`
- `ownerId` → User

### User
Admin/owner accounts.
- `id`, `name`, `email`, `passwordHash`, `role` (owner/superadmin)
- `resetToken`, `resetTokenExpiry` (password reset)
- `totpSecret` (2FA OTP storage)

### Customer
End-users who book appointments.
- `id`, `name`, `email`, `phone`, `passwordHash`
- `googleId` (OAuth link)
- `shopId` → Shop
- Unique: `(email, shopId)`, `(phone, shopId)`

### Appointment
- `id`, `date`, `startTime`, `endTime`, `status`, `totalPrice`, `notes`
- `partySize`, `vehicleInfo`, `licensePlate` (multi-industry fields)
- `shopId` → Shop, `serviceId` → Service, `staffId` → Staff, `customerId` → Customer

### Service
- `id`, `name`, `description`, `duration` (min), `price`, `icon`, `category`
- `isActive`, `sortOrder`
- `shopId` → Shop

### Staff
- `id`, `name`, `email`, `phone`, `role`, `bio`
- `isActive`, `sortOrder`
- `shopId` → Shop

### WorkingHours
- `shopId` + `day` (unique)
- `openTime`, `closeTime`, `isClosed`

### StaffWorkingHours
- `staffId` + `day` (unique)
- `openTime`, `closeTime`, `isClosed`

## Indexes
| Model | Index | Purpose |
|-------|-------|---------|
| Shop | `slug` | Public booking page lookup |
| Shop | `businessType` | Category filtering |
| Shop | `ownerId` | Admin login → find shop |
| Customer | `(email, shopId)` unique | Prevent duplicate customers |
| Customer | `(phone, shopId)` unique | Prevent duplicate customers |
| Customer | `email` | Login lookup |
| Customer | `resetToken` | Password reset |
| Appointment | `(shopId, date)` | Daily appointment list |
| Appointment | `(staffId, date)` | Staff schedule |
| Appointment | `(shopId, status, date)` | Filtered appointment queries |
| Appointment | `status` | Status filtering |
| Appointment | `customerId` | Customer history |

## Links
- [[Architecture]]
- [[API Routes]]
