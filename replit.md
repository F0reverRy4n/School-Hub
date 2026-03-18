# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Student productivity dashboard with macOS UI theme.

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

## Features

### Student Dashboard App (`artifacts/student-dashboard`)

- **Authentication**: Username-based login/register (no email)
  - Usernames: 4-20 characters, unique
  - Passwords: min 8 chars, must include at least 1 letter and 1 number
- **Assignments**: Track assignments with title, notes, class, due date, and priority (low/medium/high)
- **Classes**: Custom class management with colors
- **Notes/Resources**: Upload links, images (URL), and text notes organized by class folders

### Database Schema

- `users` — id, username (unique), password_hash, created_at
- `classes` — id, user_id, name, color, created_at
- `assignments` — id, user_id, class_id, title, notes, due_date, priority, completed, created_at
- `resources` — id, user_id, class_id, type (link/image/note), title, content, created_at

### API Routes (all under `/api`)

- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — get current session user
- `GET/POST /api/classes` — list/create classes
- `DELETE /api/classes/:id` — delete class
- `GET/POST /api/assignments` — list/create assignments
- `PUT/DELETE /api/assignments/:id` — update/delete assignment
- `GET/POST /api/resources` — list/create resources
- `DELETE /api/resources/:id` — delete resource

## Development

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/student-dashboard run dev` — start frontend
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
