# Developer Guide

Onboarding guide for new backend developers.

---

## Project Structure

```
backend/src/
├── config/           # DB connection, env vars
├── middleware/        # Auth, error handling, RBAC
├── modules/          # Feature modules (one per domain)
├── routes/           # Route aggregator
├── socket/           # Socket.IO server
├── utils/            # Error classes, JWT helpers
├── app.ts            # Express app setup
└── server.ts         # HTTP server bootstrap
```

---

## How to Add a New Module

1. Create directory: `src/modules/{module-name}/`
2. Create files:
   - `model.ts` — Mongoose schema and interface
   - `service.ts` — Business logic
   - `controller.ts` — HTTP handlers (thin)
   - `routes.ts` — Express Router
   - `validation.ts` — Zod schemas (optional)
3. Register router in `src/routes/index.ts`:
   ```typescript
   import {Router} from "express";
   import {protect} from "../middleware/auth.middleware";

   const router = Router();
   router.use("/new-module", newModuleRoutes);
   ```
4. Run `npx tsc --noEmit` to verify compilation.

---

## How to Create an API

```typescript
// 1. Validation (Zod)
import {z} from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// 2. Service (business logic)
export const createItem = async (data: { name: string }) => {
  const item = await Item.create(data);
  return item;
};

// 3. Controller (HTTP handler)
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createItemSchema.parse(req.body);
    const item = await createItem(validated);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// 4. Routes
router.post("/", protect, create);
```

---

## How Authentication Works

1. **Login**: User sends email + password → Server validates → Returns JWT
2. **Request**: Client sends `Authorization: Bearer <token>` header
3. **Middleware**: `protect` middleware extracts and verifies JWT → Attaches `req.user`
4. **RBAC**: `authorize('recruiter')` middleware checks `req.user.role`

---

## How Socket.IO Works

1. **Connection**: Client connects with JWT token in handshake
2. **Authentication**: Server verifies token → Attaches user to socket
3. **Rooms**: Users join `interview:{id}` rooms
4. **Events**: Server broadcasts events to room members
5. **Cleanup**: Users leave rooms on disconnect

---

## How Monitoring Works

1. Frontend `MonitoringService` registers browser event listeners
2. Events are debounced (1.5s) and POSTed to `/api/v1/monitoring/event`
3. Backend validates event → Stores in MonitoringEvents collection
4. Backend updates trust score → Emits Socket.IO events
5. Recruiter dashboard receives updates in real-time

---

## How Trust Score Works

1. Score starts at 100
2. Each event has a penalty (e.g., TAB_SWITCH = -5)
3. `updateTrustScore()` calculates: `newScore = max(0, currentScore - penalty)`
4. Score is saved to `Sessions.score`
5. `trust-score-updated` event is emitted via Socket.IO

---

## How Report Generation Works

1. Request: `GET /api/v1/reports/interview/:id?candidateId=:cid`
2. Service aggregates: MonitoringEvents + Session + Interview
3. Generates 4 text sections from event counts and score
4. Returns JSON report or PDF (if `/pdf` endpoint)

---

## Coding Conventions

- **TypeScript strict mode** enabled
- **Zod** for request validation
- **AppError** class for operational errors (throws in service, caught by errorHandler)
- **Service layer** handles all DB queries — controllers stay thin
- **Express 5** — route handlers return void, errors go to next()
- **Mongoose 9** — use `new mongoose.Types.ObjectId()` for queries
- **No `console.log` in production** — use structured logging if needed
