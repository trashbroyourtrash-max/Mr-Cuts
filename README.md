# Mr Cuts Salon Backend

This is the Cloudflare Worker + D1 backend for the Mr Cuts Salon website.

## Database
Run the SQL in:

migrations/001_initial.sql

## Cloudflare secrets
Create these Worker secrets:

ADMIN_EMAIL
ADMIN_PASSWORD

Use:
ADMIN_EMAIL = your admin email
ADMIN_PASSWORD = your admin password

Do NOT put the password into frontend JavaScript.

## API
GET  /api/services
POST /api/services
DELETE /api/services/:id

POST /api/bookings
GET  /api/bookings
PUT  /api/bookings/:id

GET  /api/listings
POST /api/listings
DELETE /api/listings/:id

POST /api/admin/login
