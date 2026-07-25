# TeamSync — Auth & Users Foundation

> **Course:** Advanced Programming in Web Technology · **Section:** C · **Group:** 2
> **Member 2 — Abdullah Al Taieb (22-48028-2):** authentication, users, JWT security, and role-based authorization.

This repository holds my part of the TeamSync backend: the **authentication and user foundation** that the rest of the platform builds on. Built as a NestJS + TypeORM + PostgreSQL modular monolith.

## Stack

NestJS · TypeScript · TypeORM · PostgreSQL · JWT + Passport · Argon2 · class-validator · Swagger · Helmet · Throttler.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then set DB credentials + a JWT secret (>= 32 chars)

# 3. Create the database (once)
createdb teamsync           # or use your PostgreSQL client

# 4. Start the dev server (tables auto-create in development)
npm run start:dev
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

`NODE_ENV=development` uses TypeORM `synchronize`, so the `users` and `user_profiles` tables are created automatically. `.env` is git-ignored — never commit real secrets.

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Register (Argon2-hashed password) |
| POST | `/api/v1/auth/login` | public | Login → JWT access token |
| GET | `/api/v1/auth/me` | bearer | Current identity |
| GET | `/api/v1/users/me` | bearer | Get my profile |
| PATCH | `/api/v1/users/me` | bearer | Update my profile |
| PATCH | `/api/v1/users/me/password` | bearer | Change password |
| GET | `/api/v1/users/search?q&page&limit` | bearer | Search users (paginated) |
| GET | `/api/v1/health` | public | Health check |

## Security

- Passwords hashed with **Argon2**; the hash is never selected or returned.
- **JWT** carries identity only (`sub`, `email`, `type`); a global `JwtAuthGuard` protects every route unless marked `@Public()`.
- **Helmet** security headers, **Throttler** rate limiting (100/min global, 5/min on auth), CORS, and a global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).

## Structure

```
src/
├── main.ts               # bootstrap: prefix, validation, Swagger, Helmet, CORS
├── app.module.ts         # config (Joi), TypeORM, throttler, global providers
├── auth/                 # register, login, JWT strategy, /auth/me
├── users/                # profile, password change, user search, User/UserProfile entities
└── common/               # @Public/@CurrentUser decorators, JwtAuthGuard, filter, interceptor
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier |
| `npm test` | Unit tests |
