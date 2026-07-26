# TeamSync — Auth, Users & Security (Member 2)

> **Course:** Advanced Programming in Web Technology · **Section:** C · **Group:** 2
> **Member 2 — Abdullah Al Taieb (22-48028-2):** authentication, users, JWT security, mailer, and account protection.

My part of the TeamSync backend — the **authentication and user module** the rest of the platform builds on. NestJS + TypeORM + PostgreSQL modular monolith.

## Stack

NestJS · TypeScript · TypeORM · PostgreSQL · JWT + Passport · Argon2 · Nodemailer · Multer · class-validator · Swagger · Helmet · Throttler.

## Features

- **JWT auth** with short-lived **access tokens** plus rotating, revocable **refresh tokens**.
- **Registration** with a **welcome email** (Nodemailer / Gmail SMTP).
- **Forgot / reset password** via an emailed, hashed, single-use token.
- **Account lockout** after repeated failed logins, plus **rate limiting**.
- **Profile image upload** (Multer) with static serving.
- **Auth event logging** (NestJS `Logger`), custom decorators, global exception + response formatting, user search with pagination, and `.env` config.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # set DB creds, a 32+ char JWT_SECRET, and (optional) Gmail SMTP

# 3. Create the database (once)
createdb teamsync

# 4. Start the dev server (tables auto-create in development)
npm run start:dev
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

`.env` is git-ignored — never commit real secrets. Without `MAIL_USER`/`MAIL_PASS`, the app still runs and just skips sending email.

## Endpoints

### Authentication
| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Register + welcome email |
| POST | `/auth/login` | public | Login → access + refresh tokens |
| POST | `/auth/refresh` | public | Rotate: new access + refresh token |
| POST | `/auth/logout` | bearer | Revoke the refresh token |
| POST | `/auth/forgot-password` | public | Email a password-reset link |
| POST | `/auth/reset-password` | public | Reset password with an emailed token |
| GET | `/auth/me` | bearer | Current authenticated user |

### Users
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | bearer | Get my profile |
| PATCH | `/users/me` | bearer | Update my profile |
| PATCH | `/users/me/avatar` | bearer | Upload a profile image |
| PATCH | `/users/me/password` | bearer | Change my password |
| GET | `/users/search?q&page&limit` | bearer | Search users (paginated) |
| GET | `/health` | public | Health check |

_All routes are prefixed with `/api/v1`._

## Security

- Passwords hashed with **Argon2**; the hash is never selected or returned.
- **Access tokens** are short-lived; **refresh tokens** are signed with a separate secret, stored **hashed** (SHA-256), **rotated** on every refresh, and **revoked** on logout or password reset.
- **Password-reset** and email tokens are stored hashed with an expiry and are single-use.
- **Account lockout**: 15-minute lock after 5 failed logins; **Throttler** rate limiting (100/min global, 5/min on auth).
- **Helmet** headers, CORS, and a global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).
- Auth events are logged via the NestJS `Logger`.

## Environment

Key variables (see `.env.example`):

```
JWT_SECRET, JWT_EXPIRES_IN
JWT_REFRESH_SECRET (optional; derived from JWT_SECRET if empty), JWT_REFRESH_EXPIRES_IN
APP_URL                      # base URL used in email links
MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM   # Gmail: use an App Password
```

## Structure

```
src/
├── main.ts        # bootstrap: prefix, validation, Swagger, Helmet, CORS, static /uploads
├── app.module.ts  # config (Joi), TypeORM, throttler, global providers
├── auth/          # register, login, refresh, logout, forgot/reset password, JWT strategy
├── users/         # profile, avatar upload, password change, user search, entities
├── mail/          # MailService (Nodemailer) + global MailModule
└── common/        # decorators, guards, filter, interceptor
uploads/           # uploaded avatars (git-ignored)
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier |
| `npm test` | Unit tests |
