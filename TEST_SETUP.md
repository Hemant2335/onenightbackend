# Test Setup Guide

Since Firebase billing is not enabled, this guide will help you set up test users and test authentication.

## Step 1: Run Database Migrations

First, make sure your database is set up:

```bash
npx prisma migrate dev
```

## Step 2: Seed Test Data

Run the seed script to create test users and test data:

```bash
npm run seed
```

This will create:
- **Test User**: Phone `+911234567890`, Name `Test User`, Firebase UID `test-user-firebase-uid-12345`
- **Test Admin**: Phone `+919876543210`, Name `Test Admin`, Firebase UID `test-admin-firebase-uid-67890`, `is_admin: true`
- **Test Event**: "Test Event 2025" with ID `test-event-1`
- **Test Tickets**: TEST001, TEST002, TEST003, TEST004, TEST005
  - TEST001 is linked to the test user
- **Test Coupons**: 3 coupons for the test event

## Step 3: Start the Backend

```bash
npm run dev
```

The backend should be running on `http://localhost:8000`

## Step 4: Start the Frontend

In the `onenightminimalist` directory:

```bash
npm run dev
```

The frontend should be running on `http://localhost:3000`

## Step 5: Test Authentication

### Option 1: Use Test Auth Component (Recommended)

1. Go to the landing page (`http://localhost:3000`)
2. You'll see a test auth component in the bottom-right corner
3. Enter one of the test phone numbers:
   - `+911234567890` for Test User
   - `+919876543210` for Test Admin
4. Click "Test Login"
5. You'll be redirected to the dashboard

### Option 2: Use Test API Endpoint Directly

You can also test the API directly:

```bash
# Test User Login
curl -X POST http://localhost:8000/api/test/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'

# Test Admin Login
curl -X POST http://localhost:8000/api/test/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

## Test Credentials Summary

### Test User
- **Phone**: `+911234567890`
- **Name**: Test User
- **Has Ticket**: TEST001 (linked to Test Event)
- **Is Admin**: No

### Test Admin
- **Phone**: `+919876543210`
- **Name**: Test Admin
- **Is Admin**: Yes
- **Can Access**: Admin panel at `/admin`

### Test Tickets
- **TEST001**: Linked to Test User
- **TEST002, TEST003, TEST004, TEST005**: Available to add

### Test Event
- **Name**: Test Event 2025
- **ID**: `test-event-1`
- **Coupons**: 3 test coupons available

## Testing Flow

1. **Login as Test User**:
   - Use phone `+911234567890`
   - You'll see the dashboard with Test Event (has 1 ticket)
   - Click on the event to see coupons

2. **Add a Ticket**:
   - On dashboard, click "+ Add Ticket"
   - Enter `TEST002` (or TEST003, TEST004, TEST005)
   - The ticket will be linked to your account

3. **Login as Test Admin**:
   - Use phone `+919876543210`
   - You'll see the dashboard
   - Click "Admin" in the header to access admin panel
   - You can create events, add tickets, and manage coupons

## Notes

- Test authentication bypasses Firebase OTP verification
- Test tokens start with `test-token-` prefix
- Only users with Firebase UID starting with `test-` can use test authentication
- For production, you'll need to enable Firebase billing and use real OTP authentication

## Troubleshooting

If the seed script fails:
1. Make sure your database is running
2. Check your `DATABASE_URL` in `.env`
3. Run `npx prisma generate` to generate Prisma client
4. Try running migrations again: `npx prisma migrate dev`

If test login doesn't work:
1. Make sure the backend is running on port 8000
2. Check that test users were created: `npx prisma studio` and check the User table
3. Verify the test token is stored in localStorage after login

