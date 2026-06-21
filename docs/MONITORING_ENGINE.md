# Monitoring Engine

Real-time candidate behavior monitoring during interviews.

---

## Overview

The monitoring engine tracks candidate actions via browser events and AI face detection. Each event is stored, triggers a trust score update, and broadcasts to recruiters in real-time.

---

## Browser Events

### TAB_SWITCH
- **Detection**: `document.visibilitychange` → hidden state
- **Trust Score**: -5
- **Description**: Candidate switched to another browser tab

### WINDOW_BLUR
- **Detection**: `window.blur` event
- **Trust Score**: -3
- **Description**: Candidate's window lost focus

### COPY
- **Detection**: `document.copy` event
- **Trust Score**: -10
- **Description**: Candidate copied content to clipboard

### PASTE
- **Detection**: `document.paste` event + Monaco `onDidPaste`
- **Trust Score**: -15
- **Description**: Candidate pasted content from clipboard

### FULLSCREEN_EXIT
- **Detection**: `document.fullscreenchange` → no fullscreen element
- **Trust Score**: -10
- **Description**: Candidate exited fullscreen mode

### DEVTOOLS_OPEN
- **Detection**: Detected via keyboard shortcuts or DevTools API
- **Trust Score**: -20
- **Description**: Candidate opened browser developer tools

---

## Face Events (AI-Powered)

### NO_FACE
- **Detection**: MediaPipe FaceLandmarker finds 0 faces
- **Trust Score**: -15
- **Description**: No face visible in camera feed

### MULTIPLE_FACE
- **Detection**: MediaPipe FaceLandmarker finds 2+ faces
- **Trust Score**: -20
- **Description**: More than one person visible in camera

### FACE_AWAY
- **Detection**: Gaze direction analysis via facial landmarks
- **Trust Score**: -5
- **Description**: Candidate looking away from screen (left, right, or down)

---

## Event Processing Pipeline

```
Candidate Action
    ↓
Frontend Detection:
  - Browser events → MonitoringService listeners
  - Face events → FaceMediaPipeService face detection
    ↓
Event Validation:
  - Debounce check (1.5s browser / 4s face)
  - Verify monitoring is active
  - Verify interview/candidate IDs exist
    ↓
POST /api/v1/monitoring/event
    ↓
Backend Processing:
  1. Validate request with Zod schema
  2. Verify interview and candidate exist
  3. Create MonitoringEvent document
  4. Update trust score via updateTrustScore()
  5. Broadcast monitoring-event via Socket.IO
  6. Broadcast trust-score-updated via Socket.IO
    ↓
Frontend Updates:
  - Recruiter dashboard shows new event
  - Trust score updates in real-time
  - Live feed receives event notification
```

---

## Debounce Mechanism

To prevent duplicate events from being logged:

- **Browser events**: 1.5 second debounce window
- **Face events**: 4 second debounce window per event type

```typescript
// Frontend debounce check
if (now - lastFired < debounceThresholdMs) {
  return; // Skip duplicate
}
```

---

## Event Storage

Each event is stored as a MonitoringEvent document:

```typescript
{
  interviewId: ObjectId,     // Reference to interview
  candidateId: ObjectId,     // Reference to candidate
  eventType: string,         // Event type enum
  timestamp: Date            // When event occurred
}
```

---

## Real-Time Broadcast

After storing an event, two Socket.IO events are emitted:

1. **monitoring-event**: Full event data to all users in the interview room
2. **trust-score-updated**: Updated score to all users in the interview room

```typescript
// monitoring-event payload
{
  _id: string,
  interviewId: string,
  candidateId: { _id, name, email, role },
  eventType: string,
  timestamp: ISO8601
}

// trust-score-updated payload
{
  candidateId: string,
  score: number,
  eventType: string
}
```

---

## Frontend Integration

### MonitoringService (Browser Events)
- Registers global event listeners on `startMonitoring()`
- Removes all listeners on `stopMonitoring()`
- Sends events via HTTP POST with debounce
- Uses NgZone.runOutsideAngular() for non-blocking listeners

### FaceMediaPipeService (AI Events)
- Loads MediaPipe FaceLandmarker model (lazy-loaded)
- Analyzes frames from existing WebRTC stream every 1.2s
- GPU-accelerated via delegate: 'GPU'
- Does NOT open a second camera

### Recruiter Dashboard
- Listens for `monitoring-event` via Socket.IO
- Updates live feed with new events
- Updates candidate trust scores in real-time
- Shows event statistics in expanded candidate cards
