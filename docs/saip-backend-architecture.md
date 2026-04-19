# SAIP Backend Architecture

## 1. Recommended Architecture

Use a **feature-based modular monolith** for the Node.js backend and keep the **AI service as a separate FastAPI microservice**.

Why this is the right starting point for SAIP:

- It is easier to build and debug than many microservices.
- It still scales well when each feature module has clear boundaries.
- It supports separate teams later.
- It keeps AI workloads isolated from core API workloads.
- It is easier for a student developer to understand and maintain.

Recommended architectural style:

- **Monorepo** with Turbo for multiple apps and shared packages
- **Express + TypeScript** for the main API
- **Prisma + PostgreSQL** for relational data
- **Redis** for caching, rate limiting, sessions, and BullMQ
- **BullMQ** for background jobs
- **Socket.io** for real-time updates
- **FastAPI** microservice for AI-specific processing
- **Hybrid clean architecture** inside each feature module:
  - `route -> controller -> service -> repository`
  - shared infra in `config`, `database`, `queues`, `sockets`, `integrations`

## 2. Turbo-Style Monorepo Structure

This layout keeps the backend reusable across multiple frontends and future projects.

```text
saip/
├── apps/
│   ├── api/                        # Main Node.js backend
│   ├── ai-service/                 # Python FastAPI microservice
│   ├── web-public/                 # Citizen/public frontend
│   ├── web-employee/               # Employee/officer frontend
│   ├── web-admin/                  # Department admin frontend
│   └── web-super-admin/            # Super admin frontend
├── packages/
│   ├── config/                     # Shared TS, ESLint, Prettier config
│   ├── types/                      # Shared DTOs, enums, API contracts
│   ├── utils/                      # Shared helpers used across apps
│   ├── ui/                         # Optional shared UI package for web apps
│   ├── sdk/                        # Shared frontend API client
│   └── eslint-config/
├── docs/
│   └── saip-backend-architecture.md
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 3. Main Backend Folder Structure

```text
apps/api/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── app.config.ts
│   │   ├── db.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   ├── bullmq.config.ts
│   │   ├── socket.config.ts
│   │   ├── rate-limit.config.ts
│   │   └── upload.config.ts
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   ├── complaint-status.ts
│   │   ├── complaint-priority.ts
│   │   ├── job-names.ts
│   │   ├── queue-names.ts
│   │   └── error-codes.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   ├── auth.types.ts
│   │   ├── api.types.ts
│   │   ├── socket.types.ts
│   │   └── queue.types.ts
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── clients/
│   │   │   ├── prisma.ts
│   │   │   └── redis.ts
│   │   ├── repositories/
│   │   │   └── base.repository.ts
│   │   └── transactions/
│   │       └── transaction-manager.ts
│   ├── docs/
│   │   ├── openapi.ts
│   │   └── swagger.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   ├── request-logger.middleware.ts
│   │   ├── audit.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── idempotency.middleware.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── async-handler.ts
│   │   ├── pagination.ts
│   │   ├── date.ts
│   │   ├── crypto.ts
│   │   ├── token.ts
│   │   ├── file.ts
│   │   └── logger.ts
│   ├── shared/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── interfaces/
│   │   ├── exceptions/
│   │   ├── policies/
│   │   └── validators/
│   ├── integrations/
│   │   ├── ai/
│   │   │   ├── ai.client.ts
│   │   │   ├── ai.mapper.ts
│   │   │   ├── ai.types.ts
│   │   │   └── ai.fallback.ts
│   │   ├── email/
│   │   │   └── email.client.ts
│   │   ├── sms/
│   │   │   └── sms.client.ts
│   │   ├── storage/
│   │   │   ├── storage.client.ts
│   │   │   └── presign.service.ts
│   │   └── maps/
│   │       └── geocoding.client.ts
│   ├── queues/
│   │   ├── index.ts
│   │   ├── queue.factory.ts
│   │   ├── workers/
│   │   │   ├── notification.worker.ts
│   │   │   ├── complaint-ai.worker.ts
│   │   │   ├── evidence-ocr.worker.ts
│   │   │   ├── fraud-detection.worker.ts
│   │   │   └── audit-log.worker.ts
│   │   ├── jobs/
│   │   │   ├── notification.job.ts
│   │   │   ├── complaint-ai.job.ts
│   │   │   ├── ocr.job.ts
│   │   │   ├── file-cleanup.job.ts
│   │   │   └── risk-recompute.job.ts
│   │   └── events/
│   │       └── queue.events.ts
│   ├── sockets/
│   │   ├── index.ts
│   │   ├── socket.server.ts
│   │   ├── socket.auth.ts
│   │   ├── socket.events.ts
│   │   └── handlers/
│   │       ├── complaint.handler.ts
│   │       ├── notification.handler.ts
│   │       └── presence.handler.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.validator.ts
│   │   │   ├── auth.dto.ts
│   │   │   ├── auth.tokens.ts
│   │   │   └── auth.events.ts
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.validator.ts
│   │   │   ├── users.dto.ts
│   │   │   └── profile.mapper.ts
│   │   ├── complaints/
│   │   │   ├── complaints.routes.ts
│   │   │   ├── complaints.controller.ts
│   │   │   ├── complaints.service.ts
│   │   │   ├── complaints.repository.ts
│   │   │   ├── complaints.validator.ts
│   │   │   ├── complaints.dto.ts
│   │   │   ├── complaints.policy.ts
│   │   │   ├── complaints.timeline.ts
│   │   │   └── complaints.events.ts
│   │   ├── evidence/
│   │   │   ├── evidence.routes.ts
│   │   │   ├── evidence.controller.ts
│   │   │   ├── evidence.service.ts
│   │   │   ├── evidence.repository.ts
│   │   │   ├── evidence.validator.ts
│   │   │   └── evidence.storage.ts
│   │   ├── notifications/
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.repository.ts
│   │   │   ├── notifications.publisher.ts
│   │   │   └── notifications.events.ts
│   │   ├── analytics/
│   │   │   ├── analytics.routes.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.repository.ts
│   │   │   ├── analytics.cache.ts
│   │   │   └── analytics.aggregator.ts
│   │   ├── fraud/
│   │   │   ├── fraud.routes.ts
│   │   │   ├── fraud.controller.ts
│   │   │   ├── fraud.service.ts
│   │   │   ├── fraud.repository.ts
│   │   │   ├── fraud.rules.ts
│   │   │   └── fraud.events.ts
│   │   ├── chatbot/
│   │   │   ├── chatbot.routes.ts
│   │   │   ├── chatbot.controller.ts
│   │   │   ├── chatbot.service.ts
│   │   │   ├── chatbot.repository.ts
│   │   │   ├── chatbot.prompt.ts
│   │   │   └── chatbot.context.ts
│   │   ├── audit/
│   │   │   ├── audit.routes.ts
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.repository.ts
│   │   │   └── audit.events.ts
│   │   └── ai-integration/
│   │       ├── ai-integration.routes.ts
│   │       ├── ai-integration.controller.ts
│   │       ├── ai-integration.service.ts
│   │       ├── ai-integration.repository.ts
│   │       ├── ai-integration.validator.ts
│   │       └── ai-orchestration.service.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── v1.ts
│   │   └── health.routes.ts
│   └── bootstrap/
│       ├── express.ts
│       ├── queues.ts
│       ├── sockets.ts
│       ├── docs.ts
│       └── shutdown.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
├── uploads/
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

