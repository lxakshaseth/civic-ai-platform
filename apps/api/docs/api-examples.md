# SAIP API Examples

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Users

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id/role`

## Complaints

- `POST /api/v1/complaints`
- `GET /api/v1/complaints`
- `GET /api/v1/complaints/:id`
- `PATCH /api/v1/complaints/:id/status`
- `POST /api/v1/complaints/:id/assign`
- `GET /api/v1/complaints/:id/timeline`

## Evidence

- `POST /api/v1/evidence/:complaintId`
- `GET /api/v1/evidence/:complaintId`

## Notifications

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

## Audit

- `GET /api/v1/audit`

## Example request payloads

### Register

```json
{
  "fullName": "Asha Sharma",
  "email": "asha@example.com",
  "password": "StrongPass123",
  "phone": "9876543210"
}
```

### Create complaint

Use `multipart/form-data`:

- `title`
- `description`
- `locationAddress`
- `latitude`
- `longitude`
- `departmentId`
- `image`

### Update complaint status

```json
{
  "status": "IN_PROGRESS",
  "note": "Field team dispatched"
}
```

### Assign complaint

```json
{
  "employeeId": "employee-uuid",
  "departmentId": "department-uuid"
}
```
