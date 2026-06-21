# Trust Score Engine

Automated trust score calculation based on candidate behavior events during interviews.

---

## Overview

The Trust Score Engine monitors candidate behavior in real-time and deducts points for suspicious activities. The final score determines a candidate's risk level and recommendation.

**Starting Score**: 100 points
**Minimum Score**: 0 points (never goes negative)
**Storage**: Stored in `Sessions.score` field

---

## Penalty Rules

| Event Type | Points Deducted | Category |
|---|---|---|
| TAB_SWITCH | -5 | Browser |
| WINDOW_BLUR | -3 | Browser |
| COPY | -10 | Clipboard |
| PASTE | -15 | Clipboard |
| FULLSCREEN_EXIT | -10 | Browser |
| DEVTOOLS_OPEN | -20 | Browser |
| NO_FACE | -15 | Face AI |
| MULTIPLE_FACE | -20 | Face AI |
| FACE_AWAY | -5 | Face AI |

---

## Risk Levels

| Score Range | Risk Level | Color | Recommendation |
|---|---|---|---|
| 80 - 100 | LOW | Green | RECOMMENDED |
| 50 - 79 | MEDIUM | Amber | REVIEW REQUIRED |
| 0 - 49 | HIGH | Red | HIGH RISK CANDIDATE |

---

## Calculation Logic

```
┌─────────────────────────────────────────────────────────┐
│                    Trust Score Engine                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Starting Score: 100                                     │
│                                                          │
│  For each monitoring event:                              │
│    ┌─────────────────────────────────────────────────┐  │
│    │ 1. Receive event from MonitoringService         │  │
│    │ 2. Look up penalty in SCORE_DEDUCTIONS map      │  │
│    │ 3. Calculate: newScore = currentScore - penalty │  │
│    │ 4. Apply floor: newScore = max(0, newScore)     │  │
│    │ 5. Update session.score in MongoDB              │  │
│    │ 6. Emit trust-score-updated via Socket.IO       │  │
│    └─────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Event Processing Flow

```
Candidate Action (e.g., tab switch)
        ↓
Frontend MonitoringService detects event
        ↓
POST /api/v1/monitoring/event
        ↓
MonitoringService.createEvent()
        ↓
┌─────────────────────────────────────┐
│ Save event to MonitoringEvents      │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ updateTrustScore()                  │
│   - Find active session             │
│   - Look up penalty                 │
│   - Calculate new score             │
│   - Save to session.score           │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ Socket.IO Events:                   │
│   - monitoring-event (to room)      │
│   - trust-score-updated (to room)   │
└─────────────────────────────────────┘
        ↓
Recruiter Dashboard updates in real-time
```

---

## Example Scenarios

### Scenario 1: Good Candidate
```
Start: 100
Tab switch: -5 → 95
Tab switch: -5 → 90
Tab switch: -5 → 85
Paste: -15 → 70
End Score: 70
Risk Level: MEDIUM
Recommendation: REVIEW REQUIRED
```

### Scenario 2: Bad Candidate
```
Start: 100
Tab switch: -5 → 95
Paste: -15 → 80
DevTools: -20 → 60
No face: -15 → 45
Multiple face: -20 → 25
Face away: -5 → 20
Tab switch: -5 → 15
Paste: -15 → 0
End Score: 0
Risk Level: HIGH
Recommendation: HIGH RISK CANDIDATE
```

---

## Database Impact

**Session Document Update**:
```json
{
  "_id": ObjectId("..."),
  "score": 70,  // Updated by trust score engine
  "status": "active"
}
```

**Monitoring Event Creation**:
```json
{
  "_id": ObjectId("..."),
  "eventType": "TAB_SWITCH",
  "timestamp": ISODate("..."),
  "interviewId": ObjectId("..."),
  "candidateId": ObjectId("...")
}
```

---

## Real-Time Updates

The trust score engine broadcasts two events via Socket.IO:

1. **monitoring-event**: Raw event data for the live feed
2. **trust-score-updated**: Updated score for the UI

**Payload**:
```typescript
{
  candidateId: string,
  score: number,
  eventType: string
}
```

**Frontend Handling**:
- Updates candidate card score in real-time
- Updates live feed with new event
- Triggers UI animation for score change
