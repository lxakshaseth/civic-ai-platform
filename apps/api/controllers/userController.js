const bcrypt = require('bcryptjs')

const { query } = require('../config/db')
const { HttpError } = require('../utils/httpError')

const USER_PUBLIC_SELECT = `
  id,
  name,
  email,
  UPPER(COALESCE(role, 'CITIZEN')) AS role,
  phone,
  city,
  state,
  pincode,
  COALESCE(pan_number, pan_no) AS pan_number,
  COALESCE(aadhar_number, aadhar_no) AS aadhar_number,
  department,
  employee_code,
  status,
  address,
  permanent_address,
  temporary_address,
  created_at,
  updated_at
`

function normalizePincode(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizeUser(userRow) {
  if (!userRow) {
    return null
  }

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone,
    city: userRow.city,
    state: userRow.state,
    pincode: userRow.pincode,
    panNumber: userRow.pan_number,
    aadharNumber: userRow.aadhar_number,
    department: userRow.department,
    employeeCode: userRow.employee_code,
    status: userRow.status,
    address: userRow.address || userRow.permanent_address || null,
    permanentAddress: userRow.permanent_address,
    temporaryAddress: userRow.temporary_address,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  }
}

async function comparePassword(plainTextPassword, storedPassword) {
  if (!storedPassword) {
    return false
  }

  const looksHashed = /^\$2[aby]\$\d{2}\$/.test(storedPassword)

  if (looksHashed) {
    return bcrypt.compare(plainTextPassword, storedPassword)
  }

  return plainTextPassword === storedPassword
}

async function fetchUsers({ role, pincode } = {}) {
  const params = []
  const conditions = []

  if (role) {
    params.push(role)
    conditions.push(`UPPER(COALESCE(role, '')) = $${params.length}`)
  }

  if (pincode) {
    params.push(pincode)
    conditions.push(`COALESCE(pincode, '') = $${params.length}`)
  }

  const result = await query(
    `
      SELECT ${USER_PUBLIC_SELECT}
      FROM public.users
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY created_at DESC NULLS LAST, name ASC
    `,
    params
  )

  return result.rows.map(sanitizeUser)
}

async function login(req, res) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required.')
  }

  const result = await query(
    `
      SELECT
        ${USER_PUBLIC_SELECT},
        password
      FROM public.users
      WHERE LOWER(COALESCE(email, '')) = LOWER($1)
      LIMIT 1
    `,
    [email]
  )

  const user = result.rows[0]

  if (!user) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  const passwordMatches = await comparePassword(password, user.password)

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: sanitizeUser(user),
  })
}

async function getUsers(req, res) {
  const users = await fetchUsers()

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully.',
    data: users,
  })
}

async function getEmployees(req, res) {
  const pincode = normalizePincode(req.query.pincode)

  if (pincode && !/^\d{4,10}$/.test(pincode)) {
    throw new HttpError(400, 'Pincode must contain 4 to 10 digits.')
  }

  const employees = await fetchUsers({
    role: 'EMPLOYEE',
    ...(pincode ? { pincode } : {}),
  })

  res.status(200).json({
    success: true,
    message: 'Employees fetched successfully.',
    data: employees,
  })
}

async function getCitizens(req, res) {
  const citizens = await fetchUsers({ role: 'CITIZEN' })

  res.status(200).json({
    success: true,
    message: 'Citizens fetched successfully.',
    data: citizens,
  })
}

module.exports = {
  login,
  getUsers,
  getEmployees,
  getCitizens,
}
