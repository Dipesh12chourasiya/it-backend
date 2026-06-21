# Backend Architecture

## Overview

The Interview Guard AI backend follows a **modular monolith** architecture built on Express.js with TypeScript. Each feature domain is encapsulated in its own module with dedicated model, service, controller, and route files.

## Directory Structure

```
backend/src/
├── config/
│   ├── db.ts              # MongoDB connection setup
│   └── env.ts             # Environment variable loading
├── middleware/
│   ├── auth.middleware.ts  # JWT authentication middleware
│   ├── error.middleware.ts # Global error handler (Zod, Mongoose, AppError)
│   └── role.middleware.ts  # Role-based access control
├── modules/
│   ├── auth/              # User registration, login, JWT
│   ├── interviews/        # Interview CRUD and management
│   ├── sessions/          # Candidate session lifecycle
│   ├── monitoring/        # Behavior event logging
│   ├── trust-score/       # Score calculation engine
│   ├── dashboard/         # Recruiter dashboard aggregation
│   ├── reports/           # Risk report and PDF generation
│   └── workspace/         # Collaborative code/whiteboard sync
├── routes/
│   └── index.ts           # Central route aggregator
├── socket/
│   └── socket.server.ts   # Socket.IO initialization and event handlers
├── utils/
│   ├── errors.ts          # AppError class
│   └── jwt.ts             # JWT token generation
├── app.ts                 # Express app configuration
└── server.ts              # HTTP server + Socket.IO bootstrap
```

## Layer Responsibilities

### `config/` — Configuration

- **db.ts**: Connects to MongoDB using Mongoose. Exits process on failure.
- **env.ts**: Loads `.env` via dotenv. Exports typed `env` object with `PORT`, `MONGO_URI`, `JWT_SECRET`.

### `middleware/` — Request Pipeline

- **auth.middleware.ts** (`protect`): Extracts JWT from `Authorization: Bearer <token>`, verifies with `jwt.verify`, attaches `req.user` from database lookup.
- **error.middleware.ts** (`errorHandler`): Catches all errors. Handles Zod validation errors (400), Mongoose CastError (400), duplicate key errors (400), and unexpected errors (500). Returns structured JSON response.
- **role.middleware.ts** (`authorize`): Factory that returns middleware checking `req.user.role` against allowed roles.

### `modules/` — Feature Modules

Each module follows this structure:

```
module-name/
├── model.ts       # Mongoose schema and interface
├── service.ts     # Business logic (data access + rules)
├── controller.ts  # HTTP request handlers (thin — delegates to service)
├── routes.ts      # Express Router with middleware
└── validation.ts  # Zod schemas for request validation (optional)
```

**Module Inventory:**

| Module | Models | Purpose |
|---|---|---|
| `auth` | User | Registration, login, password hashing |
| `interviews` | Interview | CRUD, status management, access codes |
| `sessions` | Session | Candidate session lifecycle |
| `monitoring` | MonitoringEvent | Behavior event storage |
| `trust-score` | — (uses Session) | Score calculation |
| `dashboard` | — (aggregation) | Recruiter dashboard data |
| `reports` | — (read-only) | Risk report + PDF generation |
| `workspace` | Workspace | Code/whiteboard persistence |

### `routes/` — Route Aggregation

`index.ts` mounts all module routers under `/api/v1`:

```
/api/v1/auth          → Auth routes (public)
/api/v1/interviews    → Interview routes (protected)
/api/v1/sessions      → Session routes (protected)
/api/v1/monitoring    → Monitoring routes (protected)
/api/v1/dashboard     → Dashboard routes (protected)
/api/v1/reports       → Report routes (protected)
/api/v1/workspace     → Workspace routes (protected)
```

### `socket/` — Real-Time Communication

`socket.server.ts` handles:
- JWT authentication on connection
- Interview room join/leave
- WebRTC signaling (offer, answer, ICE candidates)
- Trust score updates broadcast
- Monitoring event broadcast
- Candidate join/leave notifications

### `utils/` — Shared Utilities

- **errors.ts**: `AppError` class with `statusCode` and `isOperational` flag.
- **jwt.ts**: `generateToken(userId)` using `jsonwebtoken`.

## Request Lifecycle

```
Client Request
    ↓
Express Middleware Pipeline:
  1. express.json()     — Parse JSON body
  2. cors()             — Enable CORS
  3. helmet()           — Security headers
  4. morgan('dev')      — Request logging
    ↓
Route Matching (/api/v1/...)
    ↓
Route Middleware:
  1. protect            — JWT verification (if protected route)
  2. authorize(roles)   — Role check (if role-restricted)
    ↓
Controller Handler
    ↓
Service Layer (business logic + DB queries)
    ↓
Response or Error
    ↓
errorHandler middleware (if error thrown)
    ↓
JSON Response to Client
```

## Key Design Decisions

1. **Thin Controllers**: Controllers parse requests and delegate to services. No business logic in controllers.
2. **Service Layer**: All database queries and business rules live in service files.
3. **Zod Validation**: Request validation uses Zod schemas with descriptive error messages.
4. **AppError Pattern**: Custom `AppError` class for operational errors with HTTP status codes.
5. **Modular Routers**: Each module has its own Express Router, composed in `routes/index.ts`.
6. **Socket.IO Auth**: Socket connections are authenticated via JWT in the handshake, same as REST.
