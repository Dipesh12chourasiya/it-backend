# Database Schema

MongoDB collections used by Interview Guard AI.

---

## Users Collection

**Purpose**: Stores user accounts (recruiters and candidates).

**Model**: `auth.model.ts`

```typescript
interface IUser {
  name: string;
  email: string;
  password: string;        // bcrypt hashed
  role: "recruiter" | "candidate";
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `email` — unique, required

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "name": "John Recruiter",
  "email": "john@company.com",
  "password": "$2a$10$hashed...",
  "role": "recruiter",
  "createdAt": ISODate("2026-06-18T10:00:00Z"),
  "updatedAt": ISODate("2026-06-18T10:00:00Z")
}
```

---

## Interviews Collection

**Purpose**: Stores interview sessions created by recruiters.

**Model**: `interview.model.ts`

```typescript
interface IInterview {
  title: string;
  description: string;
  recruiterId: ObjectId;      // ref → User
  interviewCode: string;      // unique 6-char alphanumeric
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `interviewCode` — unique, indexed

**Relationships**:
- `recruiterId` → Users._id

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "title": "Senior Developer Interview",
  "description": "Technical assessment for backend role",
  "recruiterId": ObjectId("..."),
  "interviewCode": "ABC123",
  "startTime": ISODate("2026-06-20T14:00:00Z"),
  "endTime": ISODate("2026-06-20T15:00:00Z"),
  "status": "active",
  "createdAt": ISODate("2026-06-18T10:00:00Z"),
  "updatedAt": ISODate("2026-06-20T14:00:00Z")
}
```

---

## Sessions Collection

**Purpose**: Tracks candidate participation in interviews.

**Model**: `session.model.ts`

```typescript
interface ISession {
  interviewId: ObjectId;      // ref → Interview
  candidateId: ObjectId;      // ref → User
  joinedAt: Date;
  leftAt?: Date;
  status: "waiting" | "active" | "completed" | "left";
  score: number;              // trust score (0-100)
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- Compound: `{ interviewId: 1, candidateId: 1, status: 1 }`

**Relationships**:
- `interviewId` → Interviews._id
- `candidateId` → Users._id

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "interviewId": ObjectId("..."),
  "candidateId": ObjectId("..."),
  "joinedAt": ISODate("2026-06-20T14:05:00Z"),
  "leftAt": ISODate("2026-06-20T14:52:00Z"),
  "status": "left",
  "score": 85,
  "createdAt": ISODate("2026-06-20T14:05:00Z"),
  "updatedAt": ISODate("2026-06-20T14:52:00Z")
}
```

---

## MonitoringEvents Collection

**Purpose**: Stores all candidate behavior events detected during interviews.

**Model**: `monitoring.model.ts`

```typescript
interface IMonitoringEvent {
  interviewId: ObjectId;      // ref → Interview
  candidateId: ObjectId;      // ref → User
  eventType: "TAB_SWITCH" | "WINDOW_BLUR" | "COPY" | "PASTE" |
             "FULLSCREEN_EXIT" | "DEVTOOLS_OPEN" | "NO_FACE" |
             "MULTIPLE_FACE" | "FACE_AWAY";
  timestamp: Date;
}
```

**Indexes**:
- Compound: `{ interviewId: 1, candidateId: 1 }`

**Relationships**:
- `interviewId` → Interviews._id
- `candidateId` → Users._id

**Event Types**:

| Event | Category | Trust Score Impact |
|---|---|---|
| TAB_SWITCH | Browser | -5 |
| WINDOW_BLUR | Browser | -3 |
| COPY | Clipboard | -10 |
| PASTE | Clipboard | -15 |
| FULLSCREEN_EXIT | Browser | -10 |
| DEVTOOLS_OPEN | Browser | -20 |
| NO_FACE | Face AI | -15 |
| MULTIPLE_FACE | Face AI | -20 |
| FACE_AWAY | Face AI | -5 |

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "interviewId": ObjectId("..."),
  "candidateId": ObjectId("..."),
  "eventType": "TAB_SWITCH",
  "timestamp": ISODate("2026-06-20T14:15:30Z")
}
```

---

## Workspaces Collection

**Purpose**: Stores collaborative workspace state (code editor + whiteboard).

**Model**: `workspace.model.ts`

```typescript
interface IWorkspace {
  interviewId: ObjectId;      // ref → Interview (unique)
  language: string;           // javascript | typescript | python | java | cpp
  code: string;               // current code content
  whiteboardData: Record<string, any>;  // whiteboard elements
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `interviewId` — unique

**Relationships**:
- `interviewId` → Interviews._id (one-to-one)

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "interviewId": ObjectId("..."),
  "language": "javascript",
  "code": "function sort(arr) {\n  return arr.sort((a, b) => a - b);\n}",
  "whiteboardData": {
    "elements": [
      {
        "type": "path",
        "points": [{"x": 100, "y": 100}, {"x": 200, "y": 150}],
        "color": "#ffffff",
        "size": 3
      }
    ]
  },
  "createdAt": ISODate("2026-06-20T14:05:00Z"),
  "updatedAt": ISODate("2026-06-20T14:30:00Z")
}
```

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    Users    │       │   Interviews    │       │   Sessions  │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ _id (PK)    │◄──┐   │ _id (PK)        │◄──┐   │ _id (PK)    │
│ name        │   │   │ title           │   │   │ interviewId │──┐
│ email (UQ)  │   │   │ description     │   │   │ candidateId │──┼──► Users
│ password    │   │   │ recruiterId     │───┼──►│ joinedAt    │  │
│ role        │   │   │ interviewCode   │   │   │ leftAt      │  │
│ timestamps  │   │   │ startTime       │   │   │ status      │  │
└─────────────┘   │   │ endTime         │   │   │ score       │  │
                  │   │ status          │   │   │ timestamps  │  │
                  │   │ timestamps      │   │   └─────────────┘  │
                  │   └─────────────────┘   │                    │
                  │                         │   ┌────────────────┘
                  │   ┌─────────────────┐   │   │
                  │   │MonitoringEvents │   │   │
                  │   ├─────────────────┤   │   │
                  │   │ _id (PK)        │   │   │
                  ├───│ interviewId     │───┘   │
                  │   │ candidateId     │───────┘
                  │   │ eventType       │
                  │   │ timestamp       │
                  │   └─────────────────┘
                  │
                  │   ┌─────────────────┐
                  │   │   Workspaces    │
                  │   ├─────────────────┤
                  │   │ _id (PK)        │
                  └───│ interviewId (UQ)│
                      │ language        │
                      │ code            │
                      │ whiteboardData  │
                      │ timestamps      │
                      └─────────────────┘
```

---

## Notes

1. **No separate TrustScore collection**: Trust scores are stored directly in the `Sessions` collection's `score` field.
2. **No separate Reports collection**: Reports are generated dynamically from existing data (MonitoringEvents + Sessions + Interviews).
3. **Workspace is interview-scoped**: One workspace per interview, shared between recruiter and candidate.
4. **Monitoring events are append-only**: Events are never deleted or updated after creation.
5. **Session uniqueness**: A candidate cannot have multiple active sessions for the same interview.
