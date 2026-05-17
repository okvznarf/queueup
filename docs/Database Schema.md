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

### VoiceCall
AI receptionist call records.
- `id`, `callSid` (unique, Twilio SID), `clinicId`, `status`
- `startedAt`, `endedAt`, `durationSec`, `summary`
- Relations: `transcripts` → VoiceTranscript[], `auditLog` → VoiceAuditLog?
- Indexes: `clinicId`, `callSid`

### VoiceTranscript
Per-turn conversation transcript (GDPR-retained).
- `id`, `callId` → VoiceCall, `role`, `content`
- `deleteAfter` — GDPR retention expiry (default now + 90 days); `retentionCron` deletes past this
- Indexes: `callId`, `deleteAfter`

### VoiceAuditLog
GDPR audit trail per call.
- `id`, `callId` (unique) → VoiceCall, `callSid`, `clinicId`
- `consentTimestamp`, `consentType`, `phoneHash`
- `durationSeconds`, `actionsJson`, `wasEscalated`
- Indexes: `clinicId`, `callSid`

## Links
- [[Architecture]]
- [[API Routes]]
- [[AI Receptionist]]