## 4. Folder-by-Folder Explanation

### `config/`

Holds environment parsing and infrastructure setup.

- `env.ts`: validates environment variables with Zod or Envalid
- `db.config.ts`: PostgreSQL connection options
- `redis.config.ts`: Redis connection
- `jwt.config.ts`: access/refresh token secrets and expiry
- `bullmq.config.ts`: queue settings and concurrency
- `upload.config.ts`: upload limits, MIME filters, storage target

### `constants/`

Stores fixed application-level values.

- Roles
- Permissions
- Queue names
- Complaint states
- Priority values
- Error codes

### `types/`

Holds shared TypeScript types, including Express request typing and socket payloads.

### `database/`

Central place for DB and cache clients.

- `prisma/schema.prisma`: all DB models
- `clients/prisma.ts`: singleton Prisma client
- `clients/redis.ts`: singleton Redis client
- `repositories/base.repository.ts`: reusable repository helpers
- `transactions/`: transaction wrappers for complex write flows

### `middlewares/`

Holds global request pipeline logic.

- Auth and RBAC
- Validation
- Error handling
- Request logging
- Audit logging hooks
- Rate limiting
- File upload middleware

### `utils/`

Pure helpers with no business logic.

### `shared/`

Reusable DTOs, exceptions, interfaces, policies, and validators used across modules.

