# Manage-R Backend

> Production-ready NestJS API for resume management and career tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | JWT + Passport |
| Validation | class-validator / class-transformer |
| Logging | nestjs-pino (structured JSON) |
| Docs | Swagger / OpenAPI |
| Security | Helmet, CORS, Compression |
| Containerisation | Docker + Docker Compose |

---

## Folder Structure

```
src/
├── common/                  # Shared building blocks
│   ├── constants/           # API, error, and success message constants
│   ├── decorators/          # @CurrentUser, @Roles, @Public, @ApiStandardResponse
│   ├── dto/                 # PaginationQueryDto and other shared DTOs
│   ├── enums/               # Role, SortOrder
│   ├── exceptions/          # AppException + HTTP exception hierarchy
│   ├── filters/             # GlobalExceptionFilter
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── interceptors/        # TransformResponseInterceptor
│   ├── interfaces/          # IAuthenticatedUser, IPaginatedResult, IRepository
│   ├── middleware/          # LoggerMiddleware
│   ├── pipes/               # ParseUuidPipe
│   ├── utils/               # pagination.util, hash.util
│   └── validators/          # IsStrongPassword
├── config/                  # AppConfigModule + AppConfigService (Joi validation)
├── database/
│   ├── prisma/              # PrismaModule + PrismaService
│   └── repositories/        # BaseRepository (abstract)
├── modules/
│   ├── auth/                # JWT strategies, guards, Passport setup
│   ├── users/
│   ├── profiles/
│   ├── roles/
│   ├── resume/
│   ├── education/
│   ├── experience/
│   ├── project/
│   ├── certification/
│   ├── job-application/
│   └── health/              # GET /api/v1/health
├── app.module.ts            # Root module — global filters, interceptors, guards
└── main.ts                  # Bootstrap — Helmet, CORS, Swagger, Versioning
prisma/
└── schema.prisma            # Prisma schema (models added per feature)
```

Each feature module follows the same structure:

```
modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts   # extends BaseRepository
├── <feature>.module.ts
├── dto/
└── mappers/
```

---

## API Design

| Concern | Behaviour |
|---|---|
| Prefix | `/api` |
| Versioning | URI — `/api/v1/...` |
| Success envelope | `{ success, message, data }` |
| Error envelope | `{ success, statusCode, message, timestamp, path }` |
| Auth | Bearer JWT — all routes protected by default |
| Public routes | Opt out with `@Public()` decorator |
| Swagger | `GET /api/docs` |
| Health check | `GET /api/v1/health` |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | Yes |
| `PORT` | HTTP port (default `3000`) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_ACCESS_SECRET` | Minimum 32 chars | Yes |
| `JWT_ACCESS_EXPIRATION` | e.g. `15m` | Yes |
| `JWT_REFRESH_SECRET` | Minimum 32 chars | Yes |
| `JWT_REFRESH_EXPIRATION` | e.g. `7d` | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |
| `THROTTLE_TTL` | Rate limit window (ms) | No |
| `THROTTLE_LIMIT` | Max requests per window | No |
| `SWAGGER_ENABLED` | `true` / `false` | No |

---

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your local values

# Generate Prisma client
npm run prisma:generate
```

---

## Development Commands

```bash
# Start in watch mode
npm run start:dev

# Build for production
npm run build

# Start production build
npm run start:prod

# Lint
npm run lint
npm run lint:fix

# Format
npm run format

# Tests
npm run test
npm run test:watch
npm run test:cov
```

---

## Database Commands

```bash
# Create and apply a new migration
npm run prisma:migrate:dev

# Apply migrations in production/CI
npm run prisma:migrate:deploy

# Open Prisma Studio (GUI)
npm run prisma:studio

# Regenerate Prisma client after schema changes
npm run prisma:generate
```

---

## Docker Commands

```bash
# Start development environment (PostgreSQL + pgAdmin + API)
docker compose up -d

# View API logs
docker compose logs -f api

# Stop all containers
docker compose down

# Wipe database volume
docker compose down -v
```

pgAdmin is available at `http://localhost:5050`
- Email: `admin@manage-r.dev`
- Password: `admin`
- PostgreSQL host (inside Docker network): `postgres`

---

## Architecture Decisions

- **No CQRS / Event Sourcing / Microservices** — modular monolith, deliberately simple.
- **Global JWT guard** — every route is protected by default; use `@Public()` to opt out.
- **Repository pattern** — all data access goes through a repository that extends `BaseRepository`; services never touch Prisma directly.
- **ConfigService wrapper** — `AppConfigService` wraps NestJS `ConfigService`; no service reads `process.env` directly.
- **Structured logging** — `nestjs-pino` writes JSON logs in production; pretty-printed in development.
- **Standard response envelopes** — success and error shapes are enforced globally via interceptor and exception filter.

---

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
feat(auth): add refresh token rotation
fix(users): handle duplicate email error
docs(readme): update environment variables table
```

Enforced via `commitlint` + `husky`.
