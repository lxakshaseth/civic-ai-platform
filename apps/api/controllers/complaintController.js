const { v4: uuidv4 } = require('uuid')

const { withTransaction } = require('../config/db')
const { HttpError } = require('../utils/httpError')

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function findCitizen(client, citizenId) {
  const result = await client.query(
    `
      SELECT id, name, email, role, pincode
      FROM public.users
      WHERE id = $1
        AND UPPER(COALESCE(role, '')) = 'CITIZEN'
      LIMIT 1
    `,
    [citizenId]
  )

  return result.rows[0] || null
}

async function findBestEmployeeByPincode(client, pincode) {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.department,
        u.pincode,
        COUNT(c.id) FILTER (
          WHERE UPPER(COALESCE(c.status, 'OPEN')) NOT IN ('RESOLVED', 'CLOSED')
        )::int AS open_workload
      FROM public.users u
      LEFT JOIN public.complaints c
        ON c.assigned_employee_id = u.id
      WHERE UPPER(COALESCE(u.role, '')) = 'EMPLOYEE'
        AND COALESCE(u.pincode, '') = $1
        AND LOWER(COALESCE(u.status, 'ACTIVE')) NOT IN ('inactive', 'disabled', 'terminated', 'blocked')
      GROUP BY u.id, u.name, u.email, u.phone, u.department, u.pincode
      ORDER BY open_workload ASC, RANDOM()
      LIMIT 1
    `,
    [pincode]
  )

  return result.rows[0] || null
}

async function createComplaint(req, res) {
  const citizenId = normalizeOptionalString(req.body.citizenId)
  const title = normalizeOptionalString(req.body.title)
  const description = normalizeOptionalString(req.body.description)
  const category = normalizeOptionalString(req.body.category)
  const priority = normalizeOptionalString(req.body.priority)
  const department = normalizeOptionalString(req.body.department)
  const pincode = normalizeOptionalString(req.body.pincode)
  const locationAddress = normalizeOptionalString(req.body.locationAddress)
  const imageUrl = normalizeOptionalString(req.body.imageUrl)
  const latitude = normalizeOptionalNumber(req.body.latitude)
  const longitude = normalizeOptionalNumber(req.body.longitude)

  if (!citizenId || !title || !description || !pincode) {
    throw new HttpError(400, 'citizenId, title, description, and pincode are required.')
  }

  if (!/^\d{4,10}$/.test(pincode)) {
    throw new HttpError(400, 'Pincode must contain 4 to 10 digits.')
  }

  if ((latitude === null) !== (longitude === null)) {
    throw new HttpError(400, 'Latitude and longitude must be provided together.')
  }

  const result = await withTransaction(async (client) => {
    const citizen = await findCitizen(client, citizenId)

    if (!citizen) {
      throw new HttpError(404, 'Citizen not found.')
    }

    const assignedEmployee = await findBestEmployeeByPincode(client, pincode)
    const complaintId = uuidv4()
    const ticketId = uuidv4()
    const complaintStatus = assignedEmployee ? 'ASSIGNED' : 'OPEN'
    const resolvedDepartment = department || assignedEmployee?.department || null

    await client.query(
      `
        INSERT INTO public.complaints (
          id,
          title,
          description,
          category,
          department,
          citizen_id,
          assigned_employee_id,
          priority,
          pincode,
          location_address,
          latitude,
          longitude,
          image_url,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
      [
        complaintId,
        title,
        description,
        category || 'General',
        resolvedDepartment,
        citizenId,
        assignedEmployee?.id || null,
        priority || 'Medium',
        pincode,
        locationAddress,
        latitude,
        longitude,
        imageUrl,
        complaintStatus,
      ]
    )

    const ticketMessage = assignedEmployee
      ? `Complaint auto-assigned to employee ${assignedEmployee.name || assignedEmployee.id} for pincode ${pincode}.`
      : `No matching employee found for pincode ${pincode}. Manual assignment required.`

    await client.query(
      `
        INSERT INTO public.tickets (
          id,
          complaint_id,
          raised_by,
          message,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [ticketId, complaintId, citizenId, ticketMessage]
    )

    const complaintResult = await client.query(
      `
        SELECT
          c.id,
          c.title,
          c.description,
          c.category,
          c.department,
          c.status,
          c.priority,
          c.pincode,
          c.location_address,
          c.latitude,
          c.longitude,
          c.image_url,
          c.created_at,
          citizen.id AS citizen_id,
          citizen.name AS citizen_name,
          employee.id AS assigned_employee_id,
          employee.name AS assigned_employee_name,
          employee.department AS assigned_employee_department
        FROM public.complaints c
        INNER JOIN public.users citizen
          ON citizen.id = c.citizen_id
        LEFT JOIN public.users employee
          ON employee.id = c.assigned_employee_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [complaintId]
    )

    return {
      complaint: complaintResult.rows[0],
      assignment: assignedEmployee
        ? {
            strategy: 'least-workload-same-pincode',
            employee: {
              id: assignedEmployee.id,
              name: assignedEmployee.name,
              email: assignedEmployee.email,
              phone: assignedEmployee.phone,
              department: assignedEmployee.department,
              pincode: assignedEmployee.pincode,
              openWorkload: assignedEmployee.open_workload,
            },
          }
        : null,
      ticket: {
        id: ticketId,
        status: 'PENDING',
        message: ticketMessage,
      },
    }
  })

  res.status(201).json({
    success: true,
    message: 'Complaint created successfully.',
    data: result,
  })
}

module.exports = {
  createComplaint,
}