### `integrations/`

All third-party and cross-service communication belongs here.

- AI microservice client
- Email provider
- SMS provider
- Object storage
- Geocoding or map provider

### `queues/`

BullMQ queues, job producers, and workers.

Use queues for:

- OCR processing
- AI classification
- notification fan-out
- fraud checks
- risk recomputation
- audit persistence if you want low-latency API responses

### `sockets/`

Real-time layer for complaint status changes, assignment changes, and notifications.

### `modules/`

Each business feature owns its own routes, controllers, services, repository, validators, and DTOs.

This is the most important scaling rule:

- **Never put complaint logic inside auth**
- **Never put notification logic inside users**
- **Let modules talk through services, events, and shared interfaces**

### `routes/`

Top-level route composition and versioning.

### `bootstrap/`

App startup sequence.

- initialize Express
- connect database
- connect Redis
- start queues
- start sockets
- attach shutdown hooks

## 5. Database Module Structure

Recommended: **Prisma ORM** because it is student-friendly, strongly typed, and productive.

Use this split:

```text
database/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── clients/
│   ├── prisma.ts
│   └── redis.ts
├── repositories/
│   └── base.repository.ts
└── transactions/
    └── transaction-manager.ts
```

Recommended core tables/models:

- `User`
- `Role`
- `Permission`
- `UserRole`
- `Department`
- `Complaint`
- `ComplaintStatusHistory`
- `ComplaintAssignment`
- `ComplaintAttachment`
- `Evidence`
- `EvidenceOcrResult`
- `Notification`
- `RefreshToken`
- `AuditLog`
- `FraudFlag`
- `ChatSession`
- `ChatMessage`
- `RiskPrediction`
- `FileObject`

Practical DB rules:

- Keep Prisma models in one schema at first.
- Use indexes on `complaint.status`, `complaint.departmentId`, `complaint.createdAt`, `notification.userId`.
- Add composite unique keys where needed, for example duplicate complaint detection helper tables.
- Use `deletedAt` soft delete only where business history matters.
- Keep audit logs append-only.

## 6. Route, Controller, Service, Repository Pattern

Recommended responsibility split:

### Route

- Defines endpoint path
- Applies auth, RBAC, validation, upload middleware
- Calls controller

Example:

```ts
router.post(
  "/complaints",
  authenticate,
  authorize(["citizen"]),
  validate(createComplaintSchema),
  complaintsController.createComplaint
);
```

### Controller

- Reads request
- Calls service
- Returns standardized API response
- No business logic

### Service

- Contains feature logic
- Coordinates repositories, queues, sockets, and integrations
- Handles transactions
- Emits events

### Repository

- Talks to Prisma only
- No HTTP request objects
- No queue logic
- No socket logic

Recommended rule:

- **Business logic goes in services**
- **Data access goes in repositories**
- **Transport logic goes in controllers**

## 7. Middleware Structure

Suggested order in Express:

1. request ID middleware
2. helmet / security headers
3. CORS
4. body parser
5. cookie parser
6. request logger
7. rate limiter
8. auth middleware
9. RBAC middleware where needed
10. validation middleware
11. upload middleware where needed
12. route handlers
13. not-found middleware
14. error middleware

Key middleware files:

- `auth.middleware.ts`: verifies JWT access token
- `rbac.middleware.ts`: checks role or permission
- `validation.middleware.ts`: validates body, params, query
- `upload.middleware.ts`: Multer or presigned upload validation
- `audit.middleware.ts`: captures user actions
- `request-logger.middleware.ts`: Winston or Pino request logs
- `error.middleware.ts`: centralized error formatting

## 8. Config Structure

Recommended config split:

```text
config/
├── env.ts
├── app.config.ts
├── db.config.ts
├── redis.config.ts
├── jwt.config.ts
├── bullmq.config.ts
├── socket.config.ts
├── rate-limit.config.ts
└── upload.config.ts
```

Rules:

- Only `env.ts` should read `process.env`
- Other config files should import validated values from `env.ts`
- Never access raw `process.env` all over the codebase

## 9. Queue / Jobs Structure

Use BullMQ for all heavy and retryable work.

Recommended queues:

- `notifications`
- `complaint-ai`
- `ocr`
- `fraud`
- `audit`
- `analytics`

