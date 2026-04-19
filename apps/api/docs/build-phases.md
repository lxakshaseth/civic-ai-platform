# SAIP Backend Build Order

## Phase 1

- workspace and package setup
- environment validation
- Express app and server bootstrap
- Prisma schema and database client
- Redis client
- JWT auth
- refresh token flow
- auth middleware and RBAC middleware

## Phase 2

- users module
- complaints module
- evidence module
- notifications module
- audit module

## Phase 3

- BullMQ queues and workers
- Socket.io realtime updates
- FastAPI AI integration client
- Docker and deployment hardening

## Suggested next implementation steps

1. run `prisma migrate dev`
2. add seed data for departments and admin users
3. implement analytics, fraud, chatbot, and dashboard modules
4. move uploads from local disk to object storage
5. split worker process from API process for production

