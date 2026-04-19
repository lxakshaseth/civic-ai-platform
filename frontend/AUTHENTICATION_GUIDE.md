# SAIP Authentication Guide

## Overview
The SAIP platform now includes a complete authentication system for all three user roles: Citizens, Employees, and Administrators.

## Registration Process

### Citizen Registration
1. Navigate to `/register` or click "Register here" from the login page
2. Fill in all required fields including personal information
3. Create a password (minimum 6 characters)
4. Provide digital signature using mouse or touchscreen
5. Submit to create account
6. You'll be automatically logged in and redirected to the Citizen Portal

### Employee Registration
1. Navigate to `/employee-register` or:
   - Go to login page
   - Switch to "Employee" tab
   - Click "Register here" link
2. Fill in employee details:
   - Full Name
   - Email (e.g., employee@gov.in)
   - Phone Number
   - Employee ID (e.g., EMP12345)
   - Department (select from dropdown)
   - Password (minimum 6 characters)
3. Submit to create account
4. You'll be redirected to login page

### Administrator Registration
1. Navigate to `/admin-register` or:
   - Go to login page
   - Switch to "Admin" tab
   - Click "Register here" link
2. Enter Admin Registration Code: `SAIP-ADMIN-2026`
3. Fill in admin details:
   - Full Name
   - Email (e.g., admin@gov.in)
   - Phone Number
   - Admin ID (e.g., ADMIN001)
   - Department (select from dropdown)
   - Password (minimum 6 characters)
4. Submit to create account
5. You'll be redirected to login page

## Login Process

### Citizen Login
1. Navigate to `/login`
2. Select "Public" tab (default)
3. Enter registered email and password
4. Click "Login as Citizen"
5. Redirected to Citizen Portal

### Employee Login
1. Navigate to `/login`
2. Select "Employee" tab
3. Enter registered email and password
4. Click "Login as Employee"
5. You'll be prompted for 2FA verification
6. Enter any 6-digit OTP (demo mode - any code works)
7. Redirected to Employee Portal

### Administrator Login
1. Navigate to `/login`
2. Select "Admin" tab
3. Enter registered email and password
4. Click "Login as Admin"
5. You'll be prompted for 2FA verification
6. Enter any 6-digit OTP (demo mode - any code works)
7. Redirected to Admin Portal

## Pre-configured Accounts

### Default Admin Account
For testing purposes, a default admin account is automatically created:
- **Email:** admin@saip.gov.in
- **Password:** admin123
- **Admin ID:** ADMIN001

## Features

### Security Features
- Password validation (minimum 6 characters)
- Email uniqueness validation per role
- Digital signature for citizen registration
- Two-Factor Authentication (2FA) for employees and admins
- Separate user stores for each role

### Storage
- User credentials are stored in browser localStorage
- Data persists across sessions
- Each role has separate authentication flow

### Validation
- Email format validation
- Password confirmation matching
- Employee/Admin registration code validation
- Duplicate email prevention per role

## Testing Tips

1. **Create Test Accounts:**
   - Register different users for each role
   - Test with various email formats
   - Try duplicate emails to verify validation

2. **Test Login Flow:**
   - Test correct credentials
   - Test incorrect credentials
   - Test 2FA for employee/admin

3. **Test Navigation:**
   - Verify role-specific redirects
   - Test registration links from login page
   - Test "Back to home" links

## Production Considerations

⚠️ **Important:** This is a demo implementation using localStorage. For production use, you should:

1. Implement server-side authentication
2. Use secure password hashing (bcrypt, etc.)
3. Implement real OTP generation and verification
4. Add session management with tokens (JWT)
5. Implement proper admin registration authorization
6. Add rate limiting and security headers
7. Use HTTPS for all authentication endpoints
8. Implement password reset functionality
9. Add email verification for new accounts
10. Store user data in a secure database

## Troubleshooting

### Registration Issues
- **"Email already exists"**: Use a different email or clear localStorage
- **"Passwords do not match"**: Ensure password and confirm password are identical
- **"Invalid admin code"**: Use the correct code: `SAIP-ADMIN-2026`

### Login Issues
- **"Invalid credentials"**: Verify you've registered the account first
- **Can't complete 2FA**: Enter any 6-digit number (demo mode)
- **Not redirected after login**: Check browser console for errors

### Clear All Data
To reset all accounts and start fresh:
```javascript
// Open browser console and run:
localStorage.clear();
```

## Support
For issues or questions, refer to the main README.md or check the implementation in:
- `/src/app/utils/auth.ts` - Authentication utilities
- `/src/app/pages/Login.tsx` - Login page
- `/src/app/pages/Register.tsx` - Citizen registration
- `/src/app/pages/EmployeeRegister.tsx` - Employee registration
- `/src/app/pages/AdminRegister.tsx` - Admin registration
- `/src/app/pages/TwoFactor.tsx` - 2FA verification
