# API Routes

## Public (no auth)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/shops?slug=X` | Get shop with services, staff, hours |
| GET | `/api/services?shopId=X` | Get active services |
| GET | `/api/staff?shopId=X` | Get active staff |
| GET | `/api/availability?shopId&staffId&date` | Get available time slots |

## Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Admin register |
| POST | `/api/auth/login-customer` | Customer login |
| POST | `/api/auth/register-customer` | Customer register |
| POST | `/api/auth/forgot-password` | Customer password reset |
| POST | `/api/auth/reset-password` | Confirm password reset |
| POST | `/api/auth/admin-forgot-password` | Admin password reset |
| POST | `/api/auth/admin-reset-password` | Confirm admin reset |
| GET | `/api/auth/google` | Google OAuth start |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user |

## Admin (requires auth_token + shop ownership)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST/PATCH/DELETE | `/api/admin/services` | CRUD services |
| GET/POST/PATCH/DELETE | `/api/admin/staff` | CRUD staff |
| PATCH | `/api/admin/hours` | Update working hours |
| PATCH | `/api/admin/shop` | Update shop settings |

## Customer (requires customer_token)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PATCH | `/api/customer/appointments` | View/cancel appointments |

## Appointments
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/appointments` | Create appointment |
| PATCH | `/api/appointments/[id]` | Update appointment status |

## Superadmin (requires superadmin role)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/superadmin/shops` | List all shops |
| POST | `/api/superadmin/shops` | Create new shop |
| PATCH | `/api/superadmin/shops` | Update subscription |
| POST | `/api/superadmin/2fa` | Verify 2FA code |

## Real-Time
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/events?shopId=X` | SSE stream for live admin updates |

## Health & Monitoring
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | DB status + error log + circuit breaker states |
| GET | `/api/admin/export?shopId=X` | Export shop data |

## Cron
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/cron/reminders` | Send appointment reminders hourly (requires CRON_SECRET) |
| GET | `/api/cron/jobs` | Process background job queue (runs every minute) |