Recommended job examples:

- After complaint creation:
  - run AI category prediction
  - run urgency detection
  - run duplicate complaint check
  - send user notification
- After employee uploads evidence:
  - OCR invoice
  - verify image
  - update evidence verification status
- Nightly:
  - recompute department metrics
  - city health index
  - sustainability score

Structure:

```text
queues/
├── queue.factory.ts
├── jobs/
├── workers/
└── events/
```

Pattern:

- `jobs/` contains producers
- `workers/` contains consumers
- `events/` handles completed, failed, stalled monitoring

## 10. Socket Structure

Use Socket.io for real-time updates.

Recommended namespaces or rooms:

- `user:{userId}`
- `department:{departmentId}`
- `complaint:{complaintId}`

Socket use cases:

- complaint status changed
- complaint assigned to employee
- new in-app notification
- admin live dashboard updates

Recommended files:

```text
sockets/
├── socket.server.ts
├── socket.auth.ts
├── socket.events.ts
└── handlers/
```

Rule:

- Services publish domain events.
- Socket handlers broadcast those events.
- Do not emit socket messages directly from repositories.

## 11. AI Microservice Communication

Keep AI features outside the main API.

Recommended flow:

1. User creates complaint in Node API.
2. Complaint is saved in PostgreSQL.
3. Node API pushes a BullMQ job.
4. Worker calls FastAPI microservice through `integrations/ai/ai.client.ts`.
5. FastAPI returns classification, urgency, OCR, fraud score, or verification result.
6. Node service stores result in PostgreSQL and emits notifications/socket updates.

Recommended integration layout:

```text
integrations/ai/
├── ai.client.ts
├── ai.mapper.ts
├── ai.types.ts
└── ai.fallback.ts
```

Best practices:

- Use internal API key or service token between Node and FastAPI
- Set request timeout and retries
- Use circuit breaker or fallback where possible
- Make AI requests asynchronous through queues for heavy tasks
- Store both raw AI result and normalized result when useful
- Version AI endpoints, for example `/v1/classify-complaint`

Suggested FastAPI endpoints:

- `POST /v1/complaints/classify`
- `POST /v1/complaints/priority`
- `POST /v1/evidence/ocr`
- `POST /v1/evidence/verify-image`
- `POST /v1/fraud/detect`
- `POST /v1/chatbot/respond`

## 12. RBAC, JWT, Redis, BullMQ, Prisma, File Upload Placement

### RBAC

- Roles and permissions in `constants/`, `shared/policies/`, and auth-related middleware
- Permission checks in `rbac.middleware.ts`
- User-role relations in database models

### JWT

- token generation helpers in `utils/token.ts` or `modules/auth/auth.tokens.ts`
- config in `config/jwt.config.ts`
- verification in `middlewares/auth.middleware.ts`

### Redis

- connection in `database/clients/redis.ts`
- caching in module-specific files such as `analytics.cache.ts`
- queue backend for BullMQ
- optional token/session blacklist and rate limiter support

### BullMQ

- infra in `config/bullmq.config.ts` and `queues/`
- job producers in services
- workers in `queues/workers/`

### Prisma

- schema in `database/prisma/schema.prisma`
- DB client in `database/clients/prisma.ts`
- access wrapped by repositories

### File uploads

Recommended approach:

- Use object storage in production, not local disk
- For small student-first MVP, Multer can be used temporarily
- Better long-term option:
  - backend generates presigned upload URL
  - frontend uploads directly to S3/Cloudinary/etc.
  - backend stores metadata in DB

Placement:

- upload config in `config/upload.config.ts`
- upload validation middleware in `middlewares/upload.middleware.ts`
- storage logic in `integrations/storage/`
- file metadata repository under relevant modules

## 13. Supporting Multiple Frontends on One Backend

This backend can support citizen, employee, admin, and super-admin frontends if you keep it role-aware and contract-driven.

Recommended strategy:

- One main API app: `apps/api`
- Shared DTOs and enums in `packages/types`
- Shared frontend SDK in `packages/sdk`
- Role-based route access, not separate backend apps for each frontend
- Optional frontend-specific API clients or route groups if UX differs

Example:

- Public app uses `/api/v1/auth`, `/api/v1/complaints`, `/api/v1/chatbot`
- Employee app uses `/api/v1/complaints`, `/api/v1/evidence`, `/api/v1/notifications`
- Admin app uses `/api/v1/analytics`, `/api/v1/audit`, `/api/v1/users`
- Super-admin app uses global management routes

