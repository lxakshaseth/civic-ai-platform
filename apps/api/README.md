# SAIP API

Production-style backend scaffold for the Smart AI Civic Intelligence Platform.

## Run locally

1. Install dependencies in the workspace root and `apps/api`
2. Start PostgreSQL and Redis with `docker-compose up -d`
3. Copy `.env.example` to `.env`
4. Run Prisma migration and generate client
5. Start the API with `pnpm --filter @saip/api dev`

## Main structure

```text
apps/api
├── src
│   ├── config
│   ├── constants
│   ├── database
│   ├── integrations
│   ├── middlewares
│   ├── modules
│   ├── queues
│   ├── routes
│   ├── sockets
│   └── utils
├── prisma
├── docs
├── uploads
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Current phases

- Phase 1: project setup, config, Prisma, Redis, Express bootstrap, auth
- Phase 2: users, complaints, evidence, notifications, audit
- Phase 3: queues, sockets, AI client integration, Docker/monorepo readiness

