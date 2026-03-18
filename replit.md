# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Student productivity dashboard with macOS UI theme. Multi-role system (student, teacher, school_admin, admin) with email verification for teachers.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: bcryptjs + express-session (username/password)
- **Email**: nodemailer (SMTP env vars; falls back to console.log in dev)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── student-dashboard/  # React + Vite frontend (macOS UI theme)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Role System

- **student**: Default role. Full access to personal classes, assignments, resources.
- **teacher**: Requires email verification + school association. Same student features.
- **school_admin**: Principal/VP. Can manage teachers in their school via School Panel.
- **admin**: Superadmin. Username "Ryan" (case-insensitive) is auto-assigned admin on register.

### Admin (Ryan) Capabilities
- View and manage all users, change roles, delete accounts
- Manage schools (add directly, approve/deny requests, delete)
- Lock down the app (shows lockdown screen to non-admin users)
- Accessible at `/admin` route

### School Admin Capabilities
- View members of their school
- Remove teachers from their school
- Accessible at `/school-panel` route

## Features

### Authentication
- Student: username + password only
- Teacher: multi-step — select role → credentials → email → verify 6-digit code → school selection
- Username "Ryan" (case-insensitive) auto-gets admin role on register
- Session stores userId, username, role

### Email (nodemailer)
- Set `SMTP_USER` and `SMTP_PASS` env vars for real email sending
- Without SMTP config: verification codes are logged to server console
- Admin notification email: `f0reverry4n@gmail.com`
- `SMTP_HOST` (default: smtp.gmail.com), `SMTP_PORT` (default: 587)

### Lockdown
- Admin can toggle lockdown from Admin Panel → Settings tab
- When locked: non-admin users see full-screen "App locked" overlay
- Lockdown state stored in `app_settings` table, checked every 30s on frontend

## Database Schema

- `schools` — id, name, status (pending/approved/denied), requested_by_user_id, created_at
- `users` — id, username (unique), password_hash, role, email (unique, nullable), email_verified, school_id (FK→schools), created_at
- `classes` — id, user_id, name, color, created_at
- `assignments` — id, user_id, class_id, title, notes, due_date, priority, completed, created_at
- `resources` — id, user_id, class_id, type (link/image/note), title, content, created_at
- `email_verifications` — id, email, code, expires_at, used, created_at
- `app_settings` — id, key (unique), value, updated_at

## API Routes (all under `/api`)

### Auth
- `POST /api/auth/send-verification-code` — send email code (for teacher registration)
- `POST /api/auth/register` — create account (role, email, emailCode, schoolId optional)
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — get current session user (includes role)

### Public
- `GET /api/settings` — get app settings (lockdown status)
- `GET /api/schools` — list approved schools
- `POST /api/schools/request` — request a new school (sends email to admin)

### Protected (authenticated)
- `GET/POST /api/classes` — list/create classes
- `DELETE /api/classes/:id` — delete class
- `GET/POST /api/assignments` — list/create assignments
- `PUT/DELETE /api/assignments/:id` — update/delete assignment
- `GET/POST /api/resources` — list/create resources
- `DELETE /api/resources/:id` — delete resource

### Admin only (`requireRole("admin")`)
- `PUT /api/admin/settings` — toggle lockdown
- `GET /api/admin/users` — list all users
- `PUT /api/admin/users/:id` — change role/school
- `DELETE /api/admin/users/:id` — delete user
- `GET/POST /api/admin/schools` — list all / create school
- `PUT/DELETE /api/admin/schools/:id` — approve/deny/delete school

### School Admin + Admin
- `GET /api/admin/school-users` — list users in school
- `POST /api/admin/school-users/:id/remove` — remove user from school

## Development

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/student-dashboard run dev` — start frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
