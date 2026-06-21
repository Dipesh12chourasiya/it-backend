# API Reference

Complete documentation of all REST API endpoints consumed by the frontend.

Base URL: `http://localhost:5000/api/v1`

---

## Authentication APIs

### POST /auth/register

**Description**: Register a new user account.

**Authentication Required**: No

**Request Body**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "recruiter" | "candidate"
}
```

**Response (201)**:
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

**Error Responses**:
- 400: Validation error
- 400: Email already exists

---

### POST /auth/login

**Description**: Authenticate user and return JWT.

**Authentication Required**: No

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200)**:
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

**Error Responses**:
- 401: Invalid credentials

---

## Interview APIs

### POST /interviews

**Description**: Create a new interview (recruiter only).

**Authentication Required**: Yes (recruiter)

**Request Body**:
```json
{
  "title": "string",
  "description": "string",
  "startTime": "ISO8601",
  "endTime": "ISO8601"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "title": "string",
    "description": "string",
    "interviewCode": "ABC123",
    "startTime": "ISO8601",
    "endTime": "ISO8601",
    "status": "scheduled",
    "createdAt": "ISO8601"
  }
}
```

---

### GET /interviews

**Description**: Get all interviews created by the recruiter.

**Authentication Required**: Yes (recruiter)

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "title": "string",
      "interviewCode": "string",
      "status": "scheduled" | "active" | "completed",
      "startTime": "ISO8601"
    }
  ]
}
```

---

### GET /interviews/:id

**Description**: Get details of a single interview.

**Authentication Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "title": "string",
    "description": "string",
    "interviewCode": "string",
    "startTime": "ISO8601",
    "endTime": "ISO8601",
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

---

### PUT /interviews/:id

**Description**: Update interview details or status.

**Authentication Required**: Yes (recruiter)

**Request Body**:
```json
{
  "title": "string (optional)",
  "status": "scheduled" | "active" | "completed"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": { /* updated interview */ }
}
```

---

### DELETE /interviews/:id

**Description**: Delete an interview.

**Authentication Required**: Yes (recruiter)

**Response (200)**:
```json
{
  "success": true,
  "message": "Interview deleted"
}
```

---

### POST /interviews/join

**Description**: Join an interview by access code.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "interviewCode": "ABC123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": { /* interview details */ }
}
```

**Error Responses**:
- 404: Invalid interview code

---

## Session APIs

### POST /sessions/start

**Description**: Start a new candidate interview session.

**Authentication Required**: Yes (candidate)

**Request Body**:
```json
{
  "interviewId": "string"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "interviewId": "string",
    "candidateId": "string",
    "joinedAt": "ISO8601",
    "status": "active",
    "score": 100
  }
}
```

---

### POST /sessions/end

**Description**: End an active candidate session.

**Authentication Required**: Yes (candidate)

**Request Body**:
```json
{
  "sessionId": "string"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "status": "left",
    "leftAt": "ISO8601"
  }
}
```

---

### GET /sessions/active/:interviewId

**Description**: Get active session for current candidate and interview.

**Authentication Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "interviewId": "object",
    "status": "active",
    "score": 85
  }
}
```

---

### GET /sessions/:id

**Description**: Get session details.

**Authentication Required**: Yes (recruiter or session owner)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "interviewId": "object (populated)",
    "candidateId": "object (populated)",
    "joinedAt": "ISO8601",
    "leftAt": "ISO8601",
    "status": "string",
    "score": 85
  }
}
```

---

## Monitoring APIs

### POST /monitoring/event

**Description**: Log a candidate behavior event.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "interviewId": "string",
  "candidateId": "string",
  "eventType": "TAB_SWITCH" | "WINDOW_BLUR" | "COPY" | "PASTE" | "FULLSCREEN_EXIT" | "DEVTOOLS_OPEN" | "NO_FACE" | "MULTIPLE_FACE" | "FACE_AWAY"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "interviewId": "string",
    "candidateId": "string",
    "eventType": "string",
    "timestamp": "ISO8601"
  }
}
```

