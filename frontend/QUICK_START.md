# 🚀 SAIP Quick Start Guide

## Default Credentials

### Admin Account (Pre-configured)
```
URL: /login (select Admin tab)
Email: admin@saip.gov.in
Password: admin123
2FA OTP: Any 6 digits (e.g., 123456)
Dashboard: /admin
```

### Employee Registration Code
```
Admin Registration Code: SAIP-ADMIN-2026
(Required for creating new admin accounts)
```

## Quick Access Routes

### Public Routes
- `/` - Landing page
- `/login` - Portal login (3 tabs: Citizen, Employee, Admin)
- `/register` - Citizen registration
- `/employee-register` - Employee registration
- `/admin-register` - Admin registration (requires code)

### Portal Dashboards
- `/public` - Citizen Dashboard
- `/employee` - Employee Dashboard
- `/admin` - Admin Dashboard

## Testing Workflows

### Test Citizen Flow
1. Go to `/register`
2. Fill form with any data
3. Draw signature
4. Login and access `/public`

### Test Employee Flow
1. Go to `/employee-register`
2. Enter details (any Employee ID)
3. Select department
4. Complete registration
5. Login at `/login` (Employee tab)
6. Enter any 6-digit OTP
7. Access `/employee` dashboard

### Test Admin Flow (Fastest)
1. Go to `/login`
2. Select "Admin" tab
3. Email: `admin@saip.gov.in`
4. Password: `admin123`
5. 2FA: Enter any 6 digits
6. Access `/admin` dashboard

## Features to Test

### Citizen Portal (`/public`)
- File complaint
- View my complaints
- Transparency dashboard
- AI chatbot
- Profile management

### Employee Portal (`/employee`)
- Assigned complaints
- Map view
- Upload evidence
- Performance metrics

### Admin Portal (`/admin`)
- City health index
- Department performance
- Fraud detection
- User management
- Reports & analytics

## Design Highlights to Notice

✨ **Landing Page**
- Smooth entrance animations
- Interactive stats cards
- Professional gradient backgrounds

✨ **Login/Register Pages**
- Role-based color themes
- Icon-enhanced inputs
- Real-time validation
- Smooth transitions

✨ **2FA Page**
- Professional OTP input
- Animated security icon
- Beautiful completion feedback

✨ **Dashboards**
- Clean layouts
- Rich data visualizations
- Intuitive navigation

## Pro Tips

💡 **Fast Admin Access**: Use the default admin account for instant access
💡 **2FA Demo Mode**: Any 6-digit code works for 2FA verification
💡 **Digital Signature**: Use mouse or touch to sign in registration
💡 **Role Switching**: Easily test different roles via login tabs
💡 **Mobile Testing**: Fully responsive - test on mobile devices

## Common Actions

### Create New Admin
```
1. /admin-register
2. Code: SAIP-ADMIN-2026
3. Fill details
4. Login with 2FA
```

### Create New Employee
```
1. /employee-register
2. Any Employee ID works
3. Select department
4. Login with 2FA
```

### Create New Citizen
```
1. /register
2. Fill form + signature
3. Auto-login to dashboard
```

---

**Need help?** See `SAIP_DOCUMENTATION.md` for complete details.