This keeps one core backend while allowing many frontends.

## 14. Naming Conventions

Use consistent TypeScript naming:

- files: `kebab-case` or `feature.resource.ts` style
- classes: `PascalCase`
- interfaces: `PascalCase`
- types: `PascalCase`
- enums: `PascalCase`
- variables/functions: `camelCase`
- constants: `UPPER_SNAKE_CASE` for true constants, otherwise `camelCase`
- DTOs: `CreateComplaintDto`, `UpdateUserProfileDto`
- validators/schemas: `createComplaintSchema`
- controllers/services/repositories:
  - `ComplaintsController`
  - `ComplaintsService`
  - `ComplaintsRepository`

Recommended file style:

- `complaints.routes.ts`
- `complaints.controller.ts`
- `complaints.service.ts`
- `complaints.repository.ts`

## 15. Environment Variable Example

Suggested `apps/api/.env.example`:

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
APP_NAME=SAIP_API

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saip_db
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=change_me_ai_key
AI_SERVICE_TIMEOUT_MS=10000

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@saip.local

SMS_PROVIDER=mock
SMS_API_KEY=

STORAGE_DRIVER=local
STORAGE_BUCKET=saip-assets
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1

MAX_FILE_SIZE_MB=10
UPLOAD_TEMP_DIR=uploads/tmp

QUEUE_PREFIX=saip
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## 16. Best Practices for Scalability

- Start with a modular monolith, not many microservices.
- Keep modules independent and communicate through services and events.
- Make controllers thin.
- Keep repositories focused on persistence only.
- Put heavy jobs into BullMQ.
- Use Redis caching for dashboard and lookup-heavy endpoints.
- Use database indexes early.
- Add API versioning from day one.
- Use DTO validation with Zod, Joi, or class-validator.
- Centralize error handling.
- Use structured logs with request IDs.
- Keep audit logs append-only.
- Prefer presigned file uploads for large files.
- Use pagination for list endpoints.
- Design idempotent background jobs.
- Separate read-heavy analytics from transaction-heavy complaint flows.
- Protect internal AI integration with timeout, retry, and fallback logic.
- Add health checks for PostgreSQL, Redis, queues, and AI service.

## 17. Suggested Step-by-Step Build Phases

### Phase 1: Foundation

- Initialize Turbo monorepo
- Create `apps/api` and `apps/ai-service`
- Setup TypeScript, Express, ESLint, Prettier
- Setup environment validation
- Setup Prisma, PostgreSQL, Redis
- Setup logging, error handling, Swagger, Docker

### Phase 2: Auth and Users

- User, Role, Permission schema
- Register, login, refresh, logout
- Forgot/reset password
- RBAC middleware
- Citizen, employee, admin profile APIs

### Phase 3: Complaints Core

- Create complaint
- location and attachment support
- complaint status lifecycle
- assignment workflow
- complaint timeline
- basic notification triggers

### Phase 4: Evidence and File Handling

- evidence uploads
- before/after images
- invoice upload
- file metadata table
- storage integration

### Phase 5: AI Integration

- FastAPI endpoints
- complaint classification
- priority detection
- OCR processing
- image verification
- fraud scoring

### Phase 6: Queues and Realtime

- BullMQ queues and workers
- Socket.io status updates
- notification fan-out
- background retry flows

### Phase 7: Analytics and Fraud

- complaint trends
- heatmap data
- department performance
- city health index
- duplicate complaint detection
- anomaly reporting

### Phase 8: Audit, Hardening, and DevOps

- audit logs
- admin action tracking
- rate limits
- health checks
- Docker Compose
- CI pipeline
- tests and load testing

## 18. Final Recommendation

For SAIP, the strongest practical setup is:

- **Turbo monorepo**
- **One Node.js modular monolith backend**
- **One separate Python FastAPI AI microservice**
- **Prisma + PostgreSQL**
- **Redis + BullMQ**
- **Socket.io**
- **Feature-based modules with shared infrastructure**

This is industry-level, scalable, and still manageable for a student developer.

If you want the next step, scaffold the actual `apps/api` folder with starter code for:

- Express + TypeScript bootstrapping
- Prisma setup
- JWT auth
- RBAC middleware
- module template
- queue setup
- socket setup
- Docker files