**Side Effects**:
- Updates trust score in candidate session
- Emits `monitoring-event` via Socket.IO
- Emits `trust-score-updated` via Socket.IO

---

### GET /monitoring/events/:interviewId

**Description**: Get all monitoring events for an interview.

**Authentication Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "interviewId": "string",
      "candidateId": { "_id": "string", "name": "string", "email": "string" },
      "eventType": "string",
      "timestamp": "ISO8601"
    }
  ]
}
```

---

## Dashboard APIs

### GET /dashboard/interview/:interviewId

**Description**: Get full dashboard data for an interview.

**Authentication Required**: Yes (recruiter)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "interview": {
      "_id": "string",
      "title": "string",
      "status": "string"
    },
    "candidates": [
      {
        "candidateId": "string",
        "candidateName": "string",
        "candidateEmail": "string",
        "trustScore": 85,
        "riskLevel": "LOW",
        "status": "active",
        "connectionStatus": "ONLINE",
        "lastActivity": "ISO8601",
        "statistics": {
          "totalTabSwitches": 2,
          "totalPasteEvents": 1,
          "totalCopyEvents": 0,
          "totalFullscreenExits": 0,
          "totalNoFaceEvents": 0,
          "totalMultipleFaceEvents": 0,
          "totalFaceAwayEvents": 1,
          "totalMonitoringEvents": 4
        },
        "recentEvents": [
          {
            "_id": "string",
            "eventType": "TAB_SWITCH",
            "timestamp": "ISO8601"
          }
        ]
      }
    ]
  }
}
```

---

### GET /dashboard/candidate/:candidateId

**Description**: Get detailed dashboard data for a single candidate.

**Authentication Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "candidate": {
      "_id": "string",
      "name": "string",
      "email": "string"
    },
    "trustScore": 85,
    "riskLevel": "LOW",
    "sessions": [ /* session list */ ],
    "statistics": { /* event counts */ },
    "recentEvents": [ /* recent events */ ]
  }
}
```

---

## Reports APIs

### GET /reports/interview/:interviewId

**Description**: Generate a rule-based risk report for a candidate.

**Authentication Required**: Yes (recruiter)

**Query Parameters**:
- `candidateId` (required): ID of the candidate

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "interviewSummary": "Candidate participated in a 47 minute interview session...",
    "riskSummary": "Final Trust Score: 84 Risk Level: LOW...",
    "behaviorAnalysis": "2 tab switches detected. 1 paste event detected...",
    "finalRecommendation": "RECOMMENDED — Candidate demonstrated consistent interview behavior...",
    "trustScore": 84,
    "riskLevel": "LOW",
    "statistics": {
      "tabSwitches": 2,
      "copyEvents": 0,
      "pasteEvents": 1,
      "fullscreenExits": 0,
      "noFaceEvents": 0,
      "multipleFaceEvents": 0,
      "faceAwayEvents": 0,
      "interviewDurationMinutes": 47
    }
  }
}
```

---

### GET /reports/interview/:interviewId/pdf

**Description**: Download a PDF report for a candidate.

**Authentication Required**: Yes (recruiter)

**Query Parameters**:
- `candidateId` (required): ID of the candidate

**Response**: Binary PDF file with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="interview-report-{interviewId}.pdf"
```

---

## Workspace APIs

### GET /workspace/:interviewId

**Description**: Get workspace data for an interview.

**Authentication Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "language": "javascript",
    "code": "function hello() { console.log('Hello'); }",
    "whiteboardData": {
      "elements": [ /* drawing elements */ ]
    }
  }
}
```

---

### PUT /workspace/:interviewId

**Description**: Update workspace data.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "language": "typescript",
  "code": "const greeting: string = 'Hello';",
  "whiteboardData": { /* elements */ }
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": { /* updated workspace */ }
}
```

---

## Common Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "stack": "Error stack trace (development only)"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |
