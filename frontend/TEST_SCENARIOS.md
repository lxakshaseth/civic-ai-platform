# SAIP Authentication - Test Scenarios

## 🧪 Complete Test Scenarios

### Scenario 1: Quick Test with Default Admin
**Goal:** Verify default admin account works

1. Open the application
2. Navigate to `/login`
3. Click on "Admin" tab
4. Enter credentials:
   - Email: `admin@saip.gov.in`
   - Password: `admin123`
5. Click "Login as Admin"
6. Enter OTP: `123456` (any 6 digits)
7. Click "Verify & Continue"

**Expected Result:** ✅ Successfully logged into Admin Portal at `/admin`

---

### Scenario 2: Employee Full Registration & Login Flow
**Goal:** Test complete employee registration and login

**Part A: Registration**
1. Navigate to `/login`
2. Click "Employee" tab
3. Click "Register here" link
4. Fill the registration form:
   - Full Name: `Test Employee`
   - Email: `test.emp@gov.in`
   - Phone: `+91 9876543210`
   - Employee ID: `EMP999`
   - Department: Select `Sanitation`
   - Password: `test123456`
   - Confirm Password: `test123456`
5. Click "Complete Registration"

**Expected Result:** 
- ✅ Success toast: "Registration successful! You can now login."
- ✅ Redirected to `/login`

**Part B: Login**
1. On login page, click "Employee" tab
2. Enter credentials:
   - Email: `test.emp@gov.in`
   - Password: `test123456`
3. Click "Login as Employee"
4. Enter OTP: `123456`
5. Click "Verify & Continue"

**Expected Result:** ✅ Successfully logged into Employee Portal at `/employee`

---

### Scenario 3: Admin Full Registration & Login Flow
**Goal:** Test complete admin registration and login

**Part A: Registration**
1. Navigate to `/admin-register`
2. Enter Admin Code: `SAIP-ADMIN-2026`
3. Fill the registration form:
   - Full Name: `Test Admin`
   - Email: `test.admin@gov.in`
   - Phone: `+91 9876543211`
   - Admin ID: `ADMIN999`
   - Department: Select `IT & Technology`
   - Password: `admin123456`
   - Confirm Password: `admin123456`
4. Click "Complete Registration"

**Expected Result:** 
- ✅ Success toast: "Admin registration successful! You can now login."
- ✅ Redirected to `/login`

**Part B: Login**
1. On login page, click "Admin" tab
2. Enter credentials:
   - Email: `test.admin@gov.in`
   - Password: `admin123456`
3. Click "Login as Admin"
4. Enter OTP: `999999`
5. Click "Verify & Continue"

**Expected Result:** ✅ Successfully logged into Admin Portal at `/admin`

---

### Scenario 4: Validation - Duplicate Email
**Goal:** Test email uniqueness validation

1. Register an employee with email `duplicate@gov.in`
2. Try to register another employee with the same email `duplicate@gov.in`

**Expected Result:** ❌ Error toast: "An employee account with this email already exists"

---

### Scenario 5: Validation - Password Mismatch
**Goal:** Test password confirmation

1. Go to `/employee-register`
2. Fill form with:
   - Password: `password123`
   - Confirm Password: `password456`
3. Click "Complete Registration"

**Expected Result:** ❌ Error toast: "Passwords do not match"

---

### Scenario 6: Validation - Invalid Admin Code
**Goal:** Test admin code validation

1. Go to `/admin-register`
2. Enter Admin Code: `WRONG-CODE`
3. Fill other fields correctly
4. Click "Complete Registration"

**Expected Result:** ❌ Error toast: "Invalid admin registration code"

---

### Scenario 7: Validation - Invalid Login Credentials
**Goal:** Test login validation

1. Go to `/login`
2. Click "Employee" tab
3. Enter:
   - Email: `nonexistent@gov.in`
   - Password: `wrongpassword`
4. Click "Login as Employee"

**Expected Result:** ❌ Error toast: "Invalid credentials. Please check your email and password."

---

### Scenario 8: Navigation - Registration Links
**Goal:** Test contextual registration links

1. Go to `/login`
2. By default, "Public" tab is selected
   - **Expected:** See "New citizen? Register here" link
3. Click "Employee" tab
   - **Expected:** See "New employee? Register here" link
4. Click "Admin" tab
   - **Expected:** See "New administrator? Register here" link

---

### Scenario 9: 2FA - Direct Access Prevention
**Goal:** Test 2FA page protection

1. Clear browser session (F12 → Application → Local Storage → Clear)
2. Navigate directly to `/2fa`

**Expected Result:** 
- ❌ Error toast: "Please login first"
- ✅ Redirected to `/login`

---

### Scenario 10: Multiple Roles - Same Email
**Goal:** Test that email uniqueness is per-role

1. Register a citizen with email `same@example.com`
2. Register an employee with email `same@example.com`
3. Register an admin with email `same@example.com`

**Expected Result:** ✅ All three registrations succeed (different roles can use same email)

---

### Scenario 11: Session Persistence
**Goal:** Test localStorage persistence

1. Register and login as employee
2. Navigate to `/employee/assigned`
3. Refresh the page (F5)

**Expected Result:** ✅ User remains logged in, page loads correctly

---

### Scenario 12: Password Length Validation
**Goal:** Test minimum password length

1. Go to `/employee-register`
2. Fill form with password: `abc` (only 3 characters)
3. Click "Complete Registration"

**Expected Result:** ❌ Error toast: "Password must be at least 6 characters long"

---

### Scenario 13: Department Selection Required
**Goal:** Test department validation

1. Go to `/employee-register`
2. Fill all fields except department
3. Click "Complete Registration"

**Expected Result:** ❌ Error toast: "Please select a department"

---

### Scenario 14: All Department Options
**Goal:** Verify all departments are available

**Employee Departments:**
- Sanitation
- Water Supply
- Roads & Infrastructure
- Electricity
- Parks & Recreation
- Health & Safety
- Waste Management

**Admin Additional Departments:**
- General Administration
- IT & Technology

**Expected Result:** ✅ All departments appear in dropdown

---

### Scenario 15: Clear All Data
**Goal:** Reset the system

1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh the page
4. Try to login with previously created accounts

**Expected Result:** 
- ❌ Login fails (accounts deleted)
- ✅ Default admin account works (auto-recreated)

---

## 🎯 Quick Checklist for Full Test

- [ ] Default admin login works
- [ ] Employee registration works
- [ ] Employee login works
- [ ] Employee 2FA works
- [ ] Admin registration works
- [ ] Admin registration code validation works
- [ ] Admin login works
- [ ] Admin 2FA works
- [ ] Duplicate email validation works
- [ ] Password mismatch validation works
- [ ] Invalid credentials validation works
- [ ] Registration links appear per role
- [ ] 2FA page requires login first
- [ ] Department selection works
- [ ] Password length validation works
- [ ] Session persists on refresh
- [ ] Multiple roles can use same email
- [ ] Clear data resets system

---

## 📊 Test Data Templates

### Employee Test Data
```
Full Name: Test Employee
Email: employee.test@gov.in
Phone: +91 9876543210
Employee ID: EMP001
Department: Sanitation
Password: test123
```

### Admin Test Data
```
Admin Code: SAIP-ADMIN-2026
Full Name: Test Administrator
Email: admin.test@gov.in
Phone: +91 9876543211
Admin ID: ADMIN002
Department: IT & Technology
Password: admin123
```

---

## 🔧 Troubleshooting During Testing

**Issue:** Can't login after registration
- **Solution:** Make sure you're using the exact same email and password
- **Solution:** Check that you're on the correct role tab

**Issue:** 2FA not working
- **Solution:** Any 6-digit number works (123456, 000000, etc.)
- **Solution:** Make sure to fill all 6 boxes

**Issue:** Registration form won't submit
- **Solution:** Check all required fields are filled
- **Solution:** For admin: verify you entered the admin code
- **Solution:** For all: make sure passwords match

**Issue:** "Email already exists"
- **Solution:** Use a different email
- **Solution:** Or clear localStorage to reset

**Issue:** Want to start fresh
- **Solution:** Open console, run `localStorage.clear()`
- **Solution:** Default admin will be recreated automatically
