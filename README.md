# Interview Guard AI — Backend

Node.js/Express backend powering the Interview Guard AI platform. Handles authentication, interview management, real-time monitoring, trust scoring, WebRTC signaling, and report generation.

## Overview

The backend serves as the API and real-time communication layer for Interview Guard AI. It processes monitoring events, calculates trust scores, manages collaborative workspaces, and generates risk reports with PDF export.

## Core Features

- **Authentication & RBAC** — JWT-based with role-based access control
- **Interview Management** — CRUD operations with unique access codes
- **Real-Time Monitoring** — Event logging with trust score deductions
- **Face Monitoring** — NO_FACE, MULTIPLE_FACE, FACE_AWAY event support
- **Trust Score Engine** — 100-point baseline with event-based deductions
- **WebRTC Signaling** — SDP offer/answer and ICE candidate exchange
- **Workspace Sync** — Real-time code and whiteboard synchronization
- **Reports & PDF Export** — Rule-based risk reports with pdfkit generation

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express 5 | HTTP framework |
| TypeScript 6 | Type-safe development |
| MongoDB / Mongoose 9 | Database |
| Socket.IO 4 | Real-time communication |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| Zod | Request validation |
| pdfkit | PDF report generation |
| Helmet | Security headers |
| Morgan | Request logging |

## Installation

```bash
git clone https://github.com/your-org/interview-guard-ai.git
cd interview-guard-ai/backend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/interview-guard-ai
JWT_SECRET=your_jwt_secret_here
```

## Running Locally

```bash
npm run dev       # Development (hot reload)
npm run build     # TypeScript compilation
npm start         # Production
npx tsc --noEmit  # Type check
```

## Folder Structure

```
backend/src/
├── config/              # DB connection, env vars
├── middleware/           # Auth, error handling, RBAC
├── modules/
│   ├── auth/            # Registration, login, JWT
│   ├── interviews/      # Interview CRUD
│   ├── sessions/        # Candidate sessions
│   ├── monitoring/      # Behavior event logging
│   ├── trust-score/     # Score calculation
│   ├── dashboard/       # Recruiter dashboard APIs
│   ├── reports/         # Risk reports + PDF
│   └── workspace/       # Code/whiteboard sync
├── routes/              # Route aggregator
├── socket/              # Socket.IO server
├── utils/               # Error classes, JWT helpers
├── app.ts               # Express app setup
└── server.ts            # Server bootstrap
```

## API Overview

| Module | Base Path | Purpose |
|---|---|---|
| Auth | `/api/v1/auth` | Registration, login |
| Interviews | `/api/v1/interviews` | Interview CRUD |
| Sessions | `/api/v1/sessions` | Session lifecycle |
| Monitoring | `/api/v1/monitoring` | Event logging |
| Dashboard | `/api/v1/dashboard` | Recruiter dashboard |
| Reports | `/api/v1/reports` | Risk reports, PDF |
| Workspace | `/api/v1/workspace` | Code/whiteboard |

## Socket.IO Overview

| Event | Direction | Purpose |
|---|---|---|
| `join-interview` | Client→Server | Join interview room |
| `webrtc-offer/answer` | Client↔Server | WebRTC signaling |
| `monitoring-event` | Server→Client | Broadcast behavior events |
| `trust-score-updated` | Server→Client | Broadcast score changes |
| `workspace-sync` | Server→Client | Sync workspace state |
| `code-change` | Client↔Server | Real-time code sync |

## Database Overview

| Collection | Purpose |
|---|---|
| Users | User accounts (recruiter/candidate) |
| Interviews | Interview sessions |
| Sessions | Candidate participation tracking |
| MonitoringEvents | Behavior event logs |
| Workspaces | Code/whiteboard state |

## Documentation

See the `docs/` directory for detailed documentation:

- [Backend Architecture](docs/BACKEND_ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Socket.IO Events](docs/SOCKET_EVENTS.md)
- [Authentication Flow](docs/AUTH_FLOW.md)
- [Trust Score Engine](docs/TRUST_SCORE_ENGINE.md)
- [Monitoring Engine](docs/MONITORING_ENGINE.md)
- [Reports Module](docs/REPORTS_MODULE.md)
- [WebRTC Signaling](docs/WEBRTC_SIGNALING.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)

## License

MIT License
