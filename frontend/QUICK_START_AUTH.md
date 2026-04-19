# Quick Start - Employee & Admin Registration/Login

## 🚀 Quick Test Instructions

### Option 1: Use Pre-configured Admin Account
```
1. Navigate to: /login
2. Click "Admin" tab
3. Login with:
   Email: admin@saip.gov.in
   Password: admin123
4. Enter any 6-digit OTP (e.g., 123456)
5. ✅ You're in the Admin Portal!
```

### Option 2: Register New Employee
```
1. Navigate to: /employee-register
2. Fill the form:
   - Full Name: Test Employee
   - Email: test.employee@gov.in
   - Phone: +91 9876543210
   - Employee ID: EMP001
   - Department: (select any)
   - Password: test123
   - Confirm Password: test123
3. Click "Complete Registration"
4. Go to /login, switch to "Employee" tab
5. Login with test.employee@gov.in / test123
6. Enter any 6-digit OTP
7. ✅ You're in the Employee Portal!
```

### Option 3: Register New Admin
```
1. Navigate to: /admin-register
2. Enter Admin Code: SAIP-ADMIN-2026
3. Fill the form:
   - Full Name: Test Admin
   - Email: test.admin@gov.in
   - Phone: +91 9876543210
   - Admin ID: ADMIN002
   - Department: (select any)
   - Password: test123
   - Confirm Password: test123
4. Click "Complete Registration"
5. Go to /login, switch to "Admin" tab
6. Login with test.admin@gov.in / test123
7. Enter any 6-digit OTP
8. ✅ You're in the Admin Portal!
```

## 📍 Quick Links

- **Landing Page:** `/`
- **Login:** `/login`
- **Citizen Registration:** `/register`
- **Employee Registration:** `/employee-register`
- **Admin Registration:** `/admin-register`

## 🔑 Test Credentials

### Pre-configured Admin
- Email: `admin@saip.gov.in`
- Password: `admin123`

### Admin Registration Code
- Code: `SAIP-ADMIN-2026`

## ⚡ Features Available After Login

### Employee Portal
- Dashboard with assigned complaints
- Map view of complaints
- Upload evidence
- Performance metrics
- Notifications

### Admin Portal
- Dashboard with analytics
- Department performance
- Fraud detection
- City health index
- Sustainability index
- User management
- Reports

## 💡 Tips

1. **2FA OTP:** Any 6-digit number works in demo mode
2. **Password:** Minimum 6 characters required
3. **Email:** Must be unique per role
4. **Clear Data:** Run `localStorage.clear()` in browser console to reset

## 🐛 Troubleshooting

**"Email already exists"**
→ Use a different email or clear localStorage

**"Invalid credentials"**
→ Make sure you registered first

**"Invalid admin code"**
→ Use: SAIP-ADMIN-2026

**Can't see registration link**
→ Make sure you're on the correct tab (Employee/Admin) in login page
