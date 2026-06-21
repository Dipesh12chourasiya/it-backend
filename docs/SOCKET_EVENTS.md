# Socket.IO Events

Complete documentation of all real-time events handled by the Socket.IO server.

---

## Connection

**Authentication**: JWT token in handshake auth

```typescript
socket = io('http://localhost:5000', {
  auth: { token: 'jwt_token_string' }
});
```

**Server validates**: Token → User lookup → Attach user to socket

---

## Interview Room Events

### join-interview

**Direction**: Client → Server

**Payload**:
```typescript
interviewId: string
```

**Purpose**: Join an interview-specific room for real-time updates.

**Server Actions**:
- Joins socket to room `interview:{interviewId}`
- Emits `peer-joined` to other users in the room
- If user is candidate, emits `candidate-joined` to recruiters

---

### leave-interview

**Direction**: Client → Server

**Payload**:
```typescript
interviewId: string
```

**Purpose**: Leave an interview room.

**Server Actions**:
- Leaves socket from room `interview:{interviewId}`
- Emits `peer-left` to other users
- If user is candidate, emits `candidate-left` to recruiters

---

### peer-joined

**Direction**: Server → Client

**Payload**:
```typescript
{
  userId: string,
  userName: string,
  role: string,
  socketId: string
}
```

**Purpose**: Notify other users that a new participant joined the room.

---

### peer-left

**Direction**: Server → Client

**Payload**:
```typescript
{
  userId: string,
  userName: string,
  role: string,
  socketId: string
}
```

**Purpose**: Notify other users that a participant left the room.

---

### candidate-joined

**Direction**: Server → Client (Recruiters only)

**Payload**:
```typescript
{
  candidateId: string,
  candidateName: string,
  candidateEmail: string,
  interviewId: string,
  timestamp: string
}
```

**Purpose**: Notify recruiters that a candidate joined the interview.

---

### candidate-left

**Direction**: Server → Client (Recruiters only)

**Payload**:
```typescript
{
  candidateId: string,
  candidateName: string,
  candidateEmail: string,
  interviewId: string,
  timestamp: string
}
```

**Purpose**: Notify recruiters that a candidate left the interview.

---

## WebRTC Signaling Events

### webrtc-offer

**Direction**: Client → Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  offer: RTCSessionDescriptionInit
}
```

**Server Actions**:
- Broadcasts to other users in the interview room

**Server Emits**:
```typescript
{
  offer: RTCSessionDescriptionInit,
  senderId: string,
  userName: string,
  role: string
}
```

---

### webrtc-answer

**Direction**: Client → Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  answer: RTCSessionDescriptionInit
}
```

**Server Actions**:
- Broadcasts to other users in the interview room

**Server Emits**:
```typescript
{
  answer: RTCSessionDescriptionInit,
  senderId: string
}
```

---

### webrtc-ice-candidate

**Direction**: Client → Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  candidate: RTCIceCandidateInit
}
```

**Server Actions**:
- Broadcasts to other users in the interview room

**Server Emits**:
```typescript
{
  candidate: RTCIceCandidateInit,
  senderId: string
}
```

---

## Monitoring Events

### monitoring-event

**Direction**: Server → Client (Broadcast)

**Payload**:
```typescript
{
  _id: string,
  interviewId: string,
  candidateId: {
    _id: string,
    name: string,
    email: string,
    role: string
  },
  eventType: string,
  timestamp: string
}
```

**Trigger**: When a monitoring event is logged via POST /monitoring/event

---

### trust-score-updated

**Direction**: Server → Client (Broadcast)

**Payload**:
```typescript
{
  candidateId: string,
  score: number,
  eventType: string
}
```

**Trigger**: When a trust score is updated after a monitoring event

---

## Workspace Events

### workspace-join

**Direction**: Client → Server

**Payload**:
```typescript
interviewId: string
```

**Purpose**: Join the collaborative workspace room.

**Server Actions**:
- Joins socket to room `workspace:{interviewId}`
- Sends current workspace state via `workspace-sync`

---

### workspace-leave

**Direction**: Client → Server

**Payload**:
```typescript
interviewId: string
```

**Purpose**: Leave the collaborative workspace room.

---

### workspace-sync

**Direction**: Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  language: string,
  code: string,
  whiteboardData: object
}
```

**Purpose**: Send current workspace state to a newly joined user.

---

### code-change

**Direction**: Client → Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  code: string,
  language: string
}
```

**Server Actions**:
- Broadcasts to other users in the workspace room

**Server Emits**:
```typescript
{
  interviewId: string,
  code: string,
  language: string,
  userId: string
}
```

---

### whiteboard-change

**Direction**: Client → Server → Client

**Payload**:
```typescript
{
  interviewId: string,
  whiteboardData: object
}
```

**Server Actions**:
- Broadcasts to other users in the workspace room

**Server Emits**:
```typescript
{
  interviewId: string,
  whiteboardData: object,
  userId: string
}
```

---

### workspace-save

**Direction**: Client → Server

**Payload**:
```typescript
{
  interviewId: string,
  code?: string,
  language?: string,
  whiteboardData?: object
}
```

**Purpose**: Persist workspace state to database.

**Server Actions**:
- Updates code if provided
- Updates whiteboard data if provided

---

## Event Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Socket.IO Server                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Interview Room (interview:{id})                 │    │
│  │                                                  │    │
│  │  - join-interview                                │    │
│  │  - leave-interview                               │    │
│  │  - peer-joined / peer-left                       │    │
│  │  - candidate-joined / candidate-left             │    │
│  │  - webrtc-offer / answer / ice-candidate         │    │
│  │  - monitoring-event                              │    │
│  │  - trust-score-updated                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Workspace Room (workspace:{id})                 │    │
│  │                                                  │    │
│  │  - workspace-join / workspace-leave              │    │
│  │  - workspace-sync                                │    │
│  │  - code-change                                   │    │
│  │  - whiteboard-change                             │    │
│  │  - workspace-save                                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
